/**
 * Hardcoded business / school deadlines, layered on top of Notion task deadlines
 * in the deadline pill-strip.
 */
export type HardDeadline = {
  label: string
  date: string  // YYYY-MM-DD
}

export const HARD_DEADLINES: HardDeadline[] = [
  { label: "Practice Lab — Story Festival (Marie Lokezaal 15-18u)", date: "2026-05-26" },
  { label: "Practice Lab — Final Story (Brightspace, 23:59)", date: "2026-06-02" },
  { label: "Practice Lab — Reflection on storytelling (23:59)", date: "2026-06-05" },
  { label: "Research Seminar MCI — Research Paper (17:00)", date: "2026-06-05" },
  { label: "Tuintheater Fase 0 eindigt", date: "2026-06-14" },
]

export function pillColor(dateISO: string): "bad" | "warn" | "default" {
  const target = new Date(dateISO + "T00:00:00")
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const days = Math.floor((target.getTime() - now.getTime()) / 86_400_000)
  if (days < 7) return "bad"
  if (days < 30) return "warn"
  return "default"
}

export function daysUntil(dateISO: string): number {
  const target = new Date(dateISO + "T00:00:00")
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - now.getTime()) / 86_400_000)
}
