"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ArrowDown } from "lucide-react"

/**
 * Mobile pull-to-refresh. Attaches to the existing [data-scroll-main]
 * container (same one the bottom-pill scroll listener uses). When the
 * user drags down at scroll-top, shows a spinner and calls router.refresh.
 *
 * Desktop is a no-op — the component just returns null wrapper there.
 */
const TRIGGER_PX = 70
const MAX_PULL = 110

export function PullToRefresh() {
  const router = useRouter()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const armedAtTop = useRef(false)

  useEffect(() => {
    const container = document.querySelector<HTMLElement>("[data-scroll-main]")
    if (!container) return
    // Skip on desktop (no native iOS bounce; PTR is a mobile pattern)
    if (window.matchMedia("(min-width: 768px)").matches) return

    function onTouchStart(e: TouchEvent) {
      if (!container) return
      if (refreshing) return
      armedAtTop.current = container.scrollTop <= 1
      startY.current = e.touches[0].clientY
    }

    function onTouchMove(e: TouchEvent) {
      if (!container) return
      if (refreshing || startY.current == null || !armedAtTop.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        setPull(0)
        return
      }
      // Apply rubber-band: half the delta, capped
      const eased = Math.min(MAX_PULL, dy * 0.55)
      setPull(eased)
      // Block native overscroll once we're showing our indicator
      if (eased > 4) e.preventDefault()
    }

    function onTouchEnd() {
      startY.current = null
      if (pull >= TRIGGER_PX && !refreshing) {
        setRefreshing(true)
        setPull(TRIGGER_PX)
        router.refresh()
        // Let the refresh settle, then collapse
        setTimeout(() => {
          setRefreshing(false)
          setPull(0)
        }, 700)
      } else {
        setPull(0)
      }
    }

    container.addEventListener("touchstart", onTouchStart, { passive: true })
    container.addEventListener("touchmove", onTouchMove, { passive: false })
    container.addEventListener("touchend", onTouchEnd, { passive: true })
    container.addEventListener("touchcancel", onTouchEnd, { passive: true })
    return () => {
      container.removeEventListener("touchstart", onTouchStart)
      container.removeEventListener("touchmove", onTouchMove)
      container.removeEventListener("touchend", onTouchEnd)
      container.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [pull, refreshing, router])

  if (pull <= 0 && !refreshing) return null

  const progress = Math.min(1, pull / TRIGGER_PX)
  const armed = pull >= TRIGGER_PX

  return (
    <div
      className="md:hidden fixed inset-x-0 top-0 z-30 flex items-end justify-center pointer-events-none"
      style={{
        height: pull,
        transition: refreshing ? "height 0.25s ease-out" : undefined,
      }}
      aria-hidden="true"
    >
      <div
        className="flex items-center gap-2 rounded-full bg-card shadow-[var(--shadow-pill)] border border-border/70 px-3.5 py-1.5 mb-2 text-xs font-medium"
        style={{ opacity: progress }}
      >
        {refreshing ? (
          <>
            <Loader2 size={13} className="animate-spin text-primary" />
            <span className="text-muted-fg">Vernieuwen…</span>
          </>
        ) : armed ? (
          <>
            <ArrowDown size={13} className="text-primary rotate-180 transition-transform" />
            <span>Loslaten om te vernieuwen</span>
          </>
        ) : (
          <>
            <ArrowDown size={13} className="text-muted-fg transition-transform" style={{ transform: `rotate(${progress * 180}deg)` }} />
            <span className="text-muted-fg">Trek omlaag</span>
          </>
        )}
      </div>
    </div>
  )
}
