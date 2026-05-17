"use client"
import { useState, useTransition } from "react"
import { Pencil, Check, X, Loader2, Archive, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { updateHabit, archiveHabit, reactivateHabit } from "../actions"

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
}

const TIME_LABELS: Record<string, string> = {
  morning: "Ochtend",
  afternoon: "Middag",
  evening: "Avond",
  anytime: "Hele dag",
}

export function HabitRow({ habit }: { habit: HabitItem }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

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
        className="rounded-md border border-border bg-muted/30 p-3 space-y-2"
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
            <Label className="text-xs">Volgorde</Label>
            <Input
              name="display_order"
              type="number"
              defaultValue={habit.display_order ?? 99}
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
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium flex items-center gap-2">
          {habit.name}
          {habit.auto_source ? <Badge variant="outline" className="text-[9px]">auto</Badge> : null}
          {!habit.is_active ? <Badge variant="outline" className="text-[9px]">gearchiveerd</Badge> : null}
        </div>
        <div className="text-xs text-muted-fg">
          {habit.type} · {TIME_LABELS[habit.time_of_day ?? ""] ?? habit.time_of_day}{" "}
          · {habit.frequency ?? "daily"}
          {habit.dosage ? ` · ${habit.dosage}` : ""}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-fg">🔥 {habit.streak_current ?? 0}</span>
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
  )
}
