import Link from "next/link"
import { verifySession } from "@/lib/dal"
import { formatEUR } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TransactionRow } from "./TransactionRow"
import { ResetFinanceButton } from "./ResetFinanceButton"

export const dynamic = "force-dynamic"

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; q?: string; type?: string }>
}) {
  const sp = await searchParams
  const ym = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : ""
  const q = (sp.q ?? "").trim()
  const typeFilter = sp.type === "income" || sp.type === "expense" ? sp.type : ""

  const { supabase } = await verifySession()

  let qb = supabase
    .from("transactions")
    .select("id, date, description, amount_eur, type, category, subcategory")
    .order("date", { ascending: false })
    .limit(500)

  if (ym) {
    const start = `${ym}-01`
    const next = new Date(`${ym}-01T00:00:00`)
    next.setMonth(next.getMonth() + 1)
    qb = qb.gte("date", start).lt("date", next.toISOString().split("T")[0])
  }
  if (typeFilter) qb = qb.eq("type", typeFilter)
  if (q) qb = qb.or(`description.ilike.%${q}%,category.ilike.%${q}%`)

  const { data: rows } = await qb

  // Pull existing category names from a wider window for the edit-row autocomplete
  const { data: allCatRows } = await supabase
    .from("transactions")
    .select("category")
    .not("category", "is", null)
    .limit(500)
  const categories = [...new Set((allCatRows ?? []).map((r) => r.category).filter(Boolean) as string[])].sort()

  const total = (rows ?? []).reduce((a, b) => a + Number(b.amount_eur ?? 0) * (b.type === "expense" ? -1 : 1), 0)
  const expenseTotal = (rows ?? []).filter((r) => r.type === "expense").reduce((a, b) => a + Number(b.amount_eur ?? 0), 0)
  const incomeTotal = (rows ?? []).filter((r) => r.type === "income").reduce((a, b) => a + Number(b.amount_eur ?? 0), 0)

  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={[{ label: "Financiën", href: "/finance" }, { label: "Transacties" }]} />
      <LiveHeader
        title="Transacties"
        subtitle={`${(rows ?? []).length} resultaten · ${formatEUR(total)} netto`}
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-fg block mb-1">Maand</label>
              <input
                type="month"
                name="month"
                defaultValue={ym}
                className="h-9 w-full rounded-xl border border-border bg-card px-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-fg block mb-1">Type</label>
              <select
                name="type"
                defaultValue={typeFilter}
                className="h-9 w-full rounded-xl border border-border bg-card px-2 text-sm"
              >
                <option value="">Alle</option>
                <option value="expense">Uitgaven</option>
                <option value="income">Inkomen</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-fg block mb-1">Zoek</label>
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Beschrijving of categorie..."
                className="h-9 w-full rounded-xl border border-border bg-card px-3 text-sm"
              />
            </div>
            <div className="md:col-span-4 flex items-center gap-2">
              <button
                type="submit"
                className="rounded-full bg-fg text-bg px-4 py-1.5 text-xs font-semibold transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] hover:opacity-90"
              >
                Toepassen
              </button>
              {(ym || q || typeFilter) ? (
                <Link
                  href="/finance/transactions"
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-fg transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] hover:bg-muted"
                >
                  Wis filters
                </Link>
              ) : null}
              <span className="ml-auto text-xs text-muted-fg tabular-nums">
                +{formatEUR(incomeTotal)} · −{formatEUR(expenseTotal)}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Transactions table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle transacties</CardTitle>
          <CardDescription>Tap het potloodje om in te line te wijzigen. Tap de prullenbak en bevestig om te verwijderen.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-muted-fg uppercase tracking-wider">
                  <th className="px-2 py-2">Datum</th>
                  <th className="px-2 py-2">Beschrijving</th>
                  <th className="px-2 py-2">Categorie</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2 text-right">Bedrag</th>
                  <th className="px-2 py-2 text-right">Acties</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-fg">
                      Geen transacties gevonden voor deze filter.
                    </td>
                  </tr>
                ) : (
                  (rows ?? []).map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} categories={categories} />
                  ))
                )}
              </tbody>
            </table>
          </div>
          {(rows ?? []).length === 500 ? (
            <p className="px-4 py-3 text-[11px] text-muted-fg border-t border-border">
              Eerste 500 resultaten getoond — gebruik een specifieker filter om meer te zien.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader>
          <CardTitle>Reset finance</CardTitle>
          <CardDescription>
            Verwijder ALLE transacties in één keer. Onomkeerbaar — gebruik daarna een nieuwe import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetFinanceButton />
        </CardContent>
      </Card>
    </div>
  )
}
