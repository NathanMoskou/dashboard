"use client"
import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronUp, ChevronDown, ChevronsUpDown, Trash2, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { TransactionRow } from "./TransactionRow"
import { deleteTransactions } from "../actions"

type SortKey = "date" | "description" | "category" | "type" | "amount_eur"
type SortDir = "asc" | "desc"

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  date: "desc",
  amount_eur: "desc",
  description: "asc",
  category: "asc",
  type: "asc",
}

type Tx = {
  id: string
  date: string
  description: string | null
  amount_eur: number
  type: string | null
  category: string | null
  subcategory: string | null
}

export function TransactionsTable({
  rows,
  categories,
  sort,
  dir,
  params,
}: {
  rows: Tx[]
  categories: string[]
  sort: SortKey
  dir: SortDir
  params: { month?: string; q?: string; type?: string }
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const allIds = useMemo(() => rows.map((r) => r.id), [rows])
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0 && !allSelected

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(allIds))
  }

  function clear() {
    setSelected(new Set())
    setConfirming(false)
  }

  function deleteSelected() {
    setError(null)
    const ids = [...selected]
    if (!ids.length) return
    start(async () => {
      const r = await deleteTransactions(ids)
      if (!r.ok) setError(r.error ?? "Onbekende fout")
      else {
        clear()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      {/* Batch action bar — visible only when at least one row is selected */}
      {selected.size > 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm flex-wrap pop-in">
          <div className="flex items-center gap-2">
            <span className="font-semibold tabular-nums">{selected.size}</span>
            <span className="text-muted-fg">geselecteerd</span>
          </div>
          <div className="flex items-center gap-2">
            {confirming ? (
              <>
                <button
                  type="button"
                  onClick={deleteSelected}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-full bg-bad text-white px-3 py-1 text-xs font-semibold transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  Bevestig verwijderen ({selected.size})
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  aria-label="Annuleer"
                  className="p-1.5 rounded-lg text-muted-fg hover:text-fg hover:bg-muted transition-colors"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-bad/40 text-bad px-3 py-1 text-xs font-medium transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] hover:bg-bad/10"
                >
                  <Trash2 size={11} />
                  Verwijder
                </button>
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs text-muted-fg hover:text-fg underline-offset-2 hover:underline"
                >
                  Wis selectie
                </button>
              </>
            )}
          </div>
          {error ? <p className="basis-full text-xs text-bad">{error}</p> : null}
        </div>
      ) : null}

      <div>
        {/* No overflow-x-auto — table fits via column hides, tight padding,
            and a flex-grow description column that truncates long text. */}
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-left text-[10px] text-muted-fg uppercase tracking-wider">
              <th className="w-8 px-1.5 py-2">
                <input
                  type="checkbox"
                  aria-label="Selecteer alle"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 accent-primary cursor-pointer"
                />
              </th>
              <SortHeader field="date" label="Datum" current={sort} dir={dir} params={params} widthClass="w-[64px] sm:w-[88px]" />
              <SortHeader field="description" label="Beschrijving" current={sort} dir={dir} params={params} />
              <SortHeader field="category" label="Categorie" current={sort} dir={dir} params={params} className="hidden sm:table-cell" widthClass="sm:w-[110px]" />
              <SortHeader field="amount_eur" label="Bedrag" align="right" current={sort} dir={dir} params={params} widthClass="w-[88px] sm:w-[100px]" />
              <th className="w-[40px] sm:w-[68px] px-1.5 py-2 text-right">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-fg">
                  Geen transacties gevonden voor deze filter.
                </td>
              </tr>
            ) : (
              rows.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  categories={categories}
                  selected={selected.has(tx.id)}
                  onToggleSelect={() => toggle(tx.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SortHeader({
  field,
  label,
  align,
  current,
  dir,
  params,
  className,
  widthClass,
}: {
  field: SortKey
  label: string
  align?: "left" | "right"
  current: SortKey
  dir: SortDir
  params: { month?: string; q?: string; type?: string }
  className?: string
  widthClass?: string
}) {
  const isActive = current === field
  const nextDir: SortDir = isActive
    ? (dir === "desc" ? "asc" : "desc")
    : DEFAULT_DIR[field]

  const search = new URLSearchParams()
  if (params.month) search.set("month", params.month)
  if (params.q) search.set("q", params.q)
  if (params.type) search.set("type", params.type)
  search.set("sort", field)
  search.set("dir", nextDir)
  const href = `/finance/transactions?${search.toString()}`

  return (
    <th className={cn("px-1.5 py-2 truncate", align === "right" && "text-right", widthClass, className)}>
      <Link
        href={href}
        scroll={false}
        className={cn(
          "inline-flex items-center gap-1 hover:text-fg transition-colors",
          align === "right" && "flex-row-reverse",
          isActive && "text-fg",
        )}
      >
        {label}
        {isActive
          ? (dir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
          : <ChevronsUpDown size={11} className="opacity-40" />}
      </Link>
    </th>
  )
}

