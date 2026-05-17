import Link from "next/link"
import { ArrowUpRight, Play, Sparkles, Flame } from "lucide-react"
import { verifySession, getRestConfig } from "@/lib/dal"
import { todayISO, formatDate, amsHour, dutchGreeting } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { fetchTodayTasks } from "@/lib/notion"
import { fetchTodayEvents, fetchTomorrowEvents } from "@/lib/google"
import { AgendaCard } from "./AgendaCard"
import { lifeScore, lifeScoreZone } from "@/lib/life-score"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MetricRing } from "@/components/ui/MetricRing"
import { TweenNumber } from "@/components/ui/TweenNumber"
import { CollapsibleSection } from "@/components/ui/Collapsible"
import { HabitRow } from "../habits/HabitRow"
import { WaterHabitRow } from "../habits/WaterHabitRow"

export const revalidate = 60

type TimeKey = "morning" | "afternoon" | "evening" | "anytime"

// Order in which time-of-day groups appear, given the current Ams-local hour.
// Thresholds line up with the greeting: 06–11 morning, 12–17 afternoon,
// 18–22 evening, 23–05 late night.
function priorityForHour(hour: number): TimeKey[] {
  if (hour < 12) return ["morning", "afternoon", "evening", "anytime"]
  if (hour < 18) return ["afternoon", "evening", "morning", "anytime"]
  if (hour < 23) return ["evening", "anytime", "afternoon", "morning"]
  return ["anytime", "morning", "afternoon", "evening"]
}

export default async function TodayPage() {
  const date = todayISO()
  const now = new Date()
  const hour = amsHour(now)
  const isEvening = hour >= 18
  const { supabase } = await verifySession()

  // Window for streak detection — pull last 60 days of completions.
  const streakWindow = (() => {
    const d = new Date(date)
    d.setDate(d.getDate() - 60)
    return d.toISOString().slice(0, 10)
  })()

  const [
    { data: items },
    { data: completions },
    { data: recentCompletions },
    { data: focuses },
    cfg,
    tasks,
    events,
    tomorrowEvents,
  ] = await Promise.all([
    supabase
      .from("habit_items")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase.from("habit_completions").select("*").eq("date", date),
    supabase
      .from("habit_completions")
      .select("date, habit_item_id, was_skipped, quantity_value")
      .gte("date", streakWindow)
      .lte("date", date),
    supabase
      .from("focus_sessions")
      .select("duration_minutes, type, ended_at")
      .gte("started_at", `${date}T00:00:00`)
      .lte("started_at", `${date}T23:59:59`),
    getRestConfig(),
    fetchTodayTasks(),
    fetchTodayEvents(),
    fetchTomorrowEvents(),
  ])

  const completionMap = new Map((completions ?? []).map((c) => [c.habit_item_id, c]))

  // Compute done / pending / skipped counts.
  // - "Pending" = not done and not skipped (the actionable list)
  // - "Done" = completed with quantity met (or non-quantity completion exists),
  //   excluding skipped rows (skipping doesn't earn credit toward Life Score)
  const habitsTotal = items?.length ?? 0
  const allItems = items ?? []
  const pending = allItems.filter((h) => {
    const c = completionMap.get(h.id)
    if (c?.was_skipped) return false
    const isDone = h.quantity_target != null
      ? (c?.quantity_value ?? 0) >= Number(h.quantity_target)
      : !!c
    return !isDone
  })
  const habitsDone = allItems.reduce((acc, h) => {
    const c = completionMap.get(h.id)
    if (!c || c.was_skipped) return acc
    const isDone = h.quantity_target != null
      ? (c.quantity_value ?? 0) >= Number(h.quantity_target)
      : true
    return acc + (isDone ? 1 : 0)
  }, 0)
  const habitsPct = habitsTotal === 0 ? 0 : Math.round((habitsDone / habitsTotal) * 100)

  // Order pending by time-of-day priority for current hour.
  const order = priorityForHour(hour)
  const orderedPending = [...pending].sort((a, b) => {
    const ai = order.indexOf((a.time_of_day as TimeKey) ?? "anytime")
    const bi = order.indexOf((b.time_of_day as TimeKey) ?? "anytime")
    if (ai !== bi) return ai - bi
    return (a.display_order ?? 0) - (b.display_order ?? 0)
  })

  // Cue map (for paired habits whose anchor isn't done yet)
  const itemsById = new Map(allItems.map((h) => [h.id, h]))
  function cueFor(habitId: string): string | null {
    const h = itemsById.get(habitId)
    if (!h?.pair_after_habit_id) return null
    const anchor = itemsById.get(h.pair_after_habit_id)
    if (!anchor) return null
    const ac = completionMap.get(anchor.id)
    if (!ac || ac.was_skipped) return `Na: ${anchor.name}`
    const anchorDone = anchor.quantity_target != null
      ? (ac.quantity_value ?? 0) >= Number(anchor.quantity_target)
      : !!ac
    return anchorDone ? null : `Na: ${anchor.name}`
  }

  // Deep work
  const dwHours =
    (focuses ?? [])
      .filter((f) => f.type === "deep_work" && f.ended_at)
      .reduce((a, b) => a + (b.duration_minutes ?? 0), 0) / 60
  const dwGoal = Number(cfg?.deep_work_daily_goal_h ?? 4)
  const dwPct = dwGoal === 0 ? 0 : Math.min(100, Math.round((dwHours / dwGoal) * 100))

  // Life Score (Habits 70% + Deep Work 30%)
  const score = lifeScore({
    habitsDone,
    habitsTotal,
    deepWorkHours: dwHours,
    deepWorkGoalH: dwGoal,
  })
  const zone = lifeScoreZone(score)
  const zoneLabel = { great: "Uitstekend", good: "Goed", neutral: "Neutraal", muted: "Gedempt" }[zone]
  const zoneVariant = (
    zone === "great" || zone === "good" ? "good" : zone === "neutral" ? "warn" : "bad"
  ) as "good" | "warn" | "bad"

  // Perfect-day streak (consecutive days where habitsDone == habitsTotal).
  // Computed against the current count of active habits — close enough for
  // a personal app, avoids storing daily snapshots.
  const perfectStreak = (() => {
    if (habitsTotal === 0) return 0
    const byDate = new Map<string, { done: number; counted: Set<string> }>()
    for (const c of recentCompletions ?? []) {
      if (c.was_skipped) continue
      const cell = byDate.get(c.date) ?? { done: 0, counted: new Set<string>() }
      if (cell.counted.has(c.habit_item_id)) continue
      // For quantity habits we can't fully verify "≥ target" without item rows here;
      // approximate by counting any non-skipped completion row.
      cell.counted.add(c.habit_item_id)
      cell.done++
      byDate.set(c.date, cell)
    }
    let streak = 0
    const cursor = new Date(date)
    for (let i = 0; i < 60; i++) {
      const key = cursor.toISOString().slice(0, 10)
      const cell = byDate.get(key)
      const isPerfect = cell ? cell.done >= habitsTotal : false
      if (isPerfect) streak++
      else if (i === 0) break // today not yet perfect — show 0 streak (today doesn't count until complete)
      else break
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  })()

  // Greeting based on Ams-local hour (shared util keeps thresholds in one place)
  const greeting = dutchGreeting(now)

  return (
    <div>
      <LiveHeader
        title={greeting}
        subtitle={formatDate(date)}
        className="mb-5 md:mb-6"
      />

      {/*
        Mobile: floating iOS-sheet over the off-white page. Desktop: flat.
      */}
      <div className="
        -mx-4 bg-card rounded-t-3xl px-5 pt-7 pb-6 space-y-5
        shadow-[0_-6px_32px_rgba(15,15,15,0.06)]
        md:mx-0 md:bg-transparent md:rounded-none md:shadow-none
        md:px-0 md:pt-0 md:space-y-6
      ">
        {/* Drag handle — mobile only */}
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border md:hidden" />

        {/* Streak headline (only when there's a streak worth showing) */}
        {perfectStreak >= 2 ? (
          <div className="flex items-center gap-2 text-sm font-medium">
            <Flame size={16} className="text-accent" />
            <span>
              <span className="font-bold tabular-nums">{perfectStreak}</span>
              <span className="text-muted-fg"> dagen op rij alles afgevinkt</span>
            </span>
          </div>
        ) : null}

        {/* Hero: big Life Score + ring trio (Habits / Deep Work / Streak) */}
        <Card hero className="overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] uppercase tracking-wider text-muted-fg">Life Score</span>
                <Badge variant={zoneVariant} className="self-start">{zoneLabel}</Badge>
              </div>
              <div className="text-6xl md:text-7xl font-extrabold tabular-nums tracking-tight leading-none">
                <TweenNumber value={score} />
                <span className="text-2xl font-semibold text-muted-fg ml-1">/100</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
              <MetricRing
                value={habitsPct}
                label="Habits"
                display={`${habitsDone}/${habitsTotal}`}
                size={84}
                zone={habitsTotal === 0 ? "muted" : habitsPct >= 90 ? "good" : habitsPct >= 50 ? "warn" : "bad"}
              />
              <MetricRing
                value={dwPct}
                label="Deep Work"
                display={`${dwHours.toFixed(1)}h`}
                size={84}
                zone={dwPct >= 90 ? "good" : dwPct >= 50 ? "warn" : "muted"}
              />
              <MetricRing
                value={Math.min(100, perfectStreak * 10)}
                label="Streak"
                display={perfectStreak > 0 ? `${perfectStreak}d` : "—"}
                size={84}
                color="var(--accent)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pending habits — Bevel-style inline list. Hidden entirely when the
            user has no active habits (empty card with just a header looks broken). */}
        {habitsTotal > 0 ? (
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold tracking-tight">Nog te doen</span>
                <Link
                  href="/habits"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Alles <ArrowUpRight size={12} />
                </Link>
              </div>

              {pending.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl bg-good/10 px-3 py-3 text-sm text-good">
                  <Sparkles size={14} className="shrink-0" />
                  <span className="font-medium">Alles afgevinkt voor vandaag</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderedPending.map((h) => {
                    const c = completionMap.get(h.id)
                    if (h.quantity_target != null) {
                      return (
                        <WaterHabitRow
                          key={h.id}
                          id={h.id}
                          name={h.name}
                          target={h.quantity_target}
                          current={c?.quantity_value ?? 0}
                          date={date}
                        />
                      )
                    }
                    return (
                      <HabitRow
                        key={h.id}
                        id={h.id}
                        name={h.name}
                        dosage={h.dosage}
                        done={false}
                        isAuto={false}
                        streak={h.streak_current ?? 0}
                        date={date}
                        timeOfDay={(h.time_of_day as TimeKey) ?? null}
                        cue={cueFor(h.id)}
                      />
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Agenda — defaults to "tomorrow" in the evening */}
        <AgendaCard
          today={events}
          tomorrow={tomorrowEvents}
          initialDay={isEvening ? "tomorrow" : "today"}
        />

        {/* Notion tasks */}
        {tasks.length ? (
          <CollapsibleSection title="Taken vandaag">
            <Card>
              <CardContent className="space-y-2 pt-4">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-2 p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t.title}</div>
                      {(t.priority || t.project) ? (
                        <div className="text-xs text-muted-fg mt-0.5">
                          {[t.priority, t.project].filter(Boolean).join(" · ")}
                        </div>
                      ) : null}
                    </div>
                    <Link
                      href="/focus"
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
                    >
                      <Play size={11} /> Focus
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          </CollapsibleSection>
        ) : null}
      </div>
    </div>
  )
}
