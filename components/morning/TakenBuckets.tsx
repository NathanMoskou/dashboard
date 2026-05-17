"use client"
import { useState, useTransition, useOptimistic } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, X, Loader2, ExternalLink, GripVertical } from "lucide-react"
import type { NotionTask } from "@/lib/notion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { TaskActions } from "./TaskActions"
import { fetchTaskBody, moveTask, completeTask } from "@/app/(app)/focus/actions"

const BUCKETS: { ui: string; value: NotionTask["when"]; emoji: string; defaultOpen: boolean }[] = [
  { ui: "Vandaag",    value: "Vandaag",   emoji: "🔵", defaultOpen: true  },
  { ui: "Morgen",     value: "Morgen",    emoji: "🔴", defaultOpen: false },
  { ui: "Deze week",  value: "Deze week", emoji: "🟡", defaultOpen: false },
  { ui: "Binnenkort", value: "Binnekort", emoji: "🟣", defaultOpen: false },
]

const PRIORITY_ORDER = { "Prio 1": 1, "Prio 2": 2, "Prio 3": 3 } as const

type DragState = { id: string; bucket: string }
type DetailState = { task: NotionTask; body: string | null; loading: boolean }
type OptAction =
  | { type: "move"; id: string; when: NotionTask["when"] }
  | { type: "complete"; id: string }

function uiToWhen(uiBucket: string): NotionTask["when"] {
  return (BUCKETS.find((b) => b.ui === uiBucket)?.value ?? uiBucket) as NotionTask["when"]
}

export function TakenBuckets({ tasks }: { tasks: NotionTask[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [overBucket, setOverBucket] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailState | null>(null)

  const [optimisticTasks, applyOptimistic] = useOptimistic(
    tasks,
    (state: NotionTask[], action: OptAction) => {
      if (action.type === "move") {
        return state.map((t) => (t.id === action.id ? { ...t, when: action.when } : t))
      }
      return state.filter((t) => t.id !== action.id)
    },
  )

  function handleMove(taskId: string, uiBucket: string) {
    const when = uiToWhen(uiBucket)
    startTransition(async () => {
      applyOptimistic({ type: "move", id: taskId, when })
      await moveTask(taskId, uiBucket)
      router.refresh()
    })
  }

  function handleComplete(taskId: string) {
    startTransition(async () => {
      applyOptimistic({ type: "complete", id: taskId })
      await completeTask(taskId)
      router.refresh()
    })
  }

  function handleDragStart(task: DragState) {
    setDragging(task)
  }
  function handleDragEnd() {
    setDragging(null)
    setOverBucket(null)
  }
  function handleDragEnter(bucket: string) {
    setOverBucket(bucket)
  }
  function handleDragLeave() {
    setOverBucket(null)
  }
  function handleDrop(targetBucket: string) {
    if (!dragging || dragging.bucket === targetBucket) {
      setDragging(null)
      setOverBucket(null)
      return
    }
    const id = dragging.id
    setDragging(null)
    setOverBucket(null)
    handleMove(id, targetBucket)
  }

  async function openDetail(task: NotionTask) {
    setDetail({ task, body: null, loading: true })
    try {
      const body = await fetchTaskBody(task.id)
      setDetail((prev) =>
        prev?.task.id === task.id ? { task, body, loading: false } : prev,
      )
    } catch {
      setDetail((prev) =>
        prev?.task.id === task.id ? { task, body: "", loading: false } : prev,
      )
    }
  }

  return (
    <>
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <span>📋</span> Taken — uit Notion
        </div>
        {BUCKETS.map((b) => {
          const items = optimisticTasks
            .filter((t) => t.when === b.value)
            .sort(
              (a, z) =>
                (PRIORITY_ORDER[a.priority as keyof typeof PRIORITY_ORDER] ?? 9) -
                (PRIORITY_ORDER[z.priority as keyof typeof PRIORITY_ORDER] ?? 9),
            )
          return (
            <BucketRow
              key={b.ui}
              bucket={b.ui}
              emoji={b.emoji}
              items={items}
              defaultOpen={b.defaultOpen}
              dragging={dragging}
              isOver={overBucket === b.ui && dragging?.bucket !== b.ui}
              onOpenTask={openDetail}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragEnter={() => handleDragEnter(b.ui)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(b.ui)}
              onMove={handleMove}
              onComplete={handleComplete}
            />
          )
        })}
      </section>

      {detail && (
        <TaskDetailOverlay detail={detail} onClose={() => setDetail(null)} />
      )}
    </>
  )
}

function BucketRow({
  bucket,
  emoji,
  items,
  defaultOpen,
  dragging,
  isOver,
  onOpenTask,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDrop,
  onMove,
  onComplete,
}: {
  bucket: string
  emoji: string
  items: NotionTask[]
  defaultOpen: boolean
  dragging: DragState | null
  isOver: boolean
  onOpenTask: (task: NotionTask) => void
  onDragStart: (task: DragState) => void
  onDragEnd: () => void
  onDragEnter: () => void
  onDragLeave: () => void
  onDrop: () => void
  onMove: (taskId: string, bucket: string) => void
  onComplete: (taskId: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-colors",
        isOver ? "border-primary/60 bg-primary/5" : "border-border",
      )}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragLeave()
      }}
      onDrop={onDrop}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-card hover:bg-muted text-left"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{emoji}</span>
          {bucket}
          <Badge variant="outline" className="text-[10px] h-4 px-1.5">
            {items.length}
          </Badge>
        </div>
        {open
          ? <ChevronDown size={14} className="text-muted-fg" />
          : <ChevronRight size={14} className="text-muted-fg" />}
      </button>

      {open && (
        <div className="divide-y divide-border border-t border-border">
          {items.length === 0 ? (
            <p
              className={cn(
                "px-3 py-3 text-xs text-center transition-colors",
                isOver ? "text-primary/70" : "text-muted-fg",
              )}
            >
              {isOver ? "Loslaten om hier te plaatsen" : "Leeg"}
            </p>
          ) : (
            items.map((t) => (
              <div
                key={t.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move"
                  onDragStart({ id: t.id, bucket })
                }}
                onDragEnd={onDragEnd}
                className={cn(
                  "flex items-start gap-2 px-3 py-2.5 hover:bg-muted/40 transition-opacity",
                  dragging?.id === t.id && "opacity-40",
                )}
              >
                {/* Drag handle — desktop only */}
                <span className="hidden md:flex shrink-0 mt-1 cursor-grab text-muted-fg/40 hover:text-muted-fg active:cursor-grabbing">
                  <GripVertical size={14} />
                </span>

                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => onOpenTask(t)}
                >
                  <div className="text-sm font-medium leading-snug">{t.title}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] text-muted-fg">
                    {t.priority && (
                      <span className="font-semibold">{t.priority.replace("Prio ", "P")}</span>
                    )}
                    {t.project && <span>· {t.project}</span>}
                    {t.deadline && <span>· 📅 {t.deadline}</span>}
                  </div>
                </button>

                <TaskActions
                  taskId={t.id}
                  title={t.title}
                  currentBucket={bucket}
                  allowAutoSchedule={bucket === "Vandaag" || bucket === "Morgen"}
                  offsetDays={bucket === "Morgen" ? 1 : 0}
                  onMove={(target) => onMove(t.id, target)}
                  onComplete={() => onComplete(t.id)}
                />
              </div>
            ))
          )}

          {/* Drop hint when dragging over non-empty bucket */}
          {isOver && items.length > 0 && (
            <div className="px-3 py-2 text-xs text-center text-primary/70">
              Loslaten om hier te plaatsen
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskDetailOverlay({
  detail,
  onClose,
}: {
  detail: DetailState
  onClose: () => void
}) {
  const { task, body, loading } = detail

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-0 sm:mx-4 rounded-t-2xl sm:rounded-2xl bg-card shadow-xl max-h-[82vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold leading-snug">{task.title}</h2>
          <button
            onClick={onClose}
            className="shrink-0 p-0.5 text-muted-fg hover:text-fg mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            {task.priority && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium">{task.priority}</span>
            )}
            {task.project && (
              <span className="rounded-full bg-muted px-2.5 py-0.5">{task.project}</span>
            )}
            {task.when && (
              <span className="rounded-full bg-muted px-2.5 py-0.5">{task.when}</span>
            )}
            {task.deadline && (
              <span className="rounded-full bg-muted px-2.5 py-0.5">📅 {task.deadline}</span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-fg">
              <Loader2 className="animate-spin" size={14} />
              Notitie laden…
            </div>
          ) : body ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{body}</p>
          ) : (
            <p className="text-sm text-muted-fg italic">Geen notitie in Notion.</p>
          )}

          {task.url && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-fg hover:text-fg"
            >
              <ExternalLink size={12} /> Open in Notion
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
