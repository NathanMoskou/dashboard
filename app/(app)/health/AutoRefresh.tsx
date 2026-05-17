"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Auto-refresh /health every N ms while the tab is visible. */
export function AutoRefresh({ intervalMs = 10 * 60 * 1000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (id != null) return
      id = setInterval(() => {
        if (!document.hidden) router.refresh()
      }, intervalMs)
    }
    const stop = () => {
      if (id != null) {
        clearInterval(id)
        id = null
      }
    }
    if (!document.hidden) start()
    const onVis = () => {
      if (document.hidden) stop()
      else {
        router.refresh()
        start()
      }
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [router, intervalMs])
  return null
}
