"use client"
import { useEffect } from "react"

export type ThemeMode = "light" | "dark" | "system" | "auto-time"

const STORAGE_KEYS = {
  mode: "theme.mode",
  darkStart: "theme.darkStart",
  darkEnd: "theme.darkEnd",
}

/**
 * ThemeController applies html.dark based on the user's theme preference.
 * Modes:
 *   light      — never dark
 *   dark       — always dark
 *   system     — follow prefers-color-scheme
 *   auto-time  — dark between darkStart..darkEnd in Europe/Amsterdam local time
 *
 * Persists the values to localStorage so the inline init script in
 * app/layout.tsx can avoid a flash on the next reload.
 *
 * Note: this is a no-op client component — it renders nothing. Mount it
 * once at the layout level.
 */
export function ThemeController({
  mode,
  darkStartHour,
  darkEndHour,
}: {
  mode: ThemeMode
  darkStartHour: number
  darkEndHour: number
}) {
  useEffect(() => {
    // Persist for the inline init script
    try {
      localStorage.setItem(STORAGE_KEYS.mode, mode)
      localStorage.setItem(STORAGE_KEYS.darkStart, String(darkStartHour))
      localStorage.setItem(STORAGE_KEYS.darkEnd, String(darkEndHour))
    } catch {}

    function amsHour(): number {
      return Number(
        new Date().toLocaleString("en-GB", {
          timeZone: "Europe/Amsterdam",
          hour: "2-digit",
          hour12: false,
        }),
      )
    }

    function shouldBeDarkAtHour(h: number): boolean {
      // Window wraps midnight when start > end (e.g. 21..6 → 21,22,23,0,1..5).
      if (darkStartHour === darkEndHour) return false
      if (darkStartHour < darkEndHour) {
        return h >= darkStartHour && h < darkEndHour
      }
      return h >= darkStartHour || h < darkEndHour
    }

    function apply() {
      const html = document.documentElement
      let dark = false
      if (mode === "dark") dark = true
      else if (mode === "light") dark = false
      else if (mode === "system") {
        dark = window.matchMedia("(prefers-color-scheme: dark)").matches
      } else {
        dark = shouldBeDarkAtHour(amsHour())
      }
      html.classList.toggle("dark", dark)
    }

    apply()

    // Keep auto-time honest — re-evaluate when the hour changes. We compute
    // ms-until-next-hour rather than polling every minute.
    let timer: number | undefined
    function scheduleNext() {
      if (mode !== "auto-time") return
      const now = new Date()
      const next = new Date(now)
      next.setMinutes(0, 0, 0)
      next.setHours(next.getHours() + 1)
      const ms = next.getTime() - now.getTime() + 500
      timer = window.setTimeout(() => {
        apply()
        scheduleNext()
      }, ms)
    }
    scheduleNext()

    // For "system", listen to scheme changes
    let mq: MediaQueryList | null = null
    let mqHandler: ((e: MediaQueryListEvent) => void) | null = null
    if (mode === "system" && typeof window.matchMedia === "function") {
      mq = window.matchMedia("(prefers-color-scheme: dark)")
      mqHandler = () => apply()
      mq.addEventListener("change", mqHandler)
    }

    return () => {
      if (timer) window.clearTimeout(timer)
      if (mq && mqHandler) mq.removeEventListener("change", mqHandler)
    }
  }, [mode, darkStartHour, darkEndHour])

  return null
}
