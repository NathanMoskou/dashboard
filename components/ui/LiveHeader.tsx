"use client"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function LiveHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = now
    ? now.toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Europe/Amsterdam",
      })
    : "—:——:——"

  const dateStr = now
    ? now.toLocaleDateString("nl-NL", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Europe/Amsterdam",
      })
    : ""

  const weekNum = now ? getISOWeek(now) : null

  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-fg mt-1 font-medium uppercase tracking-wider">{subtitle}</p>}
      </div>
      <div className="flex items-start gap-3 shrink-0">
        {action}
        <div className="text-right">
          <div className="text-base font-mono tabular-nums font-semibold text-fg leading-tight">
            {timeStr}
          </div>
          <div className="text-[11px] text-muted-fg mt-0.5 leading-tight">
            {dateStr ? `${dateStr} · ` : ""}
            {weekNum ? `W${weekNum}` : ""}
          </div>
        </div>
      </div>
    </header>
  )
}
