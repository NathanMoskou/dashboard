export const revalidate = 30

import Link from "next/link"
import { verifySession } from "@/lib/dal"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const WEEKS = 13
const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]

function colorFor(pct: number): string {
  if (pct >= 90) return "bg-good"
  if (pct >= 70) return "bg-good/60"
  if (pct >= 40) return "bg-warn/70"
  if (pct > 0) return "bg-bad/40"
  return "bg-muted"
}

export default async function HeatmapPage() {
  const { supabase } = await verifySession()

  const today = new Date()
  const todayISO = today.toISOString().split("T")[0]

  // Align grid start to Monday 13 weeks ago
  const dayOfWeek = today.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const gridEnd = new Date(today)
  gridEnd.setDate(today.getDate() - daysToMonday + 6) // last Sunday of current week
  const gridStart = new Date(gridEnd)
  gridStart.setDate(gridEnd.getDate() - WEEKS * 7 + 1)
  const startISO = gridStart.toISOString().split("T")[0]

  const thirtyISO = new Date(today.getTime() - 29 * 86400000).toISOString().split("T")[0]

  const [{ data: items }, { data: completions }] = await Promise.all([
    supabase
      .from("habit_items")
      .select("id, name, streak_current")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("habit_completions")
      .select("date, habit_item_id")
      .gte("date", startISO),
  ])

  const totalActive = items?.length ?? 0

  // Aggregate completions
  const countsByDate = new Map<string, number>()
  const byHabit = new Map<string, Set<string>>()
  for (const c of completions ?? []) {
    countsByDate.set(c.date, (countsByDate.get(c.date) ?? 0) + 1)
    if (c.habit_item_id) {
      if (!byHabit.has(c.habit_item_id)) byHabit.set(c.habit_item_id, new Set())
      byHabit.get(c.habit_item_id)!.add(c.date)
    }
  }

  // Build 13×7 grid — columns=weeks, rows=Mon–Sun
  type Cell = { date: string; pct: number; count: number; isFuture: boolean }
  const weeks: Cell[][] = []
  const cursor = new Date(gridStart)
  for (let w = 0; w < WEEKS; w++) {
    const week: Cell[] = []
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().split("T")[0]
      const isFuture = key > todayISO
      const count = countsByDate.get(key) ?? 0
      const pct = totalActive === 0 ? 0 : Math.round((count / totalActive) * 100)
      week.push({ date: key, pct, count, isFuture })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }

  // Month labels: show when it's the first week of a new month
  const monthLabels = weeks.map((week) => {
    const d = new Date(week[0].date)
    return d.getDate() <= 7
      ? d.toLocaleDateString("nl-NL", { month: "short" })
      : ""
  })

  // Per-habit stats
  const totalDays90 = Math.min(WEEKS * 7, Math.floor((today.getTime() - gridStart.getTime()) / 86400000) + 1)
  const habitStats = (items ?? []).map((h) => {
    const dates = byHabit.get(h.id) ?? new Set<string>()
    const d90 = [...dates].filter((d) => d >= startISO && d <= todayISO).length
    const d30 = [...dates].filter((d) => d >= thirtyISO && d <= todayISO).length
    return {
      id: h.id,
      name: h.name,
      streak: h.streak_current ?? 0,
      pct90: Math.round((d90 / totalDays90) * 100),
      pct30: Math.round((d30 / 30) * 100),
    }
  })

  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={[{ label: "Habits", href: "/habits" }, { label: "Heatmap" }]} />
      <LiveHeader title="Habit Heatmap" subtitle={`Laatste ${WEEKS} weken`} />

      <Card>
        <CardHeader>
          <CardTitle>Dagelijkse voltooiing</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-max space-y-1">
            {/* Month labels row */}
            <div className="flex ml-8 mb-0.5">
              {weeks.map((_, wi) => (
                <div key={wi} className="w-7 shrink-0 text-[10px] text-muted-fg">
                  {monthLabels[wi]}
                </div>
              ))}
            </div>

            {/* Day rows */}
            {DAY_LABELS.map((day, di) => (
              <div key={day} className="flex items-center gap-1">
                <span className="w-6 shrink-0 text-right text-[10px] text-muted-fg">{day}</span>
                <div className="flex gap-1">
                  {weeks.map((week, wi) => {
                    const cell = week[di]
                    if (!cell) return <div key={wi} className="h-6 w-6" />
                    if (cell.isFuture) {
                      return <div key={wi} className="h-6 w-6 rounded-sm bg-muted/20" />
                    }
                    return (
                      <Link
                        key={wi}
                        href={`/habits?date=${cell.date}`}
                        className={cn(
                          "h-6 w-6 rounded-sm hover:ring-2 hover:ring-fg/40",
                          colorFor(cell.pct),
                        )}
                        title={`${cell.date} — ${cell.count}/${totalActive} (${cell.pct}%)`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-fg">
            <span>Minder</span>
            <span className="h-4 w-4 rounded-sm bg-muted" />
            <span className="h-4 w-4 rounded-sm bg-bad/40" />
            <span className="h-4 w-4 rounded-sm bg-warn/70" />
            <span className="h-4 w-4 rounded-sm bg-good/60" />
            <span className="h-4 w-4 rounded-sm bg-good" />
            <span>Meer</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-habit breakdown */}
      {habitStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Per habit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {habitStats.map((h) => (
              <div key={h.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{h.name}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-fg">🔥 {h.streak}d</span>
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        h.pct30 >= 80
                          ? "text-good"
                          : h.pct30 >= 50
                          ? "text-warn"
                          : "text-bad",
                      )}
                    >
                      {h.pct30}%
                    </span>
                    <span className="text-muted-fg tabular-nums">{h.pct90}% (90d)</span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      h.pct30 >= 80 ? "bg-good" : h.pct30 >= 50 ? "bg-warn" : "bg-bad",
                    )}
                    style={{ width: `${h.pct30}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
