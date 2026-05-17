import "server-only"
import { createClient } from "@/lib/supabase/server"

const NOTION_VERSION = "2022-06-28"

export type WorkType = "Meeting" | "Uren"

export type WorkEntry = {
  id: string
  name: string
  client: string | null
  type: WorkType | null
  hours: number | null
  hourlyRate: number | null
  earnings: number | null
  notes: string | null
  day: string | null  // ISO date
  url?: string
}

async function getAuth(): Promise<{ token: string; dbId: string | null } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_integrations")
    .select("notion_access_token, notion_work_tracker_db_id")
    .maybeSingle()
  if (!data?.notion_access_token) return null
  return { token: data.notion_access_token, dbId: data.notion_work_tracker_db_id ?? null }
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

export async function fetchRecentWorkEntries(daysBack = 60, limit = 25): Promise<WorkEntry[]> {
  const auth = await getAuth()
  if (!auth || !auth.dbId) return []
  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  const sinceISO = since.toISOString().split("T")[0]
  try {
    const res = await notionFetch(
      `/databases/${auth.dbId}/query`,
      {
        method: "POST",
        body: JSON.stringify({
          filter: { property: "Day", date: { on_or_after: sinceISO } },
          sorts: [{ property: "Day", direction: "descending" }],
          page_size: limit,
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
      name: pickTitle(p.properties),
      client: pickSelect(p.properties, "Client") ?? null,
      type: (pickSelect(p.properties, "Select") as WorkType) ?? null,
      hours: pickNumber(p.properties, "Hours") ?? null,
      hourlyRate: pickNumber(p.properties, "Hourly rate ($)") ?? null,
      earnings: pickFormulaNumber(p.properties, "Earnings") ?? null,
      notes: pickRichText(p.properties, "Notes") ?? null,
      day: pickDate(p.properties, "Day") ?? null,
    }))
  } catch {
    return []
  }
}

export type CreateWorkEntryInput = {
  name: string
  client: string
  type?: WorkType
  hours: number
  day: string  // YYYY-MM-DD
  notes?: string | null
  hourlyRate?: number | null
}

export async function createWorkEntry(
  input: CreateWorkEntryInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const auth = await getAuth()
  if (!auth || !auth.dbId) return { ok: false, error: "Work Tracker DB niet ingesteld" }
  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: input.name } }] },
    Day: { date: { start: input.day } },
    Hours: { number: input.hours },
    Client: { select: { name: input.client } },
    Select: { select: { name: input.type ?? "Uren" } },
  }
  if (input.notes) properties.Notes = { rich_text: [{ text: { content: input.notes } }] }
  if (input.hourlyRate != null) properties["Hourly rate ($)"] = { number: input.hourlyRate }
  try {
    const res = await notionFetch(
      "/pages",
      {
        method: "POST",
        body: JSON.stringify({ parent: { database_id: auth.dbId }, properties }),
      },
      auth.token,
    )
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: body.slice(0, 200) }
    }
    const json = (await res.json()) as { id: string }
    return { ok: true, id: json.id }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function deleteWorkEntry(pageId: string): Promise<boolean> {
  const auth = await getAuth()
  if (!auth) return false
  try {
    // Notion soft-deletes via archived flag
    const res = await notionFetch(
      `/pages/${pageId}`,
      { method: "PATCH", body: JSON.stringify({ archived: true }) },
      auth.token,
    )
    return res.ok
  } catch {
    return false
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
function pickNumber(props: Record<string, unknown>, key: string): number | undefined {
  const v = props[key] as { number?: number } | undefined
  return typeof v?.number === "number" ? v.number : undefined
}
function pickRichText(props: Record<string, unknown>, key: string): string | undefined {
  const v = props[key] as { rich_text?: { plain_text?: string }[] } | undefined
  if (!v?.rich_text) return undefined
  return v.rich_text.map((t) => t.plain_text ?? "").join("")
}
function pickFormulaNumber(props: Record<string, unknown>, key: string): number | undefined {
  const v = props[key] as { formula?: { type?: string; number?: number } } | undefined
  if (v?.formula?.type !== "number") return undefined
  return typeof v.formula.number === "number" ? v.formula.number : undefined
}
