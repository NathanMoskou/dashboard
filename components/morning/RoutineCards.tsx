"use client"
import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { X, RotateCcw, Loader2, CalendarPlus, RefreshCw, Settings2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { RoutineBlock } from "@/lib/morning/routines"
import { planRoutine } from "@/app/(app)/focus/actions"
import { useRouter } from "next/navigation"

const STORAGE_KEY = "lifeos.dismissedRoutines"

export function RoutineCards({
  blocks,
  offsetDays,
}: {
  /** Per-user routine blocks loaded server-side. */
  blocks: RoutineBlock[]
  offsetDays?: 0 | 1
}) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [pending, start] = useTransition()
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setDismissed(new Set(JSON.parse(raw)))
    } catch {}
  }, [])

  function persist(next: Set<string>) {
    setDismissed(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    } catch {}
  }

  function toggleDismiss(id: string) {
    const next = new Set(dismissed)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    persist(next)
  }

  function plan(offsetDays: 0 | 1) {
    setStatus(null)
    start(async () => {
      const r = await planRoutine({ offsetDays, skipIds: [...dismissed] })
      const created = r.created.length
      const skipped = blocks.length - created - dismissed.size
      setStatus(
        `${offsetDays === 0 ? "Vandaag" : "Morgen"}: ${created} ingepland${
          skipped > 0 ? `, ${skipped} overgeslagen (conflict)` : ""
        }${dismissed.size > 0 ? `, ${dismissed.size} ✕` : ""}.`,
      )
      router.refresh()
    })
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
          Routine
        </div>
        <Link
          href="/focus/routine"
          className="inline-flex items-center gap-1 text-xs text-muted-fg hover:text-fg transition-colors"
        >
          <Settings2 size={11} /> Beheer
        </Link>
      </div>
      {blocks.length === 0 ? (
        <Card className="p-4 text-sm text-muted-fg">
          Nog geen routine. <Link href="/focus/routine" className="text-primary hover:underline">Maak er één aan</Link>.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {blocks.map((b) => {
            const isDismissed = dismissed.has(b.id)
            return (
              <Card
                key={b.id}
                className={`p-3 transition-opacity ${isDismissed ? "opacity-40" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm">{b.title}</div>
                  <button
                    onClick={() => toggleDismiss(b.id)}
                    className="-mr-1 -mt-1 p-1 text-muted-fg hover:text-fg"
                    title={isDismissed ? "Weer aanzetten" : "Overslaan"}
                  >
                    {isDismissed ? <RotateCcw size={12} /> : <X size={12} />}
                  </button>
                </div>
                <div className="mt-1 text-[11px] text-muted-fg tabular-nums">
                  {`${String(b.startH).padStart(2, "0")}:${String(b.startM).padStart(2, "0")} – ${String(b.endH).padStart(2, "0")}:${String(b.endM).padStart(2, "0")}`}
                </div>
              </Card>
            )
          })}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {(offsetDays === undefined || offsetDays === 0) && blocks.length > 0 && (
          <Button size="sm" onClick={() => plan(0)} disabled={pending} variant="outline">
            {pending ? <Loader2 className="animate-spin" size={14} /> : <CalendarPlus size={14} />}
            Plan routine vandaag
          </Button>
        )}
        {(offsetDays === undefined || offsetDays === 1) && blocks.length > 0 && (
          <Button size="sm" onClick={() => plan(1)} disabled={pending} variant="outline">
            {pending ? <Loader2 className="animate-spin" size={14} /> : <CalendarPlus size={14} />}
            Plan routine morgen
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => router.refresh()}>
          <RefreshCw size={14} /> Vernieuwen
        </Button>
      </div>
      {status ? <p className="mt-2 text-xs text-muted-fg">{status}</p> : null}
    </section>
  )
}
