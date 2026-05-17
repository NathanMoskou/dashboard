import Link from "next/link"
import { ArrowUpRight, Play, Sparkles } from "lucide-react"
import { verifySession, getRestConfig } from "@/lib/dal"
import { todayISO, formatDate } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { fetchTodayTasks } from "@/lib/notion"
import { fetchTodayEvents, fetchTomorrowEvents } from "@/lib/google"
import { AgendaCard } from "./AgendaCard"
import { lifeScore, lifeScoreZone } from "@/lib/life-score"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress, Badge } from "@/components/ui/badge"
import { Ring } from "@/components/ui/ring"
import { CollapsibleSection } from "@/components/ui/Collapsible"
import { HabitRow } from "../habits/HabitRow"
import { WaterHabitRow } from "../habits/WaterHabitRow"

export const revalidate = 60

export default async function TodayPage() {
  const date = todayISO()
  const { supabase, userId } = await verifySession()

  const [
    { data: items },
    { data: completions },
    { data: focuses },
    { data: workout },
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
      .from("focus_sessions")
      .select("duration_minutes, type, ended_at")
      .gte("started_at", `${date}T00:00:00`)
      .lte("started_at", `${date}T23:59:59`),
    supabase
      .from("workout_sessions")
      .select("id")
      .gte("started_at", `${date}T00:00:00`)
      .lt("started_at", `${date}T23:59:59`)
      .not("ended_at", "is", null)
      .limit(1)
      .maybeSingle(),
    getRestConfig(),
    fetchTodayTasks(),
    fetchTodayEvents(),
    fetchTomorrowEvents(),
  ])

  const completionMap = new Map((completions ?? []).map((c) => [c.habit_item_id, c]))

  // Auto-complete workout-tracker habits when a finished session exists today.
  for (const h of items ?? []) {
    if (completionMap.has(h.id)) continue
    if (h.auto_source === "workout_tracker" && workout) {
      await supabase.from("habit_completions").upsert(
        {
          habit_item_id: h.id,
          date,
          was_auto: true,
          completed_at: new Date().toISOString(),
          user_id: userId,
        },
        { onConflict: "habit_item_id,date" },
      )
      completionMap.set(h.id, {
        id: "auto",
        date,
        habit_item_id: h.id,
        was_auto: true,
        completed_at: new Date().toISOString(),
        was_skipped: false,
        user_id: userId,
        quantity_value: null,
      })
    }
  }

  // Compute done count — quantity habits only count when value ≥ target.
  const habitsTotal = items?.length ?? 0
  const pending = (items ?? []).filter((h) => {
    const c = completionMap.get(h.id)
    const isDone = h.quantity_target != null
      ? (c?.quantity_value ?? 0) >= Number(h.quantity_target)
      : !!c
    return !isDone
  })
  const habitsDone = habitsTotal - pending.length
  const habitsPct = habitsTotal === 0 ? 0 : Math.round((habitsDone / habitsTotal) * 100)

  const dwHours =
    (focuses ?? [])
      .filter((f) => f.type === "deep_work" && f.ended_at)
      .reduce((a, b) => a + (b.duration_minutes ?? 0), 0) / 60
  const dwGoal = Number(cfg?.deep_work_daily_goal_h ?? 4)

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

  return (
    <div>
      <LiveHeader
        title="Vandaag"
        subtitle={formatDate(date)}
        className="mb-5 md:mb-6"
      />

      {/*
        Mobiel: witte iOS-sheet — loopt rand-aan-rand, afgeronde bovenhoeken,
        subtiele schaduw omhoog zodat de kaart "zweeft" boven de achtergrond.
        Desktop: transparant, normale kaart-flow.
      */}
      <div className="
        -mx-4 bg-card rounded-t-3xl px-5 pt-7 pb-6 space-y-4
        shadow-[0_-6px_32px_rgba(15,23,42,0.08)]
        md:mx-0 md:bg-transparent md:rounded-none md:shadow-none
        md:px-0 md:pt-0 md:space-y-6
      ">
        {/* Drag handle — alleen zichtbaar op mobiel */}
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border md:hidden" />

        {/* Life Score */}
        <Card accent="var(--primary)">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-fg">Life Score</div>
                <div className="text-4xl font-semibold tabular-nums mt-1 leading-none">
                  {score}
                  <span className="text-base font-normal text-muted-fg ml-1">/100</span>
                </div>
                <div className="mt-2">
                  <Badge variant={zoneVariant}>{zoneLabel}</Badge>
                </div>
              </div>
              <div className="shrink-0 rounded-2xl bg-primary-soft p-2">
                <Ring value={score} size={72} stroke={7} color="var(--primary)">
                  <span className="text-sm font-semibold tabular-nums text-primary">{score}</span>
                </Ring>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Habits vandaag — progress + open + pending list */}
        <Card accent="var(--primary)">
          <CardHeader>
            <CardTitle>Habits vandaag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={habitsPct} />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-fg">{habitsDone}/{habitsTotal} afgevinkt</span>
              <Link
                href="/habits"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Open <ArrowUpRight size={14} />
              </Link>
            </div>

            {habitsTotal > 0 && pending.length === 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-good/10 px-3 py-2.5 text-sm text-good">
                <Sparkles size={14} />
                <span className="font-medium">Alles afgevinkt voor vandaag</span>
              </div>
            ) : null}

            {pending.length > 0 ? (
              <div className="border-t border-border pt-3 space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-muted-fg">Nog te doen</div>
                {pending.map((h) => {
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
                    />
                  )
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Agenda */}
        <AgendaCard today={events} tomorrow={tomorrowEvents} />

        {/* Taken vandaag */}
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
