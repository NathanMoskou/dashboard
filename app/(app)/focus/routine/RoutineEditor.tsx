"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Pencil, Trash2, Plus, Check, X, Loader2 } from "lucide-react"
import type { RoutineBlock } from "@/lib/morning/routines"
import { cn } from "@/lib/utils"
import {
  addRoutineBlock,
  updateRoutineBlock,
  deleteRoutineBlock,
  reorderRoutineBlocks,
} from "./actions"

// Google Calendar color palette (matches lib/morning/routines.ts comment)
const COLORS: { id: string; label: string; hex: string }[] = [
  { id: "2", label: "Sage", hex: "#7AE7BF" },
  { id: "5", label: "Banana", hex: "#FBD75B" },
  { id: "8", label: "Graphite", hex: "#E1E1E1" },
  { id: "9", label: "Blueberry", hex: "#5484ED" },
  { id: "11", label: "Tomato", hex: "#DC2127" },
]

export function RoutineEditor({ initialBlocks }: { initialBlocks: RoutineBlock[] }) {
  const router = useRouter()
  const [blocks, setBlocks] = useState(initialBlocks)
  const [saving, startSaving] = useTransition()
  const [adding, setAdding] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex((b) => b.id === active.id)
    const newIdx = blocks.findIndex((b) => b.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const next = arrayMove(blocks, oldIdx, newIdx)
    setBlocks(next)
    startSaving(() => reorderRoutineBlocks(next.map((b) => b.id)))
  }

  return (
    <div className="space-y-3">
      {saving ? (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-fg">
          <Loader2 size={11} className="animate-spin" /> Opslaan…
        </div>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-fg py-6 text-center">Nog geen routine-blokken — voeg er hieronder een toe.</p>
          ) : (
            blocks.map((b) => (
              <SortableRow
                key={b.id}
                block={b}
                onChange={(next) => setBlocks((prev) => prev.map((p) => (p.id === next.id ? next : p)))}
                onDelete={(id) => {
                  setBlocks((prev) => prev.filter((p) => p.id !== id))
                  router.refresh()
                }}
              />
            ))
          )}
        </SortableContext>
      </DndContext>

      {adding ? (
        <AddRow
          onDone={() => {
            setAdding(false)
            router.refresh()
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-fg text-bg px-4 py-2 text-sm font-semibold transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] hover:opacity-90"
        >
          <Plus size={14} /> Nieuw blok
        </button>
      )}
    </div>
  )
}

function SortableRow({
  block,
  onChange,
  onDelete,
}: {
  block: RoutineBlock
  onChange: (next: RoutineBlock) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-50" : ""}
    >
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          aria-label="Sleep om te herordenen"
          {...attributes}
          {...listeners}
          className="flex items-center px-1 rounded-md text-muted-fg/60 hover:text-fg cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex-1">
          <BlockRow block={block} onChange={onChange} onDelete={onDelete} />
        </div>
      </div>
    </div>
  )
}

function BlockRow({
  block,
  onChange,
  onDelete,
}: {
  block: RoutineBlock
  onChange: (next: RoutineBlock) => void
  onDelete: (id: string) => void
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState(block.title)
  const [startTime, setStartTime] = useState(`${pad(block.startH)}:${pad(block.startM)}`)
  const [endTime, setEndTime] = useState(`${pad(block.endH)}:${pad(block.endM)}`)
  const [colorId, setColorId] = useState(block.colorId)

  function save() {
    setError(null)
    const [sh, sm] = startTime.split(":").map(Number)
    const [eh, em] = endTime.split(":").map(Number)
    if (![sh, sm, eh, em].every(Number.isFinite)) {
      setError("Tijd ongeldig")
      return
    }
    if (!title.trim()) {
      setError("Titel verplicht")
      return
    }
    start(async () => {
      const r = await updateRoutineBlock(block.id, {
        title,
        startH: sh,
        startM: sm,
        endH: eh,
        endM: em,
        colorId,
      })
      if (!r.ok) setError(r.error ?? "Onbekende fout")
      else {
        onChange({ id: block.id, title, startH: sh, startM: sm, endH: eh, endM: em, colorId })
        setEditing(false)
        router.refresh()
      }
    })
  }

  function remove() {
    start(async () => {
      const r = await deleteRoutineBlock(block.id)
      if (!r.ok) setError(r.error ?? "Onbekende fout")
      else onDelete(block.id)
    })
  }

  const color = COLORS.find((c) => c.id === block.colorId)

  if (editing) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titel (bv. 🚶 Wandeling + water)"
          className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-fg block mb-1">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-card px-2 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-fg block mb-1">Eind</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-card px-2 text-sm"
            />
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-fg mb-1">Kleur in Google Calendar</div>
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColorId(c.id)}
                title={c.label}
                aria-label={c.label}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-all",
                  colorId === c.id ? "border-fg scale-110" : "border-transparent hover:scale-105",
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-fg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] hover:opacity-90 disabled:opacity-60"
          >
            {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Bewaar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:text-fg hover:bg-muted"
          >
            <X size={12} /> Annuleer
          </button>
          {error ? <span className="text-xs text-bad">{error}</span> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ background: color?.hex ?? "var(--muted-fg)" }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{block.title}</div>
          <div className="text-[11px] text-muted-fg tabular-nums">
            {pad(block.startH)}:{pad(block.startM)} – {pad(block.endH)}:{pad(block.endM)}
            {color ? <span className="ml-2 opacity-70">· {color.label}</span> : null}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Wijzig"
          className="p-1.5 rounded-lg text-muted-fg hover:text-fg hover:bg-muted transition-colors"
        >
          <Pencil size={13} />
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="px-2 py-1 rounded-lg bg-bad text-white text-[11px] font-semibold hover:opacity-90 transition-opacity"
            >
              {pending ? <Loader2 size={11} className="animate-spin" /> : "OK"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              aria-label="Annuleer verwijder"
              className="p-1.5 rounded-lg text-muted-fg hover:text-fg hover:bg-muted transition-colors"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Verwijder"
            className="p-1.5 rounded-lg text-muted-fg hover:text-bad hover:bg-bad/10 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      {error ? <div className="basis-full text-xs text-bad mt-1">{error}</div> : null}
    </div>
  )
}

function AddRow({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [colorId, setColorId] = useState("9")
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    const [sh, sm] = startTime.split(":").map(Number)
    const [eh, em] = endTime.split(":").map(Number)
    if (!title.trim()) {
      setError("Titel verplicht")
      return
    }
    if (![sh, sm, eh, em].every(Number.isFinite)) {
      setError("Tijd ongeldig")
      return
    }
    start(async () => {
      const r = await addRoutineBlock({ title, startH: sh, startM: sm, endH: eh, endM: em, colorId })
      if (!r.ok) setError(r.error ?? "Onbekende fout")
      else onDone()
    })
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary-soft/30 p-3 space-y-2">
      <div className="text-xs font-semibold text-primary uppercase tracking-wider">Nieuw routine-blok</div>
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titel (bv. 🧘 Meditatie)"
        className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-fg block mb-1">Start</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-card px-2 text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-fg block mb-1">Eind</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-9 w-full rounded-xl border border-border bg-card px-2 text-sm"
          />
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-fg mb-1">Kleur</div>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColorId(c.id)}
              title={c.label}
              aria-label={c.label}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-all",
                colorId === c.id ? "border-fg scale-110" : "border-transparent hover:scale-105",
              )}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-fg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] hover:opacity-90 disabled:opacity-60"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Voeg toe
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:text-fg hover:bg-muted"
        >
          Annuleer
        </button>
        {error ? <span className="text-xs text-bad">{error}</span> : null}
      </div>
    </div>
  )
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}
