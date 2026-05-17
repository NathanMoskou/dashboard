import Link from "next/link"
import { verifySession } from "@/lib/dal"
import { formatEUR } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { Card, CardContent } from "@/components/ui/card"

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { name } = await params
  const sp = await searchParams
  const decoded = decodeURIComponent(name)
  const ym = sp.month ?? new Date().toISOString().slice(0, 7)
  const start = `${ym}-01`
  const next = new Date(`${ym}-01T00:00:00`)
  next.setMonth(next.getMonth() + 1)
  const endDate = next.toISOString().split("T")[0]

  const { supabase } = await verifySession()
  const { data: tx } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", start)
    .lt("date", endDate)
    .or(`category.eq.${decoded},category.is.null${decoded === "Overig" ? "" : ""}`)
    .order("date", { ascending: false })

  const filtered = (tx ?? []).filter(
    (t) => (t.category ?? "Overig") === decoded && t.type === "expense",
  )
  const total = filtered.reduce((a, b) => a + Number(b.amount_eur ?? 0), 0)

  return (
    <div className="space-y-6">
      <Breadcrumb
        crumbs={[
          { label: "Financiën", href: `/finance?month=${ym}` },
          { label: decoded },
        ]}
      />
      <LiveHeader title={decoded} subtitle={`${ym} · ${formatEUR(total)} totaal`} />
      <Card accent="var(--good)">
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {filtered.map((t) => (
              <li key={t.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="text-sm font-medium">{t.description}</div>
                  <div className="text-xs text-muted-fg">
                    {new Date(t.date).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
                <span className="tabular-nums text-bad">−{formatEUR(Number(t.amount_eur ?? 0))}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
