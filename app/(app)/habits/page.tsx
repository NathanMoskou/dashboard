export const revalidate = 30

import Link from "next/link"
import { verifySession, getRestConfig } from "@/lib/dal"
import { todayISO } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/badge"
import { HabitRow } from "./HabitRow"
import { WaterHabitRow } from "./WaterHabitRow"
import { CollapsibleSection } from "@/components/ui/Collapsible"

const TIMES = [
  { key: "morning", label: "Ochtend" },
  { key: "afternoon", label: "Middag" },
  { key: "evening", label: "Avond" },
  { key: "anytime", label: "Hele dag" },
] as const

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const sp = await searchParams
  const date = sp.date ?? todayISO()
  const { supabase, userId } = await verifySession()

  const [{ data: items }, { data: completions }, { data: health }, { data: workout }, cfg] =
    await Promise.all([
      supabase
        .from("habit_items")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase.from("habit_completions").select("*").eq("date", date),
      supabase.from("health_entries").select("*").eq("date", date).maybeSingle(),
      supabase
        .from("workout_sessions")
        .select("id")
        .gte("started_at", `${date}T00:00:00`)
        .lt("started_at", `${date}T23:59:59`)
        .not("ended_at", "is", null)
        .limit(1)
        .maybeSingle(),
      getRestConfig(),
    ])

  const earlyRise = cfg?.early_rise_threshold ?? "07:30"
  const completionMap = new Map((completions ?? []).map((c) => [c.habit_item_id, c]))

  // Auto-complete logic
  for (const h of items ?? []) {
    if (completionMap.has(h.id)) continue
    let auto = false
    if (h.auto_source === "apple_health_sleep" && (health?.sleep_duration_min ?? 0) >= 465) auto = true
    if (
      h.auto_source === "apple_health_wake" &&
      health?.wake_time &&
      health.wake_time <= earlyRise
    ) {
      auto = true
    }
    if (h.auto_source === "workout_tracker" && workout) auto = true
    if (auto) {
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

  // Count done — for quantity habits, done = quantity_value >= quantity_target
  const total = items?.length ?? 0
  let done = 0
  for (const h of items ?? []) {
    const c = completionMap.get(h.id)
    if (!c) continue
    if (h.quantity_target != null) {
      if ((c.quantity_value ?? 0) >= Number(h.quantity_target)) done++
    } else {
      done++
    }
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  const grouped = TIMES.map((t) => ({
    ...t,
    items: (items ?? []).filter((i) => i.time_of_day === t.key),
  })).filter((g) => g.items.length)

  return (
    <div className="space-y-6">
      <LiveHeader title="Habits" subtitle="Dagelijkse routines bijhouden" />

      <Card accent="var(--primary)">
        <CardHeader>
          <CardTitle>Vandaag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={pct} />
          <div className="flex justify-between text-sm text-muted-fg">
            <span>
              {done} / {total} afgevinkt
            </span>
            <span>{pct}%</span>
          </div>
        </CardContent>
      </Card>

      {grouped.map((group) => (
        <CollapsibleSection key={group.key} title={group.label}>
          {group.items.map((h) => {
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
                done={!!c}
                isAuto={!!c?.was_auto}
                streak={h.streak_current ?? 0}
                date={date}
              />
            )
          })}
        </CollapsibleSection>
      ))}

      <div className="flex flex-wrap gap-2 pt-4">
        <Link
          href="/habits/heatmap"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors active:scale-95"
        >
          Heatmap
        </Link>
        <Link
          href="/habits/manage"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors active:scale-95"
        >
          Beheer habits
        </Link>
      </div>
    </div>
  )
}
