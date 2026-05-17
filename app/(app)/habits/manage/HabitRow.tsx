"use client"
import { useState, useTransition } from "react"
import { Pencil, Check, X, Loader2, Archive, RotateCcw, Link2, BarChart3 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { updateHabit, archiveHabit, reactivateHabit, setHabitPairing } from "../actions"
import { HabitInsightsSheet } from "./HabitInsightsSheet"

type HabitItem = {
  id: string
  name: string
  type: string | null
  time_of_day: string | null
  dosage: string | null
  frequency: string | null
  display_order: number | null
  is_active: boolean | null
  auto_source: string | null
  streak_current: number | null
  streak_longest: number | null
  quantity_target: number | null
  pair_after_habit_id: string | null
  category: string | null
  target_per_week: number | null
  reminder_time: string | null
  created_at: string | null
}

type Completion = {
  date: string
  habit_item_id: string
  was_skipped: boolean | null
  was_auto: boolean | null
  quantity_value: number | null
  skip_reason?: string | null
}

export type Lifetime = {
  total: number
  skips: number
  reasons: Record<string, number>
}

const TIME_LABELS: Record<string, string> = {
  morning: "Ochtend",
  afternoon: "Middag",
  evening: "Avond",
  anytime: "Hele dag",
}

export function HabitRow({
  habit,
  allHabits,
  completions,
  lifetime,
}: {
  habit: HabitItem
  /** Pool used by the pair_after dropdown — excludes this habit itself. */
  allHabits?: HabitItem[]
  /** 30-day completions for THIS habit only, used by the insights sheet. */
  completions?: Completion[]
  /** Lifetime totals + skip-reason histogram for the insights sheet. */
  lifetime?: Lifetime | null
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [insights, setInsights] = useState(false)
  const [pending, start] = useTransition()
  const [pairing, startPairing] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const pairCandidates = (allHabits ?? []).filter((h) => h.id !== habit.id && h.is_active)
  const anchor = allHabits?.find((h) => h.id === habit.pair_after_habit_id)

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setErr(null)
          const fd = new FormData(e.currentTarget)
          start(async () => {
            const r = await updateHabit(habit.id, fd)
            if (r?.ok === false) setErr(r.error ?? "Fout")
            else {
              setEditing(false)
              router.refresh()
            }
          })
        }}
        className="rounded-xl border border-border bg-muted/30 p-3 space-y-2"
      >
        <div className="grid gap-2 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-xs">Naam</Label>
            <Input name="name" defaultValue={habit.name} required />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <select
              name="type"
              defaultValue={habit.type ?? "habit"}
              className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              <option value="habit">Habit</option>
              <option value="supplement">Supplement</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Tijdstip</Label>
            <select
              name="time_of_day"
              defaultValue={habit.time_of_day ?? "anytime"}
              className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              <option value="morning">Ochtend</option>
              <option value="afternoon">Middag</option>
              <option value="evening">Avond</option>
              <option value="anytime">Hele dag</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Frequentie</Label>
            <select
              name="frequency"
              defaultValue={habit.frequency ?? "daily"}
              className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              <option value="daily">Dagelijks</option>
              <option value="weekdays">Werkdagen</option>
              <option value="custom">Aangepast</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Categorie</Label>
            <Input
              name="category"
              defaultValue={habit.category ?? ""}
              placeholder="bv. Gezondheid"
            />
          </div>
          <div>
            <Label className="text-xs">Doel per week</Label>
            <select
              name="target_per_week"
              defaultValue={habit.target_per_week == null ? "" : String(habit.target_per_week)}
              className="h-10 w-full rounded-md border border-border bg-card px-2 text-sm"
            >
              <option value="">Dagelijks</option>
              <option value="1">1×/week</option>
              <option value="2">2×/week</option>
              <option value="3">3×/week</option>
              <option value="4">4×/week</option>
              <option value="5">5×/week</option>
              <option value="6">6×/week</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Eigen reminder</Label>
            <Input
              name="reminder_time"
              type="time"
              defaultValue={habit.reminder_time?.slice(0, 5) ?? ""}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Dosering / notitie</Label>
            <Input
              name="dosage"
              defaultValue={habit.dosage ?? ""}
              placeholder="bv. 5g, 400mg, 8 uur"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Opslaan
          </Button>
          <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)}>
            <X size={14} /> Annuleer
          </Button>
          {err ? <span className="self-center text-xs text-bad">{err}</span> : null}
        </div>
      </form>
    )
  }

  return (
    <>
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium flex items-center gap-2">
          <span className="truncate">{habit.name}</span>
          {habit.auto_source ? <Badge variant="outline" className="text-[9px]">auto</Badge> : null}
          {!habit.is_active ? <Badge variant="outline" className="text-[9px]">gearchiveerd</Badge> : null}
        </div>
        <div className="text-xs text-muted-fg truncate">
          {habit.type} · {TIME_LABELS[habit.time_of_day ?? ""] ?? habit.time_of_day}
          {" "}· {habit.target_per_week != null ? `${habit.target_per_week}×/week` : (habit.frequency ?? "daily")}
          {habit.category ? ` · ${habit.category}` : ""}
          {habit.reminder_time ? ` · ⏰ ${habit.reminder_time.slice(0, 5)}` : ""}
          {habit.dosage ? ` · ${habit.dosage}` : ""}
        </div>

        {/* Habit-pair picker — small, inline, no modal */}
        {habit.is_active && pairCandidates.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5">
            <Link2 size={11} className="shrink-0 text-muted-fg" />
            <span className="text-[11px] text-muted-fg shrink-0">na</span>
            <select
              disabled={pairing}
              value={habit.pair_after_habit_id ?? ""}
              onChange={(e) =>
                startPairing(async () => {
                  await setHabitPairing(habit.id, e.target.value || null)
                  router.refresh()
                })
              }
              className="h-7 rounded-md border border-border bg-card px-2 text-[11px] text-muted-fg focus:text-fg focus:border-primary outline-none flex-1 min-w-0"
            >
              <option value="">— geen koppeling —</option>
              {pairCandidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {pairing ? <Loader2 size={11} className="animate-spin text-muted-fg" /> : null}
            {anchor ? (
              <Badge variant="outline" className="text-[9px] shrink-0">
                volgt {anchor.name}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted-fg tabular-nums">🔥 {habit.streak_current ?? 0}</span>
        <Button size="sm" variant="ghost" onClick={() => setInsights(true)} title="Insights">
          <BarChart3 size={13} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)} title="Wijzig">
          <Pencil size={13} />
        </Button>
        {habit.is_active ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await archiveHabit(habit.id)
                router.refresh()
              })
            }
            title="Archiveer"
          >
            <Archive size={13} />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await reactivateHabit(habit.id)
                router.refresh()
              })
            }
            title="Heractiveer"
          >
            <RotateCcw size={13} />
          </Button>
        )}
      </div>
    </div>
    <HabitInsightsSheet
      habit={habit}
      completions={completions ?? []}
      lifetime={lifetime ?? null}
      open={insights}
      onClose={() => setInsights(false)}
    />
    </>
  )
}
