import Link from "next/link"
import { ArrowUpRight, Play, Sparkles, Flame, Target, Heart } from "lucide-react"
import { verifySession, getRestConfig } from "@/lib/dal"
import { todayISO, formatDate, amsHour, dutchGreeting, formatEUR } from "@/lib/utils"
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
import { DeepWorkOverride } from "./DeepWorkOverride"
import { startPomodoroFromTask } from "./actions"
import { isoWeekDates, weekHits, isWeeklyTargetMet } from "@/lib/habits/weekly"
import { normalizeWidgetConfig, type WidgetKey } from "@/lib/today/widgets"

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
    { data: override },
    { data: bucketItems },
    { data: integ },
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
    supabase
      .from("daily_overrides")
      .select("deep_work_hours_manual, deep_work_skipped")
      .eq("date", date)
      .maybeSingle(),
    supabase
      .from("bucket_list_items")
      .select("id, title, estimated_cost_eur, target_date, priority")
      .eq("is_completed", false)
      .order("priority", { ascending: true })
      .order("target_date", { ascending: true, nullsFirst: false })
      .limit(2),
    supabase.from("user_integrations").select("today_widget_config").maybeSingle(),
    getRestConfig(),
    fetchTodayTasks(),
    fetchTodayEvents(),
    fetchTomorrowEvents(),
  ])

  const widgetConfig = normalizeWidgetConfig(integ?.today_widget_config)
  const visibleWidgets = widgetConfig.filter((w) => !w.hidden).map((w) => w.key)

  const completionMap = new Map((completions ?? []).map((c) => [c.habit_item_id, c]))

  // Weekly-target habits use the current Mon–Sun window: any active habit
  // with target_per_week 1..6 is "done for today" once that many completions
  // land in the week, and drops out of "Nog te doen" for the rest of it.
  const weekDates = new Set(isoWeekDates(now))
  const weekCompletions = (recentCompletions ?? []).map((c) => ({
    habit_item_id: c.habit_item_id,
    date: c.date,
    was_skipped: c.was_skipped,
    quantity_value: c.quantity_value,
  }))

  // Compute done / pending / skipped counts.
  // - "Pending" = not done and not skipped (the actionable list)
  // - "Done" = completed with quantity met (or non-quantity completion exists),
  //   excluding skipped rows (skipping doesn't earn credit toward Life Score)
  const habitsTotal = items?.length ?? 0
  const allItems = items ?? []
  const pending = allItems.filter((h) => {
    if (h.target_per_week != null && isWeeklyTargetMet(h, weekCompletions, weekDates)) {
      return false
    }
    const c = completionMap.get(h.id)
    if (c?.was_skipped) return false
    const isDone = h.quantity_target != null
      ? (c?.quantity_value ?? 0) >= Number(h.quantity_target)
      : !!c
    return !isDone
  })
  const habitsDone = allItems.reduce((acc, h) => {
    if (h.target_per_week != null) {
      return acc + (isWeeklyTargetMet(h, weekCompletions, weekDates) ? 1 : 0)
    }
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

  // Deep work — auto sum from focus_sessions, overridable per-day:
  //   • daily_overrides.deep_work_skipped = true → Life Score becomes 100% Habits
  //   • daily_overrides.deep_work_hours_manual = X → use X instead of focus_sessions sum
  const autoDwHours =
    (focuses ?? [])
      .filter((f) => f.type === "deep_work" && f.ended_at)
      .reduce((a, b) => a + (b.duration_minutes ?? 0), 0) / 60
  const manualDwHours = override?.deep_work_hours_manual != null
    ? Number(override.deep_work_hours_manual)
    : null
  const dwSkipped = !!override?.deep_work_skipped
  const dwHours = manualDwHours ?? autoDwHours
  const dwGoal = Number(cfg?.deep_work_daily_goal_h ?? 4)
  const dwPct = dwSkipped ? 0
    : dwGoal === 0 ? 0
      : Math.min(100, Math.round((dwHours / dwGoal) * 100))

  // Life Score (Habits 70% + Deep Work 30%; 100% Habits if deep work skipped)
  const score = lifeScore({
    habitsDone,
    habitsTotal,
    deepWorkHours: dwHours,
    deepWorkGoalH: dwGoal,
    deepWorkSkipped: dwSkipped,
  })
  const zone = lifeScoreZone(score)
  const zoneLabel = { great: "Uitstekend", good: "Goed", neutral: "Neutraal", muted: "Laag" }[zone]
  const zoneVariant = (
    zone === "great" || zone === "good" ? "good" : zone === "neutral" ? "warn" : "bad"
  ) as "good" | "warn" | "bad"

  // Perfect-day streak (consecutive days where habitsDone == habitsTotal).
  // Computed against the current count of active habits — close enough for
  // a personal app, avoids storing daily snapshots.
  // Returns both the current streak AND the best streak in the last 30 days
  // so we can show a "je vorige streak was X" recovery nudge if the current
  // is 0 but the user had momentum recently.
  const { perfectStreak, recoveryStreak } = (() => {
    if (habitsTotal === 0) return { perfectStreak: 0, recoveryStreak: 0 }
    const byDate = new Map<string, Set<string>>()
    for (const c of recentCompletions ?? []) {
      if (c.was_skipped) continue
      const set = byDate.get(c.date) ?? new Set<string>()
      set.add(c.habit_item_id)
      byDate.set(c.date, set)
    }
    const isPerfectOn = (d: string) => (byDate.get(d)?.size ?? 0) >= habitsTotal

    // Current streak — walk back from today
    let current = 0
    const cur = new Date(date)
    for (let i = 0; i < 60; i++) {
      const key = cur.toISOString().slice(0, 10)
      if (isPerfectOn(key)) current++
      else if (i === 0) break // today not yet perfect — show 0
      else break
      cur.setDate(cur.getDate() - 1)
    }

    // Best streak in the last 30 days (used for the recovery nudge)
    let best = 0
    let run = 0
    const scan = new Date(date)
    scan.setDate(scan.getDate() - 30)
    for (let i = 0; i < 30; i++) {
      const key = scan.toISOString().slice(0, 10)
      if (isPerfectOn(key)) {
        run++
        if (run > best) best = run
      } else {
        run = 0
      }
      scan.setDate(scan.getDate() + 1)
    }
    return { perfectStreak: current, recoveryStreak: best }
  })()

  // Show recovery nudge when current streak is 0 but the user recently had a
  // ≥3-day run. Encourages picking back up without shaming.
  const showRecovery = perfectStreak === 0 && recoveryStreak >= 3

  // Greeting based on Ams-local hour (shared util keeps thresholds in one place)
  const greeting = dutchGreeting(now)

  // Each user-orderable widget is built once and looked up by key when
  // rendering. The hero card above stays fixed in position. Whole-widget
  // empty states keep their existing behavior (don't render at all rather
  // than show a header with nothing under it).
  const widgetNodes: Record<WidgetKey, React.ReactNode> = {
    "pending-habits": habitsTotal > 0 ? (
      <Card key="pending-habits">
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
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary font-semibold pl-1">
                <Flame size={11} />
                <span>Volgende</span>
              </div>
              {orderedPending.map((h, i) => {
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
                const weeklyProgress = h.target_per_week != null
                  ? {
                      hits: weekHits(h, weekCompletions, weekDates),
                      target: h.target_per_week,
                    }
                  : null
                return (
                  <div
                    key={h.id}
                    className={i === 0 ? "ring-1 ring-primary/30 rounded-xl" : undefined}
                  >
                    <HabitRow
                      id={h.id}
                      name={h.name}
                      dosage={h.dosage}
                      done={false}
                      isAuto={false}
                      streak={h.streak_current ?? 0}
                      date={date}
                      timeOfDay={(h.time_of_day as TimeKey) ?? null}
                      cue={cueFor(h.id)}
                      weekly={weeklyProgress}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    ) : null,

    "agenda": (
      <AgendaCard
        key="agenda"
        today={events}
        tomorrow={tomorrowEvents}
        initialDay={isEvening ? "tomorrow" : "today"}
      />
    ),

    "bucket-list": (bucketItems ?? []).length > 0 ? (
      <CollapsibleSection
        key="bucket-list"
        title={
          <span className="flex items-center gap-2">
            <Target size={13} className="text-muted-fg" />
            Op je verlanglijst
          </span>
        }
        defaultOpen={false}
      >
        <Card>
          <CardContent className="space-y-2 pt-4">
            {(bucketItems ?? []).map((b) => (
              <Link
                key={b.id}
                href="/finance/bucket"
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-2 p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{b.title}</div>
                  <div className="text-xs text-muted-fg mt-0.5 flex flex-wrap gap-2">
                    {b.estimated_cost_eur != null ? (
                      <span className="tabular-nums">{formatEUR(Number(b.estimated_cost_eur))}</span>
                    ) : null}
                    {b.target_date ? <span>· deadline {b.target_date}</span> : null}
                    {b.priority ? <span>· prio {b.priority}</span> : null}
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-muted-fg shrink-0" />
              </Link>
            ))}
            <Link
              href="/finance/bucket"
              className="block pt-1 text-center text-[11px] text-muted-fg hover:text-fg transition-colors"
            >
              Volledige lijst →
            </Link>
          </CardContent>
        </Card>
      </CollapsibleSection>
    ) : null,

    "notion-tasks": tasks.length ? (
      <CollapsibleSection key="notion-tasks" title="Taken vandaag">
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
                <form action={startPomodoroFromTask.bind(null, t.title, t.id)}>
                  <button
                    type="submit"
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary transition-all duration-200 ease-[var(--ease-spring)] hover:opacity-80 active:scale-[0.96]"
                    title="Start 25-minute focus session"
                  >
                    <Play size={11} /> 25m focus
                  </button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      </CollapsibleSection>
    ) : null,
  }

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

        {/* Streak headline / recovery nudge — only one shows at a time */}
        {perfectStreak >= 2 ? (
          <div className="flex items-center gap-2 text-sm font-medium">
            <Flame size={16} className="text-accent" />
            <span>
              <span className="font-bold tabular-nums">{perfectStreak}</span>
              <span className="text-muted-fg"> dagen op rij alles afgevinkt</span>
            </span>
          </div>
        ) : showRecovery ? (
          <div className="flex items-center gap-2 rounded-xl bg-accent-soft/60 px-3 py-2 text-sm">
            <Heart size={15} className="text-accent shrink-0" />
            <span>
              <span className="text-muted-fg">Je vorige streak was </span>
              <span className="font-bold tabular-nums">{recoveryStreak}</span>
              <span className="text-muted-fg"> dagen — pak &lsquo;m vandaag weer op.</span>
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
                tooltip={
                  <div className="space-y-1">
                    <div className="font-bold text-sm">Habits afgevinkt</div>
                    <div className="text-muted-fg">
                      <strong className="text-fg tabular-nums">{habitsDone}</strong> van{" "}
                      <strong className="text-fg tabular-nums">{habitsTotal}</strong> vandaag ({habitsPct}%)
                    </div>
                    <div className="text-[10px] text-muted-fg">Skipped tellen niet mee voor Life Score.</div>
                  </div>
                }
              />
              <MetricRing
                value={dwSkipped ? 0 : dwPct}
                label="Deep Work"
                display={dwSkipped ? "skip" : `${dwHours.toFixed(1)}h`}
                size={84}
                zone={dwSkipped ? "muted" : dwPct >= 90 ? "good" : dwPct >= 50 ? "warn" : "muted"}
                tooltip={
                  <div className="space-y-1">
                    <div className="font-bold text-sm">Deep work uren</div>
                    {dwSkipped ? (
                      <div className="text-muted-fg">Overgeslagen voor vandaag — telt 100% Habits.</div>
                    ) : (
                      <div className="text-muted-fg">
                        <strong className="text-fg tabular-nums">{dwHours.toFixed(1)}u</strong> van{" "}
                        <strong className="text-fg tabular-nums">{dwGoal}u</strong> doel
                      </div>
                    )}
                    <div className="text-[10px] text-muted-fg">
                      Bron: {manualDwHours != null ? "handmatig ingevoerd" : "Focus-sessies"}
                    </div>
                  </div>
                }
              />
              <MetricRing
                value={Math.min(100, perfectStreak * 10)}
                label="Streak"
                display={perfectStreak > 0 ? `${perfectStreak}d` : "—"}
                size={84}
                color="var(--accent)"
                tooltip={
                  <div className="space-y-1">
                    <div className="font-bold text-sm">Perfect-day streak</div>
                    <div className="text-muted-fg">
                      Huidig: <strong className="text-fg tabular-nums">{perfectStreak} dagen</strong>
                    </div>
                    {recoveryStreak > 0 ? (
                      <div className="text-muted-fg">
                        Beste in 30d: <strong className="text-fg tabular-nums">{recoveryStreak} dagen</strong>
                      </div>
                    ) : null}
                    <div className="text-[10px] text-muted-fg">Dagen waarop alle actieve habits afgevinkt zijn.</div>
                  </div>
                }
              />
            </div>
            <DeepWorkOverride
              date={date}
              autoHours={autoDwHours}
              manualHours={manualDwHours}
              skipped={dwSkipped}
            />
          </CardContent>
        </Card>

        {/* User-orderable widgets — rendered in the order saved in Settings */}
        {visibleWidgets.map((k) => widgetNodes[k])}
      </div>
    </div>
  )
}
