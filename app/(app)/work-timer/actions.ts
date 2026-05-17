"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createWorkEntry, deleteWorkEntry, type WorkType } from "@/lib/work-tracker"

export async function startWorkSession(input: {
  clientName: string
  isBillable: boolean
  task: string
}) {
  const supabase = await createClient()
  // delete any orphan row first (defensive — should be 0 due to UNIQUE index)
  await supabase.from("work_sessions").delete().is("ended_at", null)
  const { error } = await supabase.from("work_sessions").insert({
    started_at: new Date().toISOString(),
    client_name: input.clientName,
    is_billable: input.isBillable,
    task_description: input.task || null,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/work-timer")
  return { ok: true }
}

export async function stopWorkSession() {
  const supabase = await createClient()
  const { data: active } = await supabase
    .from("work_sessions")
    .select("*")
    .is("ended_at", null)
    .maybeSingle()
  if (!active) return { ok: false, error: "Geen actieve sessie" }

  const ended = new Date()
  const start = new Date(active.started_at)
  const minutes = Math.max(1, Math.round((ended.getTime() - start.getTime()) / 60_000))
  const hours = Math.round((minutes / 60) * 100) / 100

  let notionPageId: string | null = null
  let synced = false

  if (active.is_billable) {
    // Look up the client's notion_client_name + rate at stop time
    const { data: client } = await supabase
      .from("clients")
      .select("notion_client_name, hourly_rate_eur")
      .eq("name", active.client_name)
      .maybeSingle()
    if (client?.notion_client_name) {
      const r = await createWorkEntry({
        name: active.task_description ?? `${active.client_name} — werk`,
        client: client.notion_client_name,
        type: "Uren",
        hours,
        day: ended.toISOString().split("T")[0],
        notes: null,
        hourlyRate: client.hourly_rate_eur ? Number(client.hourly_rate_eur) : null,
      })
      if (r.ok) {
        notionPageId = r.id ?? null
        synced = true
      }
    }
  }

  await supabase
    .from("work_sessions")
    .update({
      ended_at: ended.toISOString(),
      duration_minutes: minutes,
      notion_page_id: notionPageId,
      notion_synced: synced,
    })
    .eq("id", active.id)
  revalidatePath("/work-timer")
  revalidatePath("/focus")
  return { ok: true, minutes, synced }
}

export async function deleteWorkSession(id: string) {
  const supabase = await createClient()
  await supabase.from("work_sessions").delete().eq("id", id)
  revalidatePath("/work-timer")
  return { ok: true }
}

/* -------------------- Client CRUD -------------------- */

export async function createClientRow(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return { ok: false, error: "Naam verplicht" }
  const rate = Number(formData.get("hourly_rate_eur") ?? 0)
  const notionName = (formData.get("notion_client_name") as string)?.trim() || null
  const supabase = await createClient()
  const { error } = await supabase.from("clients").insert({
    name,
    hourly_rate_eur: rate,
    notion_client_name: notionName,
    is_active: true,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/work-timer")
  return { ok: true }
}

export async function updateClientRow(
  id: string,
  formData: FormData,
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("clients")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      hourly_rate_eur: Number(formData.get("hourly_rate_eur") ?? 0),
      notion_client_name: (formData.get("notion_client_name") as string)?.trim() || null,
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/work-timer")
  return { ok: true }
}

export async function deleteClientRow(id: string) {
  const supabase = await createClient()
  await supabase.from("clients").delete().eq("id", id)
  revalidatePath("/work-timer")
  return { ok: true }
}

/* -------------------- Work Tracker (Notion) actions -------------------- */

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
  revalidatePath("/work-timer")
  return r
}

export async function removeWorkEntry(pageId: string) {
  const ok = await deleteWorkEntry(pageId)
  revalidatePath("/work-timer")
  return { ok }
}

/* -------------------- Notion sync retry -------------------- */

export async function retryNotionSync(sessionId: string) {
  const supabase = await createClient()
  const { data: session } = await supabase
    .from("work_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle()
  if (!session?.is_billable || !session.ended_at) {
    return { ok: false, error: "Sessie niet billable of niet afgerond" }
  }
  const { data: client } = await supabase
    .from("clients")
    .select("notion_client_name, hourly_rate_eur")
    .eq("name", session.client_name)
    .maybeSingle()
  if (!client?.notion_client_name) {
    return { ok: false, error: "Klant heeft geen Notion-mapping" }
  }
  const hours = Math.round(((session.duration_minutes ?? 0) / 60) * 100) / 100
  const day = new Date(session.ended_at).toISOString().split("T")[0]
  const r = await createWorkEntry({
    name: session.task_description ?? `${session.client_name} — werk`,
    client: client.notion_client_name,
    type: "Uren",
    hours,
    day,
    notes: null,
    hourlyRate: client.hourly_rate_eur ? Number(client.hourly_rate_eur) : null,
  })
  if (!r.ok) return { ok: false, error: r.error ?? "Notion API fout" }
  await supabase
    .from("work_sessions")
    .update({ notion_synced: true, notion_page_id: r.id ?? null })
    .eq("id", sessionId)
  revalidatePath("/work-timer")
  return { ok: true }
}
