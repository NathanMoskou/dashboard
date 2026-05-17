import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, locale = "nl-NL"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

// Amsterdam-local YYYY-MM-DD. Server runs in UTC on Vercel, but every user-
// facing date in Life OS is "the user's day in NL" — so we always anchor to
// Europe/Amsterdam regardless of the server's clock.
export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" })
}

/** Hour 0–23 in Europe/Amsterdam. Used by greetings + time-of-day priority. */
export function amsHour(date = new Date()): number {
  return Number(
    date.toLocaleString("en-GB", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      hour12: false,
    }),
  )
}

/**
 * Dutch greeting based on Amsterdam-local hour.
 *   06–11  Goedemorgen
 *   12–17  Goedemiddag
 *   18–22  Goedenavond
 *   23–05  Goedenacht
 */
export function dutchGreeting(date = new Date()): string {
  const h = amsHour(date)
  if (h >= 23 || h < 6) return "Goedenacht"
  if (h < 12) return "Goedemorgen"
  if (h < 18) return "Goedemiddag"
  return "Goedenavond"
}

export function minutesToHM(min: number | null | undefined): string {
  if (!min || min < 0) return "—"
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}u${m.toString().padStart(2, "0")}`
}

export function secondsToMS(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function formatEUR(n: number | null | undefined): string {
  if (n == null) return "—"
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n)
}

export function startOfWeek(date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // make Monday the start
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}
