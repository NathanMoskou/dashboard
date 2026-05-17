"use client"
import { useState, useTransition } from "react"
import { Check, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { saveJournal } from "./actions"

function ratingColor(v: number) {
  if (v <= 3) return "text-bad"
  if (v <= 6) return "text-warn"
  return "text-good"
}

function RatingSlider({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm">{label}</span>
        <span className={cn("text-xl font-bold tabular-nums w-7 text-right", ratingColor(value))}>
          {value}
        </span>
      </div>
      <input
        type="range"
        name={name}
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-fg mt-0.5 select-none">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  )
}

export type JournalExisting = {
  went_well?: string | null
  was_difficult?: string | null
  insight?: string | null
  day_rating?: number | null
  productivity_rating?: number | null
  mood_rating?: number | null
}

export function JournalForm({
  date,
  existing,
}: {
  date: string
  existing?: JournalExisting | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [submitted, setSubmitted] = useState(existing != null)
  const [wentWell, setWentWell] = useState(existing?.went_well ?? "")
  const [wasDifficult, setWasDifficult] = useState(existing?.was_difficult ?? "")
  const [insight, setInsight] = useState(existing?.insight ?? "")
  const [dayRating, setDayRating] = useState(existing?.day_rating ?? 5)
  const [prodRating, setProdRating] = useState(existing?.productivity_rating ?? 5)
  const [moodRating, setMoodRating] = useState(existing?.mood_rating ?? 5)

  function save() {
    const fd = new FormData()
    fd.set("date", date)
    fd.set("went_well", wentWell)
    fd.set("was_difficult", wasDifficult)
    fd.set("insight", insight)
    fd.set("day_rating", String(dayRating))
    fd.set("productivity_rating", String(prodRating))
    fd.set("mood_rating", String(moodRating))
    start(async () => {
      await saveJournal(fd)
      setSubmitted(true)
      router.refresh()
    })
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-good/20">
            <Check size={28} className="text-good" />
          </div>
          <p className="font-semibold text-base">Reflectie vandaag ingeleverd</p>
          <p className="text-xs text-muted-fg text-center">
            Bekijk of bewerk hieronder bij <span className="font-medium text-fg">recente entries</span>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vandaag</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-4 rounded-xl bg-muted/40 p-4">
          <RatingSlider
            label="Hoe rate je deze dag?"
            name="day_rating"
            value={dayRating}
            onChange={setDayRating}
          />
          <RatingSlider
            label="Hoe productief ben je geweest?"
            name="productivity_rating"
            value={prodRating}
            onChange={setProdRating}
          />
          <RatingSlider
            label="Gemoedstoestand"
            name="mood_rating"
            value={moodRating}
            onChange={setMoodRating}
          />
        </div>

        <div className="space-y-3">
          <div>
            <Label>Wat ging goed vandaag?</Label>
            <Textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Wat was moeilijk vandaag?</Label>
            <Textarea value={wasDifficult} onChange={(e) => setWasDifficult(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Één inzicht of gedachte</Label>
            <Textarea value={insight} onChange={(e) => setInsight(e.target.value)} rows={2} />
          </div>
        </div>

        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
          Bewaar
        </Button>
      </CardContent>
    </Card>
  )
}
