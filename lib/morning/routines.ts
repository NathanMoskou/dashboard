export type RoutineBlock = {
  id: string
  title: string
  startH: number
  startM: number
  endH: number
  endM: number
  colorId: string  // Google Calendar colorId
}

/**
 * Default morning routine blocks (per user spec).
 * Color palette (Google Calendar standard 1-11):
 *   2  Sage     — wandeling, lunch
 *   5  Banana   — lezen
 *   8  Graphite — auto-ingeplande taken
 *   9  Blueberry — deep work, manual events
 *   11 Tomato   — gym
 */
export const DEFAULT_ROUTINE: RoutineBlock[] = [
  { id: "wandeling", title: "🚶 Wandeling + water", startH: 7, startM: 0, endH: 7, endM: 30, colorId: "2" },
  { id: "lezen", title: "📚 Lezen + ontbijt", startH: 7, startM: 30, endH: 8, endM: 30, colorId: "5" },
  { id: "deepwork", title: "💼 Deep work", startH: 8, startM: 30, endH: 10, endM: 30, colorId: "9" },
  { id: "gym", title: "🏋️ Gym", startH: 10, startM: 30, endH: 12, endM: 0, colorId: "11" },
  { id: "lunch", title: "🥗 Lunch + herstel", startH: 12, startM: 0, endH: 13, endM: 0, colorId: "2" },
]

/**
 * Produce a Date whose UTC value equals H:M on the given day in Europe/Amsterdam.
 *
 * The old `setHours(h, m, 0, 0)` set UTC hours on Vercel's UTC server, so
 * "07:00 Amsterdam" became 07:00 UTC = 09:00 Amsterdam — 2 hours off.
 *
 * This version does a DST-aware round-trip:
 *   1. Build a naive UTC timestamp from the Amsterdam calendar date + desired H:M.
 *   2. Ask Intl what hour Amsterdam shows for that naive UTC.
 *   3. Shift by the difference so the final UTC timestamp equals H:M Amsterdam.
 *
 * Examples (summer, UTC+2):
 *   atTime(…, 7, 0)  → …T05:00:00Z  (= 07:00 AMS) ✓
 *   atTime(…, 12, 0) → …T10:00:00Z  (= 12:00 AMS) ✓
 */
export function atTime(date: Date, h: number, m: number): Date {
  // Step 1: Get the Amsterdam calendar date (YYYY-MM-DD) for the given instant.
  const amsDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date) // e.g. "2025-05-12"

  // Step 2: Build a naive UTC timestamp using that calendar date + desired H:M.
  const hh = String(h).padStart(2, "0")
  const mm = String(m).padStart(2, "0")
  const naive = new Date(`${amsDate}T${hh}:${mm}:00Z`)

  // Step 3: What hour does Amsterdam show for this naive UTC timestamp?
  const naiveAmsH = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Amsterdam",
      hour: "numeric",
      hour12: false,
    }).format(naive),
    10,
  )

  // Step 4: Shift so the UTC value lands on H:M Amsterdam.
  // e.g. naive=07:00Z → Amsterdam shows 09:00 (UTC+2) → shift back 2h → 05:00Z
  return new Date(naive.getTime() - (naiveAmsH - h) * 3_600_000)
}

export function isOverlap(
  ev: { start: string; end: string; allDay: boolean },
  start: Date,
  end: Date,
): boolean {
  if (ev.allDay) return false
  const evStart = new Date(ev.start).getTime()
  const evEnd = new Date(ev.end).getTime()
  return evStart < end.getTime() && evEnd > start.getTime()
}

/** Round up a Date to the next quarter-hour. */
export function roundToNextQuarter(d: Date): Date {
  const out = new Date(d)
  const m = out.getMinutes()
  const add = (15 - (m % 15)) % 15
  if (add === 0 && (out.getSeconds() > 0 || out.getMilliseconds() > 0)) {
    out.setMinutes(m + 15)
  } else {
    out.setMinutes(m + add)
  }
  out.setSeconds(0, 0)
  return out
}

/**
 * findGap — first free slot in [09:00, 17:00] on a target day, given occupied slots.
 * Spec: round to next 15-min, respect existing events, return null if no fit.
 */
export function findGap(
  occupied: { start: Date; end: Date }[],
  durationMin: number,
  baseDay: Date,
): Date | null {
  const dayStart = atTime(baseDay, 9, 0)
  const dayEnd = atTime(baseDay, 17, 0)
  let cursor = new Date(Math.max(Date.now(), dayStart.getTime()))
  cursor = roundToNextQuarter(cursor)
  if (cursor.getTime() > dayEnd.getTime()) return null

  const sorted = [...occupied].sort((a, b) => a.start.getTime() - b.start.getTime())
  for (const slot of sorted) {
    if (slot.end.getTime() <= cursor.getTime()) continue
    if (
      slot.start.getTime() > cursor.getTime() &&
      slot.start.getTime() - cursor.getTime() >= durationMin * 60_000
    ) {
      return cursor
    }
    if (slot.end.getTime() > cursor.getTime()) cursor = new Date(slot.end)
    cursor = roundToNextQuarter(cursor)
  }
  if (dayEnd.getTime() - cursor.getTime() >= durationMin * 60_000) return cursor
  return null
}

/** Infer task duration from title keywords. */
export function inferDurationMin(title: string): number {
  const t = title.toLowerCase()
  if (/\b(meeting|bel|call|gesprek)\b/.test(t)) return 60
  if (/\b(schrijf|draft|maak|bouw|create)\b/.test(t)) return 30
  return 15
}
