"use client"
import { useEffect, useState } from "react"
import { X, Flame, TrendingUp, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

type Completion = {
  date: string
  habit_item_id: string
  was_skipped: boolean | null
  was_auto: boolean | null
  quantity_value: number | null
}

type Habit = {
  id: string
  name: string
  dosage: string | null
  time_of_day: string | null
  frequency: string | null
  quantity_target: number | null
  streak_current: number | null
  streak_longest: number | null
}

const TIME_LABELS: Record<string, string> = {
  morning: "Ochtend",
  afternoon: "Middag",
  evening: "Avond",
  anytime: "Hele dag",
}

/**
 * Bottom-sheet insights for a single habit. Shows 30-day completion rate,
 * weekday vs weekend split, mini timeline, and streak stats.
 *
 * Data is computed client-side from the completions prop — the parent
 * page does a single supabase query for all habits' 30-day window and
 * passes the relevant slice in.
 */
export function HabitInsightsSheet({
  habit,
  completions,
  open,
  onClose,
}: {
  habit: Habit
  completions: Completion[]
  open: boolean
  onClose: () => void
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build 30-day map of completion state
  const last30: Array<{
    date: string
    done: boolean
    skipped: boolean
    isWeekend: boolean
  }> = []
  const byDate = new Map<string, Completion>()
  for (const c of completions) byDate.set(c.date, c)

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const c = byDate.get(key)
    const dow = d.getDay() // 0 = Sun
    const isWeekend = dow === 0 || dow === 6
    const skipped = !!c?.was_skipped
    const done = !skipped && !!c && (
      habit.quantity_target == null ||
      (c.quantity_value ?? 0) >= Number(habit.quantity_target)
    )
    last30.push({ date: key, done, skipped, isWeekend })
  }

  const doneCount = last30.filter((d) => d.done).length
  const completionRate = Math.round((doneCount / 30) * 100)

  const weekdayDays = last30.filter((d) => !d.isWeekend)
  const weekendDays = last30.filter((d) => d.isWeekend)
  const wdRate = weekdayDays.length === 0 ? 0
    : Math.round((weekdayDays.filter((d) => d.done).length / weekdayDays.length) * 100)
  const weRate = weekendDays.length === 0 ? 0
    : Math.round((weekendDays.filter((d) => d.done).length / weekendDays.length) * 100)

  const autoCount = completions.filter((c) => c.was_auto && !c.was_skipped).length
  const skipCount = completions.filter((c) => c.was_skipped).length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet — slides up from bottom on mobile, centered on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Insights voor ${habit.name}`}
        className="fixed inset-x-0 bottom-0 z-[70] md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md md:w-full"
      >
        <div className="bg-card rounded-t-3xl md:rounded-3xl shadow-2xl border border-border/70 overflow-hidden pb-safe">
          {/* Drag handle (visual only on mobile) */}
          <div className="md:hidden flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          <div className="flex items-start justify-between gap-3 px-5 pt-3 pb-2">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight leading-tight">{habit.name}</h2>
              <div className="text-[11px] text-muted-fg mt-0.5 flex flex-wrap gap-1.5">
                {habit.time_of_day ? <span>{TIME_LABELS[habit.time_of_day] ?? habit.time_of_day}</span> : null}
                {habit.frequency ? <span>· {habit.frequency}</span> : null}
                {habit.dosage ? <span>· {habit.dosage}</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluit"
              className="shrink-0 -mr-1 p-1.5 rounded-lg text-muted-fg hover:text-fg hover:bg-muted/60 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* Top metrics */}
            <div className="grid grid-cols-3 gap-2 pt-3">
              <StatTile
                label="30-dag"
                value={`${completionRate}%`}
                tone={completionRate >= 80 ? "good" : completionRate >= 50 ? "warn" : "bad"}
                sub={`${doneCount}/30 dgn`}
              />
              <StatTile
                label="Streak"
                value={`${habit.streak_current ?? 0}d`}
                tone={(habit.streak_current ?? 0) >= 7 ? "good" : "muted"}
                icon={<Flame size={11} />}
              />
              <StatTile
                label="Langste"
                value={`${habit.streak_longest ?? 0}d`}
                tone="muted"
                icon={<TrendingUp size={11} />}
              />
            </div>

            {/* Weekday vs weekend */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-fg flex items-center gap-1.5">
                <CalendarDays size={11} />
                Werkdagen vs weekend
              </div>
              <div className="space-y-2">
                <RateBar label="Werkdagen" value={wdRate} />
                <RateBar label="Weekend" value={weRate} />
              </div>
              {Math.abs(wdRate - weRate) >= 25 && (weekdayDays.length > 0 && weekendDays.length > 0) ? (
                <p className="text-[11px] text-muted-fg">
                  Je doet deze {wdRate > weRate ? "veel beter op werkdagen" : "veel beter in het weekend"}.
                </p>
              ) : null}
            </div>

            {/* 30-day dot timeline */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-fg">Laatste 30 dagen</div>
              <div className="flex flex-wrap gap-1">
                {last30.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}${d.done ? " · klaar" : d.skipped ? " · overgeslagen" : " · open"}`}
                    className={cn(
                      "h-3 w-3 rounded-sm",
                      d.done ? "bg-good"
                        : d.skipped ? "bg-muted-fg/30 ring-1 ring-inset ring-muted-fg/30"
                          : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-fg">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-good" /> Klaar
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-muted-fg/30 ring-1 ring-inset ring-muted-fg/30" /> Overgeslagen
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-muted" /> Niet
                </span>
              </div>
            </div>

            {/* Detail line */}
            {(autoCount > 0 || skipCount > 0) ? (
              <div className="text-[11px] text-muted-fg flex flex-wrap gap-x-3 gap-y-1">
                {autoCount > 0 ? <span>Auto-afgevinkt: {autoCount}×</span> : null}
                {skipCount > 0 ? <span>· Overgeslagen: {skipCount}×</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}

function StatTile({
  label,
  value,
  tone,
  sub,
  icon,
}: {
  label: string
  value: string
  tone: "good" | "warn" | "bad" | "muted"
  sub?: string
  icon?: React.ReactNode
}) {
  const toneClass =
    tone === "good" ? "text-good"
      : tone === "warn" ? "text-warn"
        : tone === "bad" ? "text-bad"
          : "text-fg"
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-fg flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className={cn("text-xl font-bold tabular-nums tracking-tight mt-0.5", toneClass)}>{value}</div>
      {sub ? <div className="text-[10px] text-muted-fg">{sub}</div> : null}
    </div>
  )
}

function RateBar({ label, value }: { label: string; value: number }) {
  const tone = value >= 80 ? "bg-good" : value >= 50 ? "bg-warn" : "bg-bad"
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-bold tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
