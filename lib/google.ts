import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type CalendarEvent = {
  id: string
  summary: string
  start: string
  end: string
  allDay: boolean
  colorId?: string | null
  htmlLink?: string
}

const TZ = "Europe/Amsterdam"

export async function getGoogleAccessToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("user_integrations")
    .select("google_access_token, google_refresh_token, google_token_expires_at")
    .eq("user_id", user.id)
    .maybeSingle()
  if (!data) return null

  const expiresAt = data.google_token_expires_at ? new Date(data.google_token_expires_at) : null
  if (data.google_access_token && expiresAt && expiresAt.getTime() > Date.now() + 60_000) {
    return data.google_access_token
  }

  if (!data.google_refresh_token) return data.google_access_token

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: data.google_refresh_token,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) return data.google_access_token
  const json = (await res.json()) as { access_token: string; expires_in: number }
  const newExpiry = new Date(Date.now() + json.expires_in * 1000).toISOString()
  await supabase
    .from("user_integrations")
    .update({
      google_access_token: json.access_token,
      google_token_expires_at: newExpiry,
    })
    .eq("user_id", user.id)
  return json.access_token
}

type GCalItem = {
  id: string
  summary?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  colorId?: string
  htmlLink?: string
}

/**
 * Compute the Europe/Amsterdam-local midnight bounds for a given offset day
 * as RFC3339 timestamps. Doing this server-side with raw `new Date()` would
 * use the Vercel container's UTC clock — which means "today" on a 23:30 Ams
 * visit was already the *next* day, so today's late-evening events were
 * missing from the agenda. We instead format YYYY-MM-DD in Ams, read the
 * live Ams UTC offset (handles winter/summer DST), and stitch them together.
 */
function amsDayBoundsISO(offsetDays: number): { startISO: string; endISO: string } {
  const now = new Date()
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now)
  const offsetPart = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
  })
    .formatToParts(now)
    .find((p) => p.type === "timeZoneName")?.value
  // "GMT+01:00" or "GMT+2" → "+01:00" / "+02:00". Default to +01:00 (winter).
  const m = offsetPart?.match(/GMT([+-])(\d{1,2}):?(\d{2})?/)
  const sign = m?.[1] ?? "+"
  const hh = (m?.[2] ?? "1").padStart(2, "0")
  const mm = (m?.[3] ?? "00").padStart(2, "0")
  const tz = `${sign}${hh}:${mm}`

  const startDate = new Date(`${ymd}T00:00:00${tz}`)
  startDate.setDate(startDate.getDate() + offsetDays)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 1)
  return { startISO: startDate.toISOString(), endISO: endDate.toISOString() }
}

/** Fetch events for a specific day relative to today (offsetDays). */
export const fetchEventsForDay = cache(async (offsetDays: 0 | 1): Promise<CalendarEvent[]> => {
  const token = await getGoogleAccessToken()
  if (!token) return []
  const { startISO, endISO } = amsDayBoundsISO(offsetDays)
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
  url.searchParams.set("timeMin", startISO)
  url.searchParams.set("timeMax", endISO)
  url.searchParams.set("singleEvents", "true")
  url.searchParams.set("orderBy", "startTime")
  url.searchParams.set("maxResults", "30")
  url.searchParams.set("timeZone", TZ)
  try {
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return []
    const json = (await res.json()) as { items?: GCalItem[] }
    return (json.items ?? []).map(toEvent)
  } catch {
    return []
  }
})

function toEvent(it: GCalItem): CalendarEvent {
  return {
    id: it.id,
    summary: it.summary ?? "(zonder titel)",
    start: it.start?.dateTime ?? it.start?.date ?? "",
    end: it.end?.dateTime ?? it.end?.date ?? "",
    allDay: !!it.start?.date && !it.start.dateTime,
    colorId: it.colorId ?? null,
    htmlLink: it.htmlLink,
  }
}

/** Today + tomorrow in one shot. */
export async function fetchTodayEvents(): Promise<CalendarEvent[]> {
  return fetchEventsForDay(0)
}
export async function fetchTomorrowEvents(): Promise<CalendarEvent[]> {
  return fetchEventsForDay(1)
}

export async function createEvent(input: {
  summary: string
  startISO: string
  endISO: string
  colorId?: string
}): Promise<CalendarEvent | null> {
  const token = await getGoogleAccessToken()
  if (!token) return null
  const body = {
    summary: input.summary,
    start: { dateTime: input.startISO, timeZone: TZ },
    end: { dateTime: input.endISO, timeZone: TZ },
    ...(input.colorId ? { colorId: input.colorId } : {}),
  }
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) return null
  return toEvent((await res.json()) as GCalItem)
}

export async function updateEvent(
  eventId: string,
  input: { summary?: string; startISO?: string; endISO?: string; colorId?: string },
): Promise<CalendarEvent | null> {
  const token = await getGoogleAccessToken()
  if (!token) return null
  const body: Record<string, unknown> = {}
  if (input.summary != null) body.summary = input.summary
  if (input.startISO) body.start = { dateTime: input.startISO, timeZone: TZ }
  if (input.endISO) body.end = { dateTime: input.endISO, timeZone: TZ }
  if (input.colorId) body.colorId = input.colorId
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) return null
  return toEvent((await res.json()) as GCalItem)
}

export async function deleteEvent(eventId: string): Promise<boolean> {
  const token = await getGoogleAccessToken()
  if (!token) return false
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  return res.ok || res.status === 410
}
