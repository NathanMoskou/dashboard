"use client"
import { useState } from "react"
import { cn, formatEUR, minutesToHM } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Session = {
  started_at: string
  duration_minutes: number | null
  is_billable: boolean
  client_name: string
}

const PERIODS = [
  { key: "today" as const, label: "Vandaag" },
  { key: "week" as const, label: "Week" },
  { key: "month" as const, label: "Maand" },
]

export function PeriodStats({
  sessions,
  rates,
  todayStartMs,
  weekStartMs,
  monthStartMs,
}: {
  sessions: Session[]
  rates: Record<string, number>
  todayStartMs: number
  weekStartMs: number
  monthStartMs: number
}) {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week")

  const threshold =
    period === "today" ? todayStartMs : period === "week" ? weekStartMs : monthStartMs
  const filtered = sessions.filter((s) => new Date(s.started_at).getTime() >= threshold)

  const billableMin = filtered
    .filter((s) => s.is_billable)
    .reduce((a, b) => a + (b.duration_minutes ?? 0), 0)
  const nonBillableMin = filtered
    .filter((s) => !s.is_billable)
    .reduce((a, b) => a + (b.duration_minutes ?? 0), 0)
  const billableEur = filtered
    .filter((s) => s.is_billable)
    .reduce((a, b) => {
      const rate = rates[b.client_name] ?? 0
      return a + ((b.duration_minutes ?? 0) / 60) * rate
    }, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Overzicht</CardTitle>
          <div className="flex gap-0.5 rounded-lg bg-muted/40 p-0.5">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                  period === key
                    ? "bg-card text-fg shadow-sm"
                    : "text-muted-fg hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-3">
        <Stat
          label="Billable"
          value={minutesToHM(billableMin)}
          sub={billableEur > 0 ? formatEUR(billableEur) : undefined}
        />
        <Stat label="Non-billable" value={minutesToHM(nonBillableMin)} />
        <Stat label="Sessies" value={String(filtered.length)} />
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-fg">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {sub ? <div className="text-[11px] text-muted-fg">{sub}</div> : null}
    </div>
  )
}
