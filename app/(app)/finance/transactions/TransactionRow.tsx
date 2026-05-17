"use client"
import { useState, useTransition } from "react"
import { Pencil, Check, X, Trash2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn, formatEUR } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { updateTransaction, deleteTransaction } from "../actions"

type Tx = {
  id: string
  date: string
  description: string | null
  amount_eur: number
  type: string | null
  category: string | null
  subcategory: string | null
}

export function TransactionRow({
  tx,
  categories,
  selected,
  onToggleSelect,
}: {
  tx: Tx
  categories: string[]
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [date, setDate] = useState(tx.date)
  const [desc, setDesc] = useState(tx.description ?? "")
  const [amount, setAmount] = useState(String(tx.amount_eur))
  const [type, setType] = useState<"income" | "expense">((tx.type as "income" | "expense") ?? "expense")
  const [category, setCategory] = useState(tx.category ?? "")
  const [subcategory, setSubcategory] = useState(tx.subcategory ?? "")

  function save() {
    setError(null)
    const amt = Number(amount.replace(",", "."))
    if (!Number.isFinite(amt) || amt < 0) {
      setError("Bedrag moet een positief getal zijn")
      return
    }
    start(async () => {
      await updateTransaction(tx.id, {
        date,
        description: desc,
        amount_eur: amt,
        type,
        category: category.trim() || null,
        subcategory: subcategory.trim() || null,
      })
      setEditing(false)
      router.refresh()
    })
  }

  function remove() {
    start(async () => {
      await deleteTransaction(tx.id)
      router.refresh()
    })
  }

  if (editing) {
    return (
      <tr className="border-t border-border bg-muted/20 align-top">
        {/* Selection col (kept for column alignment) */}
        <td className="px-1.5 py-2"></td>
        <td className="px-1.5 py-2" colSpan={2}>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "income" | "expense")}
              className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs"
            >
              <option value="expense">Uitgave</option>
              <option value="income">Inkomen</option>
            </select>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="col-span-2 h-8 w-full rounded-lg border border-border bg-card px-2 text-xs"
              placeholder="Beschrijving"
            />
            <input
              type="text"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="col-span-2 h-7 w-full rounded-lg border border-border bg-card px-2 text-[11px] text-muted-fg"
              placeholder="Subcategorie (optioneel)"
            />
          </div>
        </td>
        <td className="px-1.5 py-2 hidden sm:table-cell">
          <input
            list="finance-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs"
            placeholder="Categorie"
          />
          <datalist id="finance-categories">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
        </td>
        <td className="px-1.5 py-2 text-right">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 w-full rounded-lg border border-border bg-card px-2 text-xs text-right tabular-nums"
          />
        </td>
        <td className="px-1.5 py-2 text-right whitespace-nowrap">
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              aria-label="Opslaan"
              className="p-1.5 rounded-lg bg-primary text-primary-fg hover:opacity-90 active:scale-[0.96] transition-all"
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
              aria-label="Annuleer"
              className="p-1.5 rounded-lg border border-border text-muted-fg hover:text-fg hover:bg-muted transition-colors"
            >
              <X size={13} />
            </button>
          </div>
          {error ? <div className="text-[10px] text-bad mt-1">{error}</div> : null}
        </td>
      </tr>
    )
  }

  const isIncome = tx.type === "income"

  return (
    <tr
      className={cn(
        "border-t border-border transition-colors",
        selected ? "bg-primary-soft/40" : "hover:bg-muted/40",
      )}
    >
      <td className="px-1.5 py-2">
        {onToggleSelect ? (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggleSelect}
            aria-label={`Selecteer ${tx.description ?? "transactie"}`}
            className="h-3.5 w-3.5 accent-primary cursor-pointer"
          />
        ) : null}
      </td>
      <td className="px-1.5 py-2 text-muted-fg whitespace-nowrap text-xs">
        <span className="sm:hidden">
          {new Date(tx.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
        </span>
        <span className="hidden sm:inline">
          {new Date(tx.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "2-digit" })}
        </span>
      </td>
      <td className="px-1.5 py-2 min-w-0">
        <div className="text-sm font-medium truncate">{tx.description ?? "—"}</div>
        {/* Mobile-only: show category + subcategory inline under description.
            On sm+ the category lives in its own column. */}
        <div className="text-[10px] text-muted-fg truncate sm:hidden">
          {[tx.category, tx.subcategory].filter(Boolean).join(" · ") || "—"}
        </div>
        {tx.subcategory ? (
          <div className="hidden sm:block text-[10px] text-muted-fg truncate">{tx.subcategory}</div>
        ) : null}
      </td>
      <td className="px-1.5 py-2 hidden sm:table-cell">
        {tx.category
          ? <Badge variant="outline" className="text-[10px] truncate max-w-full">{tx.category}</Badge>
          : <span className="text-[10px] text-muted-fg">—</span>}
      </td>
      <td className={cn("px-1.5 py-2 text-right text-sm font-semibold tabular-nums whitespace-nowrap", isIncome ? "text-good" : "text-bad")}>
        {isIncome ? "+" : "−"}{formatEUR(Number(tx.amount_eur))}
      </td>
      <td className="px-1.5 py-2 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-0.5">
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
              className="p-1.5 rounded-lg text-muted-fg hover:text-bad hover:bg-bad/10 transition-colors hidden sm:inline-flex"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
