"use client"
import { useState, useTransition } from "react"
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import type { CalendarEvent } from "@/lib/google"
import { dropEvent, patchEvent } from "@/app/(app)/focus/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const COLOR: Record<string, string> = {
  "2": "bg-good/70",
  "5": "bg-warn",
  "8": "bg-muted-fg",
  "9": "bg-accent",
  "11": "bg-bad",
}

export function EventRow({
  event,
  offsetDays,
}: {
  event: CalendarEvent
  offsetDays: 0 | 1
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const [summary, setSummary] = useState(event.summary)
  const [startTime, setStartTime] = useState(timeOf(event.start))
  const [endTime, setEndTime] = useState(timeOf(event.end))

  function save() {
    if (!summary.trim()) return
    const baseDay = new Date()
    baseDay.setHours(0, 0, 0, 0)
    baseDay.setDate(baseDay.getDate() + offsetDays)
    const dateStr = baseDay.toISOString().split("T")[0]
    const startISO = new Date(`${dateStr}T${startTime}:00`).toISOString()
    const endISO = new Date(`${dateStr}T${endTime}:00`).toISOString()
    start(async () => {
      const r = await patchEvent({
        eventId: event.id,
        summary: summary.trim(),
        startISO,
        endISO,
      })
      if (r.ok) {
        setEditing(false)
        router.refresh()
      }
    })
  }

  function del() {
    if (!confirm(`Verwijder "${event.summary}"?`)) return
    start(async () => {
      await dropEvent(event.id)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-2">
        <Input value={summary} onChange={(e) => setSummary(e.target.value)} className="flex-1 min-w-0" />
        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-[6rem]" />
        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-[6rem]" />
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          <X size={14} />
        </Button>
      </div>
    )
  }

  const dotClass = event.colorId ? COLOR[event.colorId] ?? "bg-muted-fg" : "bg-muted-fg"

  return (
    <div className="group flex items-center gap-3 rounded-md border border-border bg-card p-2.5 hover:bg-muted">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <span className="text-xs tabular-nums text-muted-fg w-[5.5rem] shrink-0">
        {event.allDay ? "Hele dag" : `${timeOf(event.start)}–${timeOf(event.end)}`}
      </span>
      <span className="flex-1 min-w-0 text-sm truncate">{event.summary}</span>
      {!event.allDay ? (
        <span className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-muted-fg hover:text-fg"
            title="Bewerk"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={del}
            disabled={pending}
            className="p-1 text-muted-fg hover:text-bad"
            title="Verwijder"
          >
            <Trash2 size={13} />
          </button>
        </span>
      ) : null}
    </div>
  )
}

function timeOf(iso: string): string {
  if (!iso) return ""
  if (!iso.includes("T")) return ""
  const d = new Date(iso)
  return d.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  })
}
