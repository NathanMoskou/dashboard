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
import { GripVertical, Eye, EyeOff, LayoutGrid, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { saveTodayWidgetConfig } from "./actions"
import { WIDGET_LABELS, type WidgetEntry } from "@/lib/today/widgets"

export function TodayWidgetsCard({ initial }: { initial: WidgetEntry[] }) {
  const [items, setItems] = useState<WidgetEntry[]>(initial)
  const [pending, start] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex((i) => i.key === active.id)
    const newIdx = items.findIndex((i) => i.key === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    setItems(arrayMove(items, oldIdx, newIdx))
  }

  function toggleHidden(key: string) {
    setItems((prev) => prev.map((p) => (p.key === key ? { ...p, hidden: !p.hidden } : p)))
  }

  function save() {
    start(async () => {
      await saveTodayWidgetConfig(items)
      setSavedAt(Date.now())
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid size={15} className="text-muted-fg" />
          Today indeling
        </CardTitle>
        <CardDescription>
          De Life Score-kaart bovenaan blijft altijd staan. Sleep om de rest
          te herordenen, tap op het oog om een kaart te verbergen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((entry) => (
                <SortableWidget key={entry.key} entry={entry} onToggle={toggleHidden} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className="flex items-center gap-3 pt-1">
          <Button type="button" size="sm" onClick={save} disabled={pending}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : null}
            Bewaar
          </Button>
          {savedAt ? <span className="text-[11px] text-muted-fg">Opgeslagen</span> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function SortableWidget({
  entry,
  onToggle,
}: {
  entry: WidgetEntry
  onToggle: (key: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.key,
  })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={
        "flex items-center gap-2 rounded-xl border border-border bg-card p-3 " +
        (isDragging ? "opacity-50" : "") +
        (entry.hidden ? " opacity-60" : "")
      }
    >
      <button
        type="button"
        aria-label="Sleep om te herordenen"
        {...attributes}
        {...listeners}
        className="flex items-center text-muted-fg/60 hover:text-fg cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical size={16} />
      </button>
      <span className="flex-1 text-sm font-medium">{WIDGET_LABELS[entry.key]}</span>
      <button
        type="button"
        onClick={() => onToggle(entry.key)}
        aria-label={entry.hidden ? "Toon kaart" : "Verberg kaart"}
        title={entry.hidden ? "Toon kaart" : "Verberg kaart"}
        className="p-1.5 rounded-md text-muted-fg hover:text-fg hover:bg-muted/60 transition-colors"
      >
        {entry.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </li>
  )
}
