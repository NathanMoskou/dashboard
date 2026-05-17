"use client"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Small hover/tap tooltip.
 *
 * Desktop: hover-to-show (no delay; tracks mouseenter/mouseleave).
 * Touch devices: tap-to-toggle. Subsequent tap outside closes it.
 *
 * Renders absolutely positioned above the trigger by default
 * (`side="top"`). Pass any ReactNode as `content` — works for plain
 * strings or richer multi-line cards.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
  triggerClassName,
}: {
  content: ReactNode
  children: ReactNode
  side?: "top" | "bottom"
  className?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const isTouchRef = useRef(false)

  // On touch devices, close on outside tap.
  useEffect(() => {
    if (!open || !isTouchRef.current) return
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("touchstart", onDocClick, { passive: true })
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("touchstart", onDocClick)
    }
  }, [open])

  // Escape closes
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <span
      ref={ref}
      className={cn("relative inline-flex", triggerClassName)}
      onMouseEnter={() => {
        if (!isTouchRef.current) setOpen(true)
      }}
      onMouseLeave={() => {
        if (!isTouchRef.current) setOpen(false)
      }}
      onTouchStart={() => {
        isTouchRef.current = true
      }}
      onClick={(e) => {
        if (isTouchRef.current) {
          e.stopPropagation()
          setOpen((v) => !v)
        }
      }}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          className={cn(
            "absolute z-50 left-1/2 -translate-x-1/2 w-max max-w-[260px] rounded-xl border border-border bg-card text-card-fg p-3 shadow-[var(--shadow-card-hover)] text-xs text-left leading-relaxed pop-in pointer-events-none",
            side === "top" ? "bottom-full mb-2" : "top-full mt-2",
            className,
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}
