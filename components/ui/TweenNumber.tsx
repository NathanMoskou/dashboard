"use client"
import { useEffect, useRef, useState } from "react"

/**
 * Animated number that tweens from its previous value to the next over
 * ~600ms using requestAnimationFrame. Used for hero metrics so they
 * feel "alive" — Bevel uses this trick everywhere.
 */

const EASE = (t: number) => 1 - Math.pow(1 - t, 3) // ease-out cubic

export function TweenNumber({
  value,
  duration = 600,
  format = (n: number) => `${Math.round(n)}`,
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  const frame = useRef<number | undefined>(undefined)
  const start = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (prev.current === value) return
    const from = prev.current
    const to = value
    start.current = undefined

    function tick(t: number) {
      if (start.current === undefined) start.current = t
      const elapsed = t - start.current
      const k = Math.min(1, elapsed / duration)
      const eased = EASE(k)
      setDisplay(from + (to - from) * eased)
      if (k < 1) frame.current = requestAnimationFrame(tick)
      else prev.current = to
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    }
  }, [value, duration])

  return <span className={className}>{format(display)}</span>
}
