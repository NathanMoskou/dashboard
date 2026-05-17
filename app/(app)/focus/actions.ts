"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { appendBillableHours, markTaskDone, createTask, updateTaskWhen, fetchTaskBlocks } from "@/lib/notion"
import { createWorkEntry, deleteWorkEntry, type WorkType } from "@/lib/work-tracker"
import {
  createEvent,
  deleteEvent,
  fetchEventsForDay,
  updateEvent,
} from "@/lib/google"
import { atTime, isOverlap, findGap, inferDurationMin } from "@/lib/morning/routines"
import { loadRoutineForUser } from "@/lib/morning/routine-data"
import { uiToWanneer, inferProject } from "@/lib/morning/inferences"

/* -------------------- Focus session actions (legacy, kept) -------------------- */

export async function startFocus(input: {
  type: "deep_work" | "shallow" | "meeting"
  isBillable: boolean
  clientId: string | null
  task: string
  notionTaskId: string | null
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("focus_sessions")
    .insert({
      started_at: new Date().toISOString(),
      type: input.type,
      is_billable: input.isBillable,
      client_id: input.clientId,
      task_description: input.task,
      notion_task_id: input.notionTaskId,
    })
    .select("id")
    .single()
  if (error || !data) throw new Error(error?.message ?? "Kon sessie niet starten")
  redirect(`/focus/active?id=${data.id}`)
}

export async function stopFocus(input: {
  sessionId: string
  notes: string | null
  taskDone: boolean
}) {
  const supabase = await createClient()
  const { data: session } = await supabase
    .from("focus_sessions")
    .select("*, clients(name, hourly_rate_eur, notion_hours_db_id)")
    .eq("id", input.sessionId)
    .single()
  if (!session) return

  const ended = new Date()
  const start = new Date(session.started_at)
  const minutes = Math.max(1, Math.round((ended.getTime() - start.getTime()) / 60000))

  await supabase
    .from("focus_sessions")
    .update({
      ended_at: ended.toISOString(),
      duration_minutes: minutes,
      notes: input.notes,
    })
    .eq("id", input.sessionId)

  let synced = false
  const c = (session as unknown as {
    clients?: { name: string; hourly_rate_eur: number; notion_hours_db_id: string | null } | null
  }).clients
  if (session.is_billable && c?.notion_hours_db_id) {
    const hours = minutes / 60
    synced = await appendBillableHours({
      clientHoursDbId: c.notion_hours_db_id,
      date: ended.toISOString().split("T")[0],
      task: session.task_description ?? "",
      hours: Math.round(hours * 100) / 100,
      amountEur: Math.round(hours * Number(c.hourly_rate_eur) * 100) / 100,
      type: session.type ?? "deep_work",
      notes: input.notes ?? undefined,
    })
    await supabase
      .from("focus_sessions")
      .update({ notion_synced: synced })
      .eq("id", input.sessionId)
  }

  if (input.taskDone && session.notion_task_id) {
    await markTaskDone(session.notion_task_id)
  }

  revalidatePath("/focus")
  revalidatePath("/today")
  redirect("/focus/sessions")
}

export async function addClient(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  const supabase = await createClient()
  await supabase.from("clients").insert({
    name,
    hourly_rate_eur: Number(formData.get("hourly_rate_eur") ?? 0),
    notion_hours_db_id: (formData.get("notion_hours_db_id") as string) || null,
  })
  revalidatePath("/focus/clients")
}

export async function updateClient(id: string, formData: FormData) {
  const supabase = await createClient()
  await supabase
    .from("clients")
    .update({
      hourly_rate_eur: Number(formData.get("hourly_rate_eur") ?? 0),
      notion_hours_db_id: (formData.get("notion_hours_db_id") as string) || null,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id)
  revalidatePath("/focus/clients")
}

/* -------------------- Morning Dashboard actions -------------------- */

export async function quickCapture(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim()
  if (!title) return { ok: false, error: "Titel verplicht" }
  const project = (formData.get("project") as string) || null
  const wanneerUi = String(formData.get("wanneer") ?? "Binnenkort")
  const priority = (formData.get("priority") as string) || null
  const deadline = (formData.get("deadline") as string) || null

  const r = await createTask({
    title,
    project,
    when: uiToWanneer(wanneerUi),
    priority: (priority as "Prio 1" | "Prio 2" | "Prio 3") || null,
    deadline: deadline || null,
  })
  revalidatePath("/focus")
  return r
}

export async function fetchTaskBody(taskId: string): Promise<string> {
  return fetchTaskBlocks(taskId)
}

export async function moveTask(taskId: string, target: string) {
  await updateTaskWhen(taskId, uiToWanneer(target))
  revalidatePath("/focus")
}

export async function completeTask(taskId: string) {
  await markTaskDone(taskId)
  revalidatePath("/focus")
}

export async function planRoutine(input: { offsetDays: 0 | 1; skipIds: string[] }) {
  const baseDay = new Date()
  baseDay.setHours(0, 0, 0, 0)
  baseDay.setDate(baseDay.getDate() + input.offsetDays)

  // Per-user blocks (auto-seeded from DEFAULT_ROUTINE on first access)
  const blocks = await loadRoutineForUser()
  const events = await fetchEventsForDay(input.offsetDays)
  const dismissed = new Set(input.skipIds)
  const created: { id: string; title: string }[] = []

  for (const block of blocks) {
    if (dismissed.has(block.id)) continue
    const start = atTime(baseDay, block.startH, block.startM)
    const end = atTime(baseDay, block.endH, block.endM)
    const conflict = events.some((e) => isOverlap(e, start, end))
    if (conflict) continue
    const ev = await createEvent({
      summary: block.title,
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      colorId: block.colorId,
    })
    if (ev) created.push({ id: ev.id, title: ev.summary })
  }
  revalidatePath("/focus")
  return { created }
}

export async function autoScheduleTask(input: {
  taskId: string
  title: string
  offsetDays: 0 | 1
}) {
  const baseDay = new Date()
  baseDay.setHours(0, 0, 0, 0)
  baseDay.setDate(baseDay.getDate() + input.offsetDays)

  const events = await fetchEventsForDay(input.offsetDays)
  const occupied = events
    .filter((e) => !e.allDay)
    .map((e) => ({ start: new Date(e.start), end: new Date(e.end) }))

  const duration = inferDurationMin(input.title)
  const slot = findGap(occupied, duration, baseDay)
  if (!slot) return { ok: false, error: "Geen vrije tijd vandaag tussen 09:00–17:00" }
  const end = new Date(slot.getTime() + duration * 60_000)
  const ev = await createEvent({
    summary: input.title,
    startISO: slot.toISOString(),
    endISO: end.toISOString(),
    colorId: "8", // graphite for auto-scheduled
  })
  revalidatePath("/focus")
  return ev ? { ok: true, eventId: ev.id, start: slot.toISOString() } : { ok: false }
}

export async function patchEvent(input: {
  eventId: string
  summary?: string
  startISO?: string
  endISO?: string
}) {
  const ev = await updateEvent(input.eventId, input)
  revalidatePath("/focus")
  return ev ? { ok: true } : { ok: false }
}

export async function dropEvent(eventId: string) {
  const ok = await deleteEvent(eventId)
  revalidatePath("/focus")
  return { ok }
}

export async function addManualEvent(input: {
  summary: string
  date: string
  startTime: string
  endTime: string
}) {
  // Append the Amsterdam offset so the datetime is interpreted as local time,
  // not UTC. `new Date("2025-05-12T07:00:00")` on a UTC server = 07:00 UTC = 09:00 AMS.
  // Sending "2025-05-12T07:00:00" without Z to Google (with timeZone=Europe/Amsterdam
  // in the request body) makes Google interpret it as Amsterdam local time.
  const startISO = `${input.date}T${input.startTime}:00`
  const endISO = `${input.date}T${input.endTime}:00`
  const ev = await createEvent({
    summary: input.summary,
    startISO,
    endISO,
    colorId: "9",
  })
  revalidatePath("/focus")
  return ev ? { ok: true } : { ok: false }
}

/* -------------------- Inbox triage actions (Gmail + Gemini) -------------------- */

type EmailState = {
  triaged: Record<string, number> // threadId -> ISO timestamp ms
  snoozed: Record<string, number> // threadId -> wake-up timestamp ms
}

async function loadEmailState(): Promise<EmailState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { triaged: {}, snoozed: {} }
  const { data } = await supabase
    .from("user_integrations")
    .select("email_state")
    .eq("user_id", user.id)
    .maybeSingle()
  const s = (data?.email_state as EmailState | null) ?? null
  return s ?? { triaged: {}, snoozed: {} }
}

async function saveEmailState(state: EmailState) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from("user_integrations")
    .upsert({ user_id: user.id, email_state: state }, { onConflict: "user_id" })
}

export async function taskFromEmail(input: {
  threadId: string
  subject: string
  bucket: string
  project?: string | null
  priority?: "Prio 1" | "Prio 2" | "Prio 3" | null
  body?: string | null
}) {
  const r = await createTask({
    title: input.subject,
    when: uiToWanneer(input.bucket),
    project: input.project ?? inferProject(input.subject),
    priority: input.priority ?? null,
    body: input.body ?? null,
  })
  if (r.ok) {
    const s = await loadEmailState()
    s.triaged[input.threadId] = Date.now()
    await saveEmailState(s)

    if (input.bucket === "Vandaag") {
      await autoScheduleTask({ taskId: r.id ?? "", title: input.subject, offsetDays: 0 })
    }
  }
  return r
}

export async function snoozeEmail(threadId: string) {
  const s = await loadEmailState()
  const wake = new Date()
  wake.setDate(wake.getDate() + 1)
  wake.setHours(6, 0, 0, 0)
  s.snoozed[threadId] = wake.getTime()
  await saveEmailState(s)
  revalidatePath("/focus")
}

export async function skipEmail(threadId: string) {
  const s = await loadEmailState()
  s.triaged[threadId] = Date.now()
  await saveEmailState(s)
  revalidatePath("/focus")
}

export async function skipEmails(threadIds: string[]) {
  if (!threadIds.length) return
  const s = await loadEmailState()
  const now = Date.now()
  for (const id of threadIds) s.triaged[id] = now
  await saveEmailState(s)
  revalidatePath("/focus")
}

/* -------------------- Work Tracker actions -------------------- */

export async function addWorkEntry(input: {
  name: string
  client: string
  type?: WorkType
  hours: number
  day: string
  notes?: string | null
  hourlyRate?: number | null
}) {
  const r = await createWorkEntry(input)
  revalidatePath("/focus")
  return r
}

export async function removeWorkEntry(pageId: string) {
  const ok = await deleteWorkEntry(pageId)
  revalidatePath("/focus")
  return { ok }
}
