"use client"
import { useMemo, useState, useTransition } from "react"
import { Plus, Loader2, Check, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { addWorkEntry, removeWorkEntry } from "@/app/(app)/work-timer/actions"
import { formatEUR } from "@/lib/utils"
import type { WorkEntry } from "@/lib/work-tracker"
import type { WorkClientRow } from "@/lib/work-timer"
import { cn } from "@/lib/utils"

type Range = "today" | "week" | "month" | "all"
const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Vandaag" },
  { key: "week", label: "Deze week" },
  { key: "month", label: "Deze maand" },
  { key: "all", label: "Alles (60d)" },
]

export function WorkTracker({
  entries,
  clients,
}: {
  entries: WorkEntry[]
  clients: WorkClientRow[]
}) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<Range>("month")
  const [activeClients, setActiveClients] = useState<Set<string>>(new Set())
  const today = new Date().toISOString().split("T")[0]
  const notionClients = clients.filter((c) => c.notion_client_name)

  const clientsInData = useMemo(() => {
    const s = new Set<string>()
    for (const e of entries) if (e.client) s.add(e.client)
    return [...s].sort()
  }, [entries])

  const filtered = useMemo(() => {
    const now = new Date()
    let from: Date | null = null
    if (range === "today") {
      from = new Date(now)
      from.setHours(0, 0, 0, 0)
    } else if (range === "week") {
      from = new Date(now)
      const day = from.getDay()
      const diff = day === 0 ? -6 : 1 - day
      from.setDate(from.getDate() + diff)
      from.setHours(0, 0, 0, 0)
    } else if (range === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
    }
    return entries.filter((e) => {
      if (activeClients.size > 0 && (!e.client || !activeClients.has(e.client))) return false
      if (!from) return true
      if (!e.day) return false
      return new Date(e.day + "T00:00:00").getTime() >= from.getTime()
    })
  }, [entries, range, activeClients])

  const totalHours = filtered.reduce((a, e) => a + (e.hours ?? 0), 0)
  const totalEarnings = filtered.reduce((a, e) => a + (e.earnings ?? 0), 0)
  const byClient = new Map<string, { hours: number; earnings: number }>()
  for (const e of filtered) {
    const k = e.client ?? "—"
    const cur = byClient.get(k) ?? { hours: 0, earnings: 0 }
    cur.hours += e.hours ?? 0
    cur.earnings += e.earnings ?? 0
    byClient.set(k, cur)
  }

  function toggleClient(c: string) {
    setActiveClients((prev) => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>⏱</span> Work Tracker
          <span className="text-xs font-normal text-muted-fg">
            · {filtered.length} van {entries.length}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          <Plus size={14} /> Nieuwe entry
        </Button>
      </div>

      {open ? <NewEntryForm today={today} clients={notionClients} onDone={() => setOpen(false)} /> : null}

      {entries.length === 0 ? (
        <Card className="p-4 text-sm text-muted-fg">
          Nog geen Work Tracker entries (laatste 60 dagen).
        </Card>
      ) : (
        <Card className="p-3">
          {/* Filter row */}
          <div className="space-y-2 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    range === r.key
                      ? "border-fg bg-fg text-bg"
                      : "border-border text-muted-fg hover:bg-muted",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {clientsInData.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 items-center">
                {clientsInData.map((c) => {
                  const on = activeClients.has(c)
                  return (
                    <button
                      key={c}
                      onClick={() => toggleClient(c)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px]",
                        on
                          ? "border-accent bg-accent/10 text-fg"
                          : "border-border text-muted-fg hover:bg-muted",
                      )}
                    >
                      {c}
                    </button>
                  )
                })}
                {activeClients.size > 0 ? (
                  <button
                    onClick={() => setActiveClients(new Set())}
                    className="text-[11px] text-muted-fg hover:text-fg ml-1 underline-offset-4 hover:underline"
                  >
                    <X size={11} className="inline" /> reset
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3 md:grid-cols-4">
            <Stat label="Uren" value={totalHours.toFixed(1)} />
            <Stat label="Verdiend" value={formatEUR(totalEarnings)} />
            <Stat label="Klanten" value={String(byClient.size)} />
            <Stat label="Entries" value={String(filtered.length)} />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-fg py-3 text-center">Geen entries in deze selectie.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </ul>
          )}
        </Card>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-fg">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
    </div>
  )
}

function EntryRow({ entry }: { entry: WorkEntry }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  function del() {
    if (!confirm(`Verwijder "${entry.name}"?`)) return
    start(async () => {
      await removeWorkEntry(entry.id)
      router.refresh()
    })
  }
  return (
    <li className="flex items-center justify-between py-2 group">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{entry.name}</div>
        <div className="text-xs text-muted-fg flex flex-wrap gap-1.5 mt-0.5">
          {entry.day ? <span>{entry.day}</span> : null}
          {entry.client ? (
            <>
              <span>·</span>
              <span>{entry.client}</span>
            </>
          ) : null}
          {entry.type ? (
            <Badge variant="outline" className="text-[9px]">
              {entry.type}
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm tabular-nums">{(entry.hours ?? 0).toFixed(1)}u</div>
        {entry.earnings != null ? (
          <div className="text-[10px] text-muted-fg tabular-nums">
            {formatEUR(entry.earnings)}
          </div>
        ) : null}
      </div>
      <button
        onClick={del}
        disabled={pending}
        className="ml-2 p-1 text-muted-fg opacity-0 group-hover:opacity-100 hover:text-bad transition-opacity"
        title="Verwijder"
      >
        {pending ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
      </button>
    </li>
  )
}

function NewEntryForm({
  today,
  clients,
  onDone,
}: {
  today: string
  clients: WorkClientRow[]
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <Card className="p-3 mb-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          const fd = new FormData(e.currentTarget)
          start(async () => {
            const r = await addWorkEntry({
              name: String(fd.get("name")),
              client: String(fd.get("client")),
              type: (String(fd.get("type")) as "Meeting" | "Uren") || "Uren",
              hours: Number(fd.get("hours")),
              day: String(fd.get("day")),
              notes: String(fd.get("notes") ?? "") || null,
              hourlyRate: fd.get("hourlyRate") ? Number(fd.get("hourlyRate")) : null,
            })
            if (r.ok) {
              onDone()
              router.refresh()
            } else {
              setError(r.error ?? "Onbekende fout")
            }
          })
        }}
        className="space-y-2"
      >
        <Input name="name" placeholder="Wat heb je gedaan?" required />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <select
            name="client"
            className="h-10 rounded-md border border-border bg-card px-2 text-sm"
            required
          >
            <option value="">— klant —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.notion_client_name!}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            name="type"
            className="h-10 rounded-md border border-border bg-card px-2 text-sm"
            defaultValue="Uren"
          >
            <option>Uren</option>
            <option>Meeting</option>
          </select>
          <Input name="hours" type="number" step="0.25" placeholder="Uren" required />
          <Input name="day" type="date" defaultValue={today} required />
        </div>
        <Input name="notes" placeholder="Notitie (optioneel)" />
        <Input
          name="hourlyRate"
          type="number"
          step="0.01"
          placeholder="Uurtarief (optioneel — anders auto)"
        />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Toevoegen
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Annuleer
          </Button>
          {error ? <span className="text-xs text-bad self-center">{error}</span> : null}
        </div>
      </form>
    </Card>
  )
}
