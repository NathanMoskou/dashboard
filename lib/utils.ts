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

export function todayISO(): string {
  return new Date().toISOString().split("T")[0]
}

export function dutchGreeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 6) return "Goedenacht"
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
