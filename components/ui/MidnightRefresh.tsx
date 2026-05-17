"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Schedules a router.refresh() at the next Amsterdam-local midnight so the
 * Today page automatically flips its "Vandaag" agenda, greeting, habit
 * window, etc. when the day rolls over — without the user touching anything.
 *
 * router.refresh() re-runs the server component in place (keeps scroll
 * position and any client-side state) and bypasses the page's revalidate
 * cache for this re-render, so fresh Google Calendar + habit data lands.
 *
 * After firing it reschedules for the next midnight. If the tab is
 * suspended overnight (mobile background tab, lid closed laptop), the
 * setTimeout will fire when the page becomes visible again — so we also
 * trigger a refresh on visibilitychange if we've crossed midnight while
 * away.
 */
export function MidnightRefresh() {
  const router = useRouter()

  useEffect(() => {
    function amsDateString(d = new Date()): string {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(d)
    }

    function msUntilNextAmsMidnight(): number {
      // Read current Ams local time
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Amsterdam",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(new Date())
      const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
      const h = get("hour")
      const m = get("minute")
      const s = get("second")
      const remainingSec = (23 - h) * 3600 + (59 - m) * 60 + (60 - s)
      // +1s buffer so we're firmly past midnight when we fire
      return (remainingSec + 1) * 1000
    }

    let lastSeenDay = amsDateString()
    let timer: number | undefined

    function scheduleNext() {
      timer = window.setTimeout(() => {
        lastSeenDay = amsDateString()
        router.refresh()
        scheduleNext()
      }, msUntilNextAmsMidnight())
    }

    function onVisible() {
      if (document.visibilityState !== "visible") return
      const today = amsDateString()
      if (today !== lastSeenDay) {
        lastSeenDay = today
        router.refresh()
        // Reschedule so the next midnight isn't computed from a stale timer
        if (timer) window.clearTimeout(timer)
        scheduleNext()
      }
    }

    scheduleNext()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      if (timer) window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [router])

  return null
}
