"use client"
import { useState, useTransition } from "react"
import { Pencil, Check, X, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Textarea, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { saveJournal } from "./actions"
import { formatDate, todayISO } from "@/lib/utils"

export type JournalEntry = {
  date: string
  went_well: string | null
  was_difficult: string | null
  insight: string | null
  free_text: string | null
  day_rating: number | null
  productivity_rating: number | null
  mood_rating: number | null
}

function avgScore(entry: JournalEntry): number | null {
  const vals = [entry.day_rating, entry.productivity_rating, entry.mood_rating].filter(
    (v): v is number => v != null,
  )
  if (!vals.length) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

function scoreColor(v: number) {
  if (v <= 3) return "bg-bad text-white"
  if (v <= 6) return "bg-warn text-white"
  return "bg-good text-white"
}

export function EntriesList({ entries }: { entries: JournalEntry[] }) {
  if (!entries.length) {
    return (
      <p className="text-sm text-muted-fg">Nog geen entries — schrijf je eerste hierboven.</p>
    )
  }
  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <EntryRow key={e.date} entry={e} />
      ))}
      <div className="pt-2 text-center">
        <a
          href="/reflection/history"
          className="text-xs text-muted-fg underline underline-offset-2 hover:text-fg transition-colors"
        >
          Bekijk alle entries →
        </a>
      </div>
    </div>
  )
}

function EntryRow({ entry }: { entry: JournalEntry }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const [wentWell, setWentWell] = useState(entry.went_well ?? "")
  const [wasDifficult, setWasDifficult] = useState(entry.was_difficult ?? "")
  const [insight, setInsight] = useState(entry.insight ?? "")

  const isToday = entry.date === todayISO()
  const summary = entry.went_well || entry.insight || entry.was_difficult || "(leeg)"
  const avg = avgScore(entry)

  function save() {
    const fd = new FormData()
    fd.set("date", entry.date)
    fd.set("went_well", wentWell)
    fd.set("was_difficult", wasDifficult)
    fd.set("insight", insight)
    if (entry.day_rating != null) fd.set("day_rating", String(entry.day_rating))
    if (entry.productivity_rating != null) fd.set("productivity_rating", String(entry.productivity_rating))
    if (entry.mood_rating != null) fd.set("mood_rating", String(entry.mood_rating))
    start(async () => {
      await saveJournal(fd)
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-3 hover:bg-muted"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-fg">
            {formatDate(entry.date)}
            {isToday ? <span className="ml-2 text-good font-medium">vandaag</span> : null}
          </div>
          <div className="flex items-center gap-1.5">
            {avg != null && (
              <span
                className={cn(
                  "inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-full px-1.5 text-xs font-bold",
                  scoreColor(avg),
                )}
              >
                {avg % 1 === 0 ? avg : avg.toFixed(1)}
              </span>
            )}
            <span className="text-[10px] text-muted-fg ml-1">{open ? "−" : "+"}</span>
          </div>
        </div>
        {!open ? (
          <div className="mt-1 text-sm line-clamp-2">{summary}</div>
        ) : null}
      </button>

      {open ? (
        <div className="border-t border-border p-3 space-y-3">
          {!editing ? (
            <>
              <Section title="Wat ging goed" value={entry.went_well} />
              <Section title="Wat was moeilijk" value={entry.was_difficult} />
              <Section title="Inzicht" value={entry.insight} />
              {entry.day_rating != null && (
                <div className="flex gap-3 text-xs text-muted-fg">
                  <span>Dag <strong className={cn(entry.day_rating <= 3 ? "text-bad" : entry.day_rating <= 6 ? "text-warn" : "text-good")}>{entry.day_rating}</strong></span>
                  <span>Productiviteit <strong className={cn(entry.productivity_rating != null && entry.productivity_rating <= 3 ? "text-bad" : entry.productivity_rating != null && entry.productivity_rating <= 6 ? "text-warn" : "text-good")}>{entry.productivity_rating}</strong></span>
                  <span>Stemming <strong className={cn(entry.mood_rating != null && entry.mood_rating <= 3 ? "text-bad" : entry.mood_rating != null && entry.mood_rating <= 6 ? "text-warn" : "text-good")}>{entry.mood_rating}</strong></span>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil size={13} /> Wijzig
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Wat ging goed</Label>
                <Textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Wat was moeilijk</Label>
                <Textarea value={wasDifficult} onChange={(e) => setWasDifficult(e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Inzicht</Label>
                <Textarea value={insight} onChange={(e) => setInsight(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={save} disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" size={13} /> : <Check size={13} />}
                  Opslaan
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  <X size={13} /> Annuleer
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </Card>
  )
}

function Section({ title, value }: { title: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-fg">{title}</div>
      <p className="text-sm whitespace-pre-wrap">{value}</p>
    </div>
  )
}
