import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type TaskBucket = "Vandaag" | "Morgen" | "Deze week" | "Binnekort" | "Gedaan"
export type TaskStatus = "To Do" | "Bezig" | "Klaar"

export type NotionTask = {
  id: string
  title: string
  status: TaskStatus | null
  priority: string | null     // "Prio 1" | "Prio 2" | "Prio 3"
  project: string | null
  type: string | null
  when: TaskBucket | null
  deadline: string | null     // ISO date
  url?: string
}

const NOTION_VERSION = "2022-06-28"

export async function getAuth(): Promise<{ token: string; tasksDbId: string | null } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_integrations")
    .select("notion_access_token, notion_tasks_db_id")
    .maybeSingle()
  if (!data?.notion_access_token) return null
  return { token: data.notion_access_token, tasksDbId: data.notion_tasks_db_id ?? null }
}

async function notionFetch(path: string, init: RequestInit, token: string) {
  return fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
  })
}

/**
 * One call: fetch ALL open tasks (Status != Klaar AND Wanneer != Gedaan).
 * Caller buckets by `when`. Spec says: avoid Promise.all over many calls (rate limit).
 * Wrapped in React `cache()` so multiple components in the same render share one fetch.
 */
export const fetchOpenTasks = cache(async (): Promise<NotionTask[]> => {
  const auth = await getAuth()
  if (!auth || !auth.tasksDbId) return []
  try {
    const res = await notionFetch(
      `/databases/${auth.tasksDbId}/query`,
      {
        method: "POST",
        body: JSON.stringify({
          filter: {
            and: [
              { property: "Status", select: { does_not_equal: "Klaar" } },
              { property: "Wanneer", select: { does_not_equal: "Gedaan" } },
            ],
          },
          sorts: [{ property: "Prioriteit", direction: "ascending" }],
          page_size: 100,
        }),
      },
      auth.token,
    )
    if (!res.ok) return []
    const json = (await res.json()) as {
      results: { id: string; url?: string; properties: Record<string, unknown> }[]
    }
    return json.results.map((p) => ({
      id: p.id,
      url: p.url,
      title: pickTitle(p.properties),
      status: (pickSelect(p.properties, "Status") as TaskStatus) ?? null,
      priority: pickSelect(p.properties, "Prioriteit") ?? null,
      project: pickSelect(p.properties, "Project") ?? null,
      type: pickSelect(p.properties, "Type") ?? null,
      when: (pickSelect(p.properties, "Wanneer") as TaskBucket) ?? null,
      deadline: pickDate(p.properties, "Deadline") ?? null,
    }))
  } catch {
    return []
  }
})

/** Fetch only completed tasks (last N days) for project-pulse footer. */
export const fetchClosedTasks = cache(async (daysBack = 30): Promise<NotionTask[]> => {
  const auth = await getAuth()
  if (!auth || !auth.tasksDbId) return []
  try {
    const res = await notionFetch(
      `/databases/${auth.tasksDbId}/query`,
      {
        method: "POST",
        body: JSON.stringify({
          filter: {
            or: [
              { property: "Status", select: { equals: "Klaar" } },
              { property: "Wanneer", select: { equals: "Gedaan" } },
            ],
          },
          page_size: 100,
        }),
      },
      auth.token,
    )
    if (!res.ok) return []
    const json = (await res.json()) as {
      results: { id: string; properties: Record<string, unknown> }[]
    }
    return json.results.map((p) => ({
      id: p.id,
      title: pickTitle(p.properties),
      status: (pickSelect(p.properties, "Status") as TaskStatus) ?? null,
      priority: pickSelect(p.properties, "Prioriteit") ?? null,
      project: pickSelect(p.properties, "Project") ?? null,
      type: pickSelect(p.properties, "Type") ?? null,
      when: (pickSelect(p.properties, "Wanneer") as TaskBucket) ?? null,
      deadline: pickDate(p.properties, "Deadline") ?? null,
    }))
  } catch {
    return []
  }
})

export type CreateTaskInput = {
  title: string
  project?: string | null
  when?: TaskBucket
  priority?: "Prio 1" | "Prio 2" | "Prio 3" | null
  deadline?: string | null
  type?: string | null
  body?: string | null
}

export async function createTask(input: CreateTaskInput): Promise<{ ok: boolean; id?: string; url?: string; error?: string }> {
  const auth = await getAuth()
  if (!auth || !auth.tasksDbId) return { ok: false, error: "Notion niet verbonden of geen DB ingesteld" }
  const properties: Record<string, unknown> = {
    Taak: { title: [{ text: { content: input.title } }] },
    Status: { select: { name: "To Do" } },
  }
  if (input.when) properties.Wanneer = { select: { name: input.when } }
  if (input.project) properties.Project = { select: { name: input.project } }
  if (input.priority) properties.Prioriteit = { select: { name: input.priority } }
  if (input.type) properties.Type = { select: { name: input.type } }
  if (input.deadline) properties.Deadline = { date: { start: input.deadline } }

  try {
    const pageBody: Record<string, unknown> = {
      parent: { database_id: auth.tasksDbId },
      properties,
    }
    if (input.body?.trim()) {
      pageBody.children = [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: input.body.trim() } }],
          },
        },
      ]
    }
    const res = await notionFetch(
      "/pages",
      { method: "POST", body: JSON.stringify(pageBody) },
      auth.token,
    )
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: body.slice(0, 200) }
    }
    const json = (await res.json()) as { id: string; url?: string }
    return { ok: true, id: json.id, url: json.url }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function updateTaskWhen(taskId: string, when: TaskBucket | null): Promise<boolean> {
  const auth = await getAuth()
  if (!auth) return false
  try {
    const props: Record<string, unknown> = {}
    if (when === null) {
      props.Wanneer = { select: null }
    } else {
      props.Wanneer = { select: { name: when } }
    }
    const res = await notionFetch(
      `/pages/${taskId}`,
      { method: "PATCH", body: JSON.stringify({ properties: props }) },
      auth.token,
    )
    return res.ok
  } catch {
    return false
  }
}

export async function markTaskDone(taskId: string): Promise<boolean> {
  const auth = await getAuth()
  if (!auth) return false
  try {
    const res = await notionFetch(
      `/pages/${taskId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          properties: {
            Status: { select: { name: "Klaar" } },
            Wanneer: { select: { name: "Gedaan" } },
          },
        }),
      },
      auth.token,
    )
    return res.ok
  } catch {
    return false
  }
}

/** Append billable hours to a client-specific Notion DB (used by Focus session sync). */
export async function appendBillableHours(input: {
  clientHoursDbId: string
  date: string
  task: string
  hours: number
  amountEur: number
  type: string
  notes?: string
}) {
  const auth = await getAuth()
  if (!auth) return false
  try {
    const res = await notionFetch(
      "/pages",
      {
        method: "POST",
        body: JSON.stringify({
          parent: { database_id: input.clientHoursDbId },
          properties: {
            Datum: { date: { start: input.date } },
            Taak: { title: [{ text: { content: input.task } }] },
            Uren: { number: input.hours },
            Bedrag: { number: input.amountEur },
            Type: { select: { name: input.type } },
            ...(input.notes
              ? { Notitie: { rich_text: [{ text: { content: input.notes } }] } }
              : {}),
          },
        }),
      },
      auth.token,
    )
    return res.ok
  } catch {
    return false
  }
}

/** Fetch page block content and return as plain text. */
export async function fetchTaskBlocks(pageId: string): Promise<string> {
  const auth = await getAuth()
  if (!auth) return ""
  try {
    const res = await notionFetch(
      `/blocks/${pageId}/children?page_size=50`,
      { method: "GET" },
      auth.token,
    )
    if (!res.ok) return ""
    const json = (await res.json()) as {
      results: { type: string; [key: string]: unknown }[]
    }
    const lines: string[] = []
    for (const block of json.results) {
      const content = block[block.type] as
        | { rich_text?: { plain_text?: string }[] }
        | undefined
      if (!content?.rich_text) continue
      const text = content.rich_text.map((t) => t.plain_text ?? "").join("")
      if (text) lines.push(text)
    }
    return lines.join("\n")
  } catch {
    return ""
  }
}

/* ---------------- helpers ---------------- */

function pickTitle(props: Record<string, unknown>): string {
  for (const v of Object.values(props)) {
    const p = v as { type?: string; title?: { plain_text?: string }[] }
    if (p?.type === "title") return p.title?.map((t) => t.plain_text ?? "").join("") ?? ""
  }
  return ""
}
function pickSelect(props: Record<string, unknown>, key: string): string | undefined {
  const v = props[key] as { select?: { name?: string } } | undefined
  return v?.select?.name
}
function pickDate(props: Record<string, unknown>, key: string): string | undefined {
  const v = props[key] as { date?: { start?: string } } | undefined
  return v?.date?.start
}

/* Back-compat aliases (used by existing focus-session sync) */
export async function fetchTodayTasks(): Promise<NotionTask[]> {
  const all = await fetchOpenTasks()
  return all.filter((t) => t.when === "Vandaag")
}
