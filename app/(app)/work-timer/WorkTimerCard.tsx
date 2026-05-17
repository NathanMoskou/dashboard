"use client"
import { useEffect, useState, useTransition } from "react"
import { Play, Square, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { startWorkSession, stopWorkSession } from "./actions"
import type { WorkClientRow } from "@/lib/work-timer"
import { formatEUR } from "@/lib/utils"

type Active = {
  id: string
  started_at: string
  client_name: string
  is_billable: boolean
  task_description: string | null
}

export function WorkTimerCard({
  active,
  clients,
}: {
  active: Active | null
  clients: WorkClientRow[]
}) {
  if (active) return <RunningTimer active={active} clients={clients} />
  return <IdleTimer clients={clients} />
}

function IdleTimer({ clients }: { clients: WorkClientRow[] }) {
  const [pending, start] = useTransition()
  const [clientName, setClientName] = useState<string>(clients[0]?.name ?? "")
  const [billable, setBillable] = useState(true)
  const [task, setTask] = useState("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const selected = clients.find((c) => c.name === clientName)
  const canBeBillable = !!selected?.notion_client_name && (selected?.hourly_rate_eur ?? 0) > 0

  // If selection is non-billable-capable, force billable off
  useEffect(() => {
    if (!canBeBillable && billable) setBillable(false)
  }, [canBeBillable, billable])

  function go() {
    if (!clientName) return
    setError(null)
    start(async () => {
      const r = await startWorkSession({ clientName, isBillable: billable, task })
      if (r.ok) router.refresh()
      else setError(r.error ?? "kan niet starten")
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuwe sessie</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Klant</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {clients.length === 0 ? (
              <p className="text-sm text-muted-fg">
                Nog geen klanten. Voeg er één toe hieronder.
              </p>
            ) : (
              clients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClientName(c.name)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    clientName === c.name
                      ? "border-fg bg-fg text-bg"
                      : "border-border text-muted-fg"
                  }`}
                >
                  {c.name}
                  {c.hourly_rate_eur > 0 ? (
                    <span className="ml-1 opacity-70">€{c.hourly_rate_eur}</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={billable}
            disabled={!canBeBillable}
            onChange={(e) => setBillable(e.target.checked)}
          />
          Billable
          {!canBeBillable && selected ? (
            <span className="text-xs text-muted-fg">
              (geen Notion-mapping of €/u = 0)
            </span>
          ) : null}
        </label>
        <div>
          <Label>Wat ga je doen? (optioneel)</Label>
          <Input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="bv. PGS Q2 content schrijven"
          />
        </div>
        <Button onClick={go} disabled={pending || !clientName} className="w-full">
          {pending ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
          Start sessie
        </Button>
        {error ? <p className="text-xs text-bad">{error}</p> : null}
      </CardContent>
    </Card>
  )
}

function RunningTimer({
  active,
  clients,
}: {
  active: Active
  clients: WorkClientRow[]
}) {
  const [pending, start] = useTransition()
  const [now, setNow] = useState(Date.now())
  const router = useRouter()

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const elapsed = Math.max(
    0,
    Math.floor((now - new Date(active.started_at).getTime()) / 1000),
  )
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const display = `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  const c = clients.find((x) => x.name === active.client_name)
  const hourlyRate = c?.hourly_rate_eur ?? 0
  const earnings = active.is_billable ? (elapsed / 3600) * hourlyRate : 0

  function stop() {
    start(async () => {
      await stopWorkSession()
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Actief</span>
          <div className="flex gap-1.5">
            <Badge variant="default">{active.client_name}</Badge>
            {active.is_billable ? (
              <Badge variant="warn">billable · €{hourlyRate}/u</Badge>
            ) : (
              <Badge variant="outline">non-billable</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-center py-4">
          <div className="text-5xl font-semibold tabular-nums">{display}</div>
          {active.is_billable && hourlyRate > 0 ? (
            <div className="mt-2 text-sm text-muted-fg">≈ {formatEUR(earnings)}</div>
          ) : null}
        </div>
        {active.task_description ? (
          <p className="text-sm text-center text-muted-fg">{active.task_description}</p>
        ) : null}
        <Button
          variant="destructive"
          onClick={stop}
          disabled={pending}
          className="w-full"
        >
          {pending ? <Loader2 className="animate-spin" size={16} /> : <Square size={16} />}
          Stop &amp; bewaar
        </Button>
        <p className="text-[11px] text-center text-muted-fg">
          {active.is_billable
            ? "Bij stop wordt deze sessie automatisch toegevoegd aan Notion Work Tracker."
            : "Niet-billable sessies blijven alleen in de app."}
        </p>
      </CardContent>
    </Card>
  )
}
