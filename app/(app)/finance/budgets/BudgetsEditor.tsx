"use client"
import { useState, useTransition } from "react"
import { Check, Trash2, Plus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { formatEUR } from "@/lib/utils"
import { upsertBudget, deleteBudget } from "../actions"

export type BudgetRow = {
  category: string
  /** Current target (EUR) — null if no budget set yet for this category. */
  target: number | null
  /** Average monthly spend over the lookback window, EUR. */
  avg: number
}

export function BudgetsEditor({ initial }: { initial: BudgetRow[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [, start] = useTransition()
  const [newCat, setNewCat] = useState("")
  const [newAmt, setNewAmt] = useState("")

  function saveRow(category: string, target: number | null) {
    if (target == null) return
    setPendingKey(category)
    start(async () => {
      const r = await upsertBudget(category, target)
      setPendingKey(null)
      if (r.ok) router.refresh()
    })
  }

  function clearRow(category: string) {
    setPendingKey(category)
    start(async () => {
      const r = await deleteBudget(category)
      setPendingKey(null)
      if (r.ok) {
        setRows((prev) => prev.map((p) => (p.category === category ? { ...p, target: null } : p)))
        router.refresh()
      }
    })
  }

  function addNew(e: React.FormEvent) {
    e.preventDefault()
    const cat = newCat.trim()
    const amt = Number(newAmt)
    if (!cat || !Number.isFinite(amt) || amt < 0) return
    setPendingKey("__new__")
    start(async () => {
      const r = await upsertBudget(cat, amt)
      setPendingKey(null)
      if (r.ok) {
        setNewCat("")
        setNewAmt("")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <BudgetRowEditor
          key={row.category}
          row={row}
          pending={pendingKey === row.category}
          onSave={(t) => saveRow(row.category, t)}
          onClear={() => clearRow(row.category)}
        />
      ))}

      {/* Add a new category that isn't in the existing list yet */}
      <form
        onSubmit={addNew}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-border bg-muted/30 p-3"
      >
        <div className="flex-1 min-w-[150px]">
          <label className="text-[10px] uppercase tracking-wider text-muted-fg">Nieuwe categorie</label>
          <Input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="bv. Vervoer"
          />
        </div>
        <div className="w-32">
          <label className="text-[10px] uppercase tracking-wider text-muted-fg">Plafond (EUR)</label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={newAmt}
            onChange={(e) => setNewAmt(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <Button type="submit" size="sm" disabled={pendingKey === "__new__"}>
          {pendingKey === "__new__" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Toevoegen
        </Button>
      </form>
    </div>
  )
}

function BudgetRowEditor({
  row,
  pending,
  onSave,
  onClear,
}: {
  row: BudgetRow
  pending: boolean
  onSave: (t: number) => void
  onClear: () => void
}) {
  const [val, setVal] = useState<string>(row.target == null ? "" : String(row.target))
  const numeric = Number(val)
  const dirty = (row.target == null && val.trim() !== "") || (row.target != null && Number(val) !== Number(row.target))
  const valid = val.trim() !== "" && Number.isFinite(numeric) && numeric >= 0

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3">
      <div className="flex-1 min-w-[140px]">
        <div className="text-sm font-medium">{row.category}</div>
        <div className="text-[11px] text-muted-fg">
          Gem. {formatEUR(row.avg)} / maand
        </div>
      </div>
      <div className="w-32">
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="0,00"
        />
      </div>
      <Button
        size="sm"
        type="button"
        disabled={!dirty || !valid || pending}
        onClick={() => onSave(numeric)}
        variant="outline"
        title="Opslaan"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </Button>
      {row.target != null ? (
        <Button
          size="sm"
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onClear}
          title="Verwijder plafond"
        >
          <Trash2 size={14} />
        </Button>
      ) : null}
    </div>
  )
}
