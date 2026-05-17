import { verifySession } from "@/lib/dal"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BudgetsEditor } from "./BudgetsEditor"

export const revalidate = 60

export default async function BudgetsPage() {
  const { supabase } = await verifySession()

  // Use a 3-month window to compute average actual spend per category. Gives
  // the user something to compare against when setting their first target.
  const now = new Date()
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const startISO = threeMonthsAgo.toISOString().slice(0, 10)

  const [{ data: budgets }, { data: txs }] = await Promise.all([
    supabase.from("budgets").select("category, target_eur").order("category", { ascending: true }),
    supabase
      .from("transactions")
      .select("category, amount_eur, type")
      .gte("date", startISO)
      .eq("type", "expense"),
  ])

  // Average monthly spend per category over the last 3 months — purely a
  // hint shown next to each row so the user knows what they're targeting.
  const totals = new Map<string, number>()
  for (const t of txs ?? []) {
    const k = (t.category ?? "Overig").trim() || "Overig"
    totals.set(k, (totals.get(k) ?? 0) + Number(t.amount_eur ?? 0))
  }
  const avgs = new Map<string, number>()
  for (const [cat, sum] of totals) avgs.set(cat, sum / 3)

  // Union: every category that has a budget OR has spending in the window
  const allCats = new Set<string>([
    ...(budgets ?? []).map((b) => b.category),
    ...avgs.keys(),
  ])
  const rows = [...allCats].sort((a, b) => a.localeCompare(b, "nl")).map((cat) => ({
    category: cat,
    target: budgets?.find((b) => b.category === cat)?.target_eur ?? null,
    avg: avgs.get(cat) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={[{ label: "Financiën", href: "/finance" }, { label: "Budgetten" }]} />
      <LiveHeader title="Budgetten" subtitle="Maandelijkse plafonds per categorie" />

      <Card>
        <CardHeader>
          <CardTitle>Per categorie</CardTitle>
          <CardDescription>
            Stel een plafond in. De voortgangsbalken op de Financiën-pagina
            kleuren oranje vanaf 80% en rood vanaf 100% van het plafond.
            Het gemiddelde naast iedere categorie is je werkelijke uitgave
            over de afgelopen 3 maanden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetsEditor
            initial={rows.map((r) => ({
              category: r.category,
              target: r.target == null ? null : Number(r.target),
              avg: r.avg,
            }))}
          />
          {rows.length === 0 ? (
            <p className="text-sm text-muted-fg mt-3">
              Nog geen uitgaven — importeer eerst transacties via CSV.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
