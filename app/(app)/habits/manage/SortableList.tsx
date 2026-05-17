"use client"
import { useState, useTransition } from "react"
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
import { GripVertical, Loader2 } from "lucide-react"
import { HabitRow } from "./HabitRow"
import { reorderHabits } from "../actions"

type HabitItem = Parameters<typeof HabitRow>[0]["habit"]

export function SortableList({
  initialItems,
  allHabits,
}: {
  initialItems: HabitItem[]
  /** Full habit list — used by the per-row pair_after picker. */
  allHabits: HabitItem[]
}) {
  const [items, setItems] = useState(initialItems)
  const [saving, startSaving] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex((i) => i.id === active.id)
    const newIdx = items.findIndex((i) => i.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const next = arrayMove(items, oldIdx, newIdx)
    setItems(next)
    startSaving(() => reorderHabits(next.map((i) => i.id)))
  }

  return (
    <div className="space-y-2">
      {saving ? (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-fg">
          <Loader2 size={11} className="animate-spin" /> Volgorde opslaan…
        </div>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((h) => (
            <SortableRow key={h.id} habit={h} allHabits={allHabits} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableRow({ habit, allHabits }: { habit: HabitItem; allHabits: HabitItem[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
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
          <HabitRow habit={habit} allHabits={allHabits} />
        </div>
      </div>
    </div>
  )
}
