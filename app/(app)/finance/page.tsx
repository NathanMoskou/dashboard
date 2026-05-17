import Link from "next/link"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { formatEUR, formatEURcompact } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress, Badge } from "@/components/ui/badge"
import { MetricRing } from "@/components/ui/MetricRing"
import { SpendChart } from "./SpendChart"

export const revalidate = 300

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const sp = await searchParams
  const ym = sp.month ?? new Date().toISOString().slice(0, 7)
  const start = `${ym}-01`
  const next = new Date(`${ym}-01T00:00:00`)
  next.setMonth(next.getMonth() + 1)
  const endDate = next.toISOString().split("T")[0]

  const prev = new Date(`${ym}-01T00:00:00`)
  prev.setMonth(prev.getMonth() - 1)
  const prevStart = prev.toISOString().slice(0, 10)
  const prevEnd = start

  const ytdStart = `${ym.slice(0, 4)}-01-01`

  const { supabase } = await verifySession()
  const [{ data: monthTx }, { data: prevMonthTx }, { data: ytdTx }, { data: lastSix }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .gte("date", start)
        .lt("date", endDate)
        .order("date", { ascending: false }),
      supabase
        .from("transactions")
        .select("type, amount_eur")
        .gte("date", prevStart)
        .lt("date", prevEnd),
      supabase
        .from("transactions")
        .select("type, amount_eur")
        .gte("date", ytdStart)
        .lt("date", endDate),
      supabase
        .from("transactions")
        .select("type, amount_eur, date")
        .gte(
          "date",
          new Date(new Date(start).setMonth(new Date(start).getMonth() - 5))
            .toISOString()
            .split("T")[0],
        )
        .lt("date", endDate),
    ])

  const income = sumBy(monthTx ?? [], "income")
  const expense = sumBy(monthTx ?? [], "expense")
  const net = income - expense
  const savingsRate = income === 0 ? 0 : Math.round((net / income) * 100)

  const prevIncome = sumBy(prevMonthTx ?? [], "income")
  const prevExpense = sumBy(prevMonthTx ?? [], "expense")
  const prevNet = prevIncome - prevExpense
  const incomeDelta = pctDelta(income, prevIncome)
  const expenseDelta = pctDelta(expense, prevExpense)
  const netDelta = pctDelta(net, prevNet)

  const ytdIncome = sumBy(ytdTx ?? [], "income")
  const ytdExpense = sumBy(ytdTx ?? [], "expense")
  const ytdNet = ytdIncome - ytdExpense

  const today = new Date()
  const isCurrentMonth = ym === today.toISOString().slice(0, 7)
  const monthEnd = new Date(`${ym}-01T00:00:00`)
  monthEnd.setMonth(monthEnd.getMonth() + 1)
  monthEnd.setDate(0)
  const daysInMonth = monthEnd.getDate()
  const dayCounter = isCurrentMonth ? today.getDate() : daysInMonth
  const avgDailyExpense = dayCounter > 0 ? expense / dayCounter : 0
  const projectedExpense = avgDailyExpense * daysInMonth
  const projectedNet = income - projectedExpense

  const top5 = (monthTx ?? [])
    .filter((t) => t.type === "expense")
    .sort((a, b) => Number(b.amount_eur ?? 0) - Number(a.amount_eur ?? 0))
    .slice(0, 5)

  const byDay = new Map<string, number>()
  for (const t of monthTx ?? []) {
    if (t.type !== "expense") continue
    const d = t.date.slice(8, 10)
    byDay.set(d, (byDay.get(d) ?? 0) + Number(t.amount_eur ?? 0))
  }
  const dailySeries: { day: string; cumulative: number }[] = []
  let cum = 0
  for (let d = 1; d <= dayCounter; d++) {
    const key = String(d).padStart(2, "0")
    cum += byDay.get(key) ?? 0
    dailySeries.push({ day: key, cumulative: Math.round(cum * 100) / 100 })
  }

  const byCat = new Map<string, number>()
  for (const t of monthTx ?? []) {
    if (t.type !== "expense") continue
    const k = t.category ?? "Overig"
    byCat.set(k, (byCat.get(k) ?? 0) + Number(t.amount_eur ?? 0))
  }
  const cats = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, amt]) => ({
      name,
      amt,
      pct: expense === 0 ? 0 : Math.round((amt / expense) * 100),
    }))

  type MonthRow = { month: string; income: number; expense: number; net: number }
  const monthMap = new Map<string, MonthRow>()
  for (const t of lastSix ?? []) {
    const k = t.date.slice(0, 7)
    const cur = monthMap.get(k) ?? { month: k, income: 0, expense: 0, net: 0 }
    if (t.type === "income") cur.income += Number(t.amount_eur ?? 0)
    else cur.expense += Number(t.amount_eur ?? 0)
    cur.net = cur.income - cur.expense
    monthMap.set(k, cur)
  }
  const trend = [...monthMap.values()].sort((a, b) => (a.month < b.month ? -1 : 1)).slice(-6)
  const monthlyAvgExpense =
    trend.length > 1
      ? trend.slice(0, -1).reduce((a, b) => a + b.expense, 0) / Math.max(1, trend.length - 1)
      : 0

  return (
    <div className="space-y-6">
      <LiveHeader
        title="Financiën"
        subtitle="Inkomsten, uitgaven & spaardoelen"
        action={
          <form className="flex items-center gap-2">
            <input
              type="month"
              name="month"
              defaultValue={ym}
              className="h-9 rounded-xl border border-border bg-card px-2 text-sm"
            />
            <button className="rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-muted transition-colors">
              Toon
            </button>
          </form>
        }
      />

      {/* Hero: big Net + ring trio (Bevel direction). Layout stacks on mobile
          so long EUR amounts (e.g. €-1.234,56) can't push the Spaarquote
          badge off-screen. Hero number uses clamp() for fluid sizing. */}
      <Card hero>
        <CardContent className="p-5 md:p-6 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-fg">Netto deze maand</div>
              <div
                className={`font-extrabold tabular-nums tracking-tight leading-[0.95] mt-1 break-words ${
                  net >= 0 ? "text-fg" : "text-bad"
                }`}
                style={{ fontSize: "clamp(2rem, 9vw, 3.75rem)" }}
              >
                {formatEUR(net)}
              </div>
              {netDelta != null ? (
                <div className="mt-2 text-xs text-muted-fg flex items-center gap-1">
                  {netDelta > 0 ? <TrendingUp size={11} /> : netDelta < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                  <span>{netDelta > 0 ? "+" : ""}{netDelta}% vs vorige maand</span>
                </div>
              ) : null}
            </div>
            <Badge
              variant={savingsRate >= 20 ? "good" : savingsRate >= 0 ? "warn" : "bad"}
              className="self-start md:self-end shrink-0"
            >
              Spaarquote {savingsRate}%
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border">
            <MetricRing
              value={income === 0 ? 0 : 100}
              label="Inkomen"
              display={formatEURcompact(income)}
              size={84}
              zone="good"
            />
            <MetricRing
              value={income === 0 ? 0 : Math.min(100, Math.round((expense / income) * 100))}
              label="Uitgaven"
              display={formatEURcompact(expense)}
              size={84}
              zone={expense > income ? "bad" : expense / Math.max(income, 1) > 0.8 ? "warn" : "muted"}
            />
            <MetricRing
              value={Math.max(0, Math.min(100, savingsRate))}
              label="Sparen"
              display={`${savingsRate}%`}
              size={84}
              zone={savingsRate >= 20 ? "good" : savingsRate >= 0 ? "warn" : "bad"}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm min-w-0">
            <DeltaLine label="Inkomen" value={income} delta={incomeDelta} positiveIsGood />
            <DeltaLine label="Uitgaven" value={expense} delta={expenseDelta} positiveIsGood={false} />
          </div>
        </CardContent>
      </Card>

      {isCurrentMonth ? (
        <Card>
          <CardHeader>
            <CardTitle>Run-rate &amp; projectie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-3 text-center">
              <Stat label="Per dag" value={formatEUR(avgDailyExpense)} sub={`over ${dayCounter}d`} />
              <Stat label="Verwacht eind maand" value={formatEUR(projectedExpense)} />
              <Stat
                label="Verwachte netto"
                value={formatEUR(projectedNet)}
                tone={projectedNet >= 0 ? "good" : "bad"}
              />
            </div>
            <div className="h-44">
              <SpendChart data={dailySeries} avgPerDay={avgDailyExpense} />
            </div>
            {monthlyAvgExpense > 0 ? (
              <p className="mt-2 text-xs text-muted-fg text-center">
                Gemiddelde uitgaven afgelopen maanden: {formatEUR(monthlyAvgExpense)} —
                projectie {projectedExpense > monthlyAvgExpense ? "boven" : "onder"} gemiddelde
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Year-to-date ({ym.slice(0, 4)})</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <Stat label="Inkomen" value={formatEUR(ytdIncome)} tone="good" />
          <Stat label="Uitgaven" value={formatEUR(ytdExpense)} tone="bad" />
          <Stat label="Netto" value={formatEUR(ytdNet)} tone={ytdNet >= 0 ? "good" : "bad"} />
        </CardContent>
      </Card>

      {top5.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 uitgaven deze maand</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {top5.map((t) => (
                <li key={t.id} className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.description ?? "—"}</div>
                    <div className="text-xs text-muted-fg flex gap-2">
                      <span>
                        {new Date(t.date).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {t.category ? (
                        <Badge variant="outline" className="text-[9px]">
                          {t.category}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-sm tabular-nums text-bad">
                    −{formatEUR(Number(t.amount_eur ?? 0))}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Uitgaven per categorie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cats.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="text-3xl">💸</span>
              <p className="text-sm font-medium">Geen uitgaven in {ym}</p>
              <p className="text-xs text-muted-fg">Importeer transacties via CSV om te beginnen.</p>
            </div>
          ) : (
            cats.map((c) => (
              <Link
                key={c.name}
                href={`/finance/category/${encodeURIComponent(c.name)}?month=${ym}`}
                className="block -mx-2 rounded-xl px-2 py-1 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="tabular-nums">
                    {formatEUR(c.amt)} <span className="text-muted-fg">({c.pct}%)</span>
                  </span>
                </div>
                <Progress value={c.pct} className="mt-1" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Laatste 6 maanden</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-fg uppercase">
                  <th className="py-1">Maand</th>
                  <th className="text-right">Inkomen</th>
                  <th className="text-right">Uitgaven</th>
                  <th className="text-right">Netto</th>
                  <th className="text-right">Spaarquote</th>
                </tr>
              </thead>
              <tbody>
                {trend.map((r) => {
                  const sr = r.income === 0 ? 0 : Math.round((r.net / r.income) * 100)
                  return (
                    <tr key={r.month} className="border-t border-border hover:bg-muted/40 transition-colors">
                      <td className="py-1.5">{r.month}</td>
                      <td className="text-right tabular-nums">{formatEUR(r.income)}</td>
                      <td className="text-right tabular-nums">{formatEUR(r.expense)}</td>
                      <td
                        className={`text-right tabular-nums ${
                          r.net >= 0 ? "text-good" : "text-bad"
                        }`}
                      >
                        {formatEUR(r.net)}
                      </td>
                      <td className="text-right tabular-nums text-muted-fg">{sr}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/finance/import"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition-all duration-200 ease-[var(--ease-spring)] hover:bg-muted active:scale-[0.96]"
        >
          CSV import
        </Link>
        <Link
          href="/finance/bucket"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition-all duration-200 ease-[var(--ease-spring)] hover:bg-muted active:scale-[0.96]"
        >
          Bucket list
        </Link>
      </div>
    </div>
  )
}

function sumBy(rows: { type?: string | null; amount_eur?: number | null }[], type: string) {
  return rows
    .filter((t) => t.type === type)
    .reduce((a, b) => a + Number(b.amount_eur ?? 0), 0)
}

function pctDelta(current: number, prev: number): number | null {
  if (prev === 0) return null
  return Math.round(((current - prev) / Math.abs(prev)) * 100)
}

function DeltaLine({
  label,
  value,
  delta,
  positiveIsGood,
}: {
  label: string
  value: number
  delta: number | null
  positiveIsGood: boolean
}) {
  const isUp = (delta ?? 0) > 0
  const isFlat = delta === 0 || delta === null
  const tone = isFlat
    ? "muted"
    : (isUp && positiveIsGood) || (!isUp && !positiveIsGood)
      ? "good"
      : "bad"
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown
  const deltaClass =
    tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-muted-fg"
  return (
    <div className="flex flex-col min-w-0">
      <div className="text-[11px] uppercase tracking-wider text-muted-fg">{label}</div>
      <div className="font-bold tabular-nums truncate" title={formatEUR(value)}>{formatEUR(value)}</div>
      <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${deltaClass}`}>
        <Icon size={10} className="shrink-0" />
        <span className="truncate">
          {delta == null ? "geen vergelijking" : `${isUp ? "+" : ""}${delta}% vs vorige`}
        </span>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: "good" | "bad" | "default"
}) {
  const t = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-fg"
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-fg">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${t}`}>{value}</div>
      {sub ? <div className="text-[10px] text-muted-fg">{sub}</div> : null}
    </div>
  )
}
