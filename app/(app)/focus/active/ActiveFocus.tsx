"use client"
import { useEffect, useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { stopFocus } from "../actions"

export function ActiveFocus({
  sessionId,
  task,
  type,
  isBillable,
  clientName,
  hourlyRate,
  startedAt,
  hasNotionTask,
}: {
  sessionId: string
  task: string
  type: string
  isBillable: boolean
  clientName: string | null
  hourlyRate: number | null
  startedAt: string
  hasNotionTask: boolean
}) {
  const [now, setNow] = useState(Date.now())
  const [notes, setNotes] = useState("")
  const [taskDone, setTaskDone] = useState(false)
  const [pending, start] = useTransition()

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const display = `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  const billableEur = isBillable && hourlyRate ? (elapsed / 3600) * hourlyRate : 0

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{task}</h1>
        <div className="flex flex-wrap gap-2 text-xs text-muted-fg mt-1">
          <Badge variant="outline">{type}</Badge>
          {isBillable ? (
            <Badge variant="warn">{clientName ?? "billable"}</Badge>
          ) : (
            <Badge variant="default">niet billable</Badge>
          )}
        </div>
      </header>

      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-xs uppercase tracking-wider text-muted-fg">Gewerkt</div>
          <div className="text-5xl font-semibold tabular-nums">{display}</div>
          {isBillable && hourlyRate ? (
            <div className="mt-2 text-sm text-muted-fg">
              ≈ €{billableEur.toFixed(2)} ({hourlyRate} €/u)
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stop sessie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notities (optioneel)"
          />
          {hasNotionTask ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={taskDone}
                onChange={(e) => setTaskDone(e.target.checked)}
              />
              Markeer Notion-taak als &ldquo;Klaar&rdquo;
            </label>
          ) : null}
          <Button
            variant="good"
            disabled={pending}
            className="w-full"
            onClick={() => start(() => stopFocus({ sessionId, notes: notes || null, taskDone }))}
          >
            Stop &amp; bewaar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
