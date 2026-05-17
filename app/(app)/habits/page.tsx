export const revalidate = 30

import Link from "next/link"
import { Sunrise, Sun, Moon, Sparkles } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { todayISO } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/badge"
import { HabitRow } from "./HabitRow"
import { WaterHabitRow } from "./WaterHabitRow"
import { CollapsibleSection } from "@/components/ui/Collapsible"

const TIMES = [
  { key: "morning", label: "Ochtend", icon: Sunrise },
  { key: "afternoon", label: "Middag", icon: Sun },
  { key: "evening", label: "Avond", icon: Moon },
  { key: "anytime", label: "Hele dag", icon: Sparkles },
] as const

type TimeOfDay = (typeof TIMES)[number]["key"]

export default async function HabitsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const sp = await searchParams
  const date = sp.date ?? todayISO()
  const { supabase, userId } = await verifySession()

  const [{ data: items }, { data: completions }, { data: workout }] =
    await Promise.all([
      supabase
        .from("habit_items")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase.from("habit_completions").select("*").eq("date", date),
      supabase
        .from("workout_sessions")
        .select("id")
        .gte("started_at", `${date}T00:00:00`)
        .lt("started_at", `${date}T23:59:59`)
        .not("ended_at", "is", null)
        .limit(1)
        .maybeSingle(),
    ])

  const completionMap = new Map((completions ?? []).map((c) => [c.habit_item_id, c]))

  // Auto-complete: workout-tracker habits fire when a finished session exists today.
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

  // Count done — skipped completions don't count toward Life Score.
  const total = items?.length ?? 0
  let done = 0
  for (const h of items ?? []) {
    const c = completionMap.get(h.id)
    if (!c || c.was_skipped) continue
    if (h.quantity_target != null) {
      if ((c.quantity_value ?? 0) >= Number(h.quantity_target)) done++
    } else {
      done++
    }
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  // Map for cue lookups (used when a habit is paired behind another)
  const itemsById = new Map((items ?? []).map((h) => [h.id, h]))

  const grouped = TIMES.map((t) => ({
    ...t,
    items: (items ?? []).filter((i) => i.time_of_day === t.key),
  })).filter((g) => g.items.length)

  return (
    <div className="space-y-6">
      <LiveHeader title="Habits" subtitle="Dagelijkse routines bijhouden" />

      <Card hero>
        <CardHeader>
          <CardTitle>Vandaag</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={pct} />
          <div className="flex justify-between text-sm text-muted-fg">
            <span>
              {done} / {total} afgevinkt
            </span>
            <span className="tabular-nums">{pct}%</span>
          </div>
        </CardContent>
      </Card>

      {grouped.map((group) => {
        const GroupIcon = group.icon
        return (
          <CollapsibleSection
            key={group.key}
            title={
              <span className="flex items-center gap-2">
                <GroupIcon size={14} className="text-muted-fg" />
                {group.label}
              </span>
            }
          >
            {group.items.map((h) => {
              const c = completionMap.get(h.id)
              const isSkipped = !!c?.was_skipped
              const isDone = !isSkipped && (h.quantity_target != null
                ? (c?.quantity_value ?? 0) >= Number(h.quantity_target)
                : !!c)

              // Habit pairing: if the anchor isn't complete yet, surface the cue
              // ("na X") instead of hiding (manage page is the source of truth).
              let cue: string | null = null
              if (h.pair_after_habit_id) {
                const anchor = itemsById.get(h.pair_after_habit_id)
                if (anchor) {
                  const anchorDone = (() => {
                    const ac = completionMap.get(anchor.id)
                    if (!ac || ac.was_skipped) return false
                    return anchor.quantity_target != null
                      ? (ac.quantity_value ?? 0) >= Number(anchor.quantity_target)
                      : !!ac
                  })()
                  if (!anchorDone) cue = `Na: ${anchor.name}`
                }
              }

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
                  done={isDone}
                  isAuto={!!c?.was_auto}
                  isSkipped={isSkipped}
                  streak={h.streak_current ?? 0}
                  date={date}
                  timeOfDay={(h.time_of_day as TimeOfDay) ?? null}
                  cue={cue}
                />
              )
            })}
          </CollapsibleSection>
        )
      })}

      <div className="flex flex-wrap gap-2 pt-4">
        <Link
          href="/habits/heatmap"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition-all duration-200 ease-[var(--ease-spring)] hover:bg-muted active:scale-[0.96]"
        >
          Heatmap
        </Link>
        <Link
          href="/habits/manage"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition-all duration-200 ease-[var(--ease-spring)] hover:bg-muted active:scale-[0.96]"
        >
          Beheer habits
        </Link>
      </div>
    </div>
  )
}
