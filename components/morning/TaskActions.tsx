"use client"
import { useState, useTransition } from "react"
import { Check, Calendar, MoreVertical, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { autoScheduleTask } from "@/app/(app)/focus/actions"

const BUCKETS = ["Vandaag", "Morgen", "Deze week", "Binnenkort"] as const

export function TaskActions({
  taskId,
  title,
  currentBucket,
  allowAutoSchedule,
  offsetDays,
  onMove,
  onComplete,
}: {
  taskId: string
  title: string
  currentBucket: string
  allowAutoSchedule: boolean
  offsetDays: 0 | 1
  onMove: (bucket: string) => void
  onComplete: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function move(target: string) {
    setOpen(false)
    if (target === currentBucket) return
    onMove(target)
  }
  function done() {
    setOpen(false)
    onComplete()
  }
  function autoSchedule() {
    setOpen(false)
    setMsg(null)
    start(async () => {
      const r = await autoScheduleTask({ taskId, title, offsetDays })
      if (!r.ok) setMsg(r.error ?? "kan niet inplannen")
      else router.refresh()
    })
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="p-1 text-muted-fg hover:text-fg"
        title="Acties"
      >
        {pending ? <Loader2 className="animate-spin" size={14} /> : <MoreVertical size={14} />}
      </button>
      {open ? (
        <div className="absolute right-0 top-7 z-20 w-44 rounded-md border border-border bg-card p-1 shadow-lg">
          {allowAutoSchedule ? (
            <button
              onClick={autoSchedule}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"
            >
              <Calendar size={12} /> Inplannen
            </button>
          ) : null}
          <button
            onClick={done}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"
          >
            <Check size={12} /> Markeer klaar
          </button>
          <div className="my-1 border-t border-border" />
          {BUCKETS.filter((b) => b !== currentBucket).map((b) => (
            <button
              key={b}
              onClick={() => move(b)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted"
            >
              → {b}
            </button>
          ))}
        </div>
      ) : null}
      {msg ? <span className="absolute right-0 -bottom-5 whitespace-nowrap text-[10px] text-bad">{msg}</span> : null}
    </div>
  )
}
