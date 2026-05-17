import { verifySession } from "@/lib/dal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEUR, minutesToHM } from "@/lib/utils"

export default async function BillablePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const sp = await searchParams
  const ym = sp.month ?? new Date().toISOString().slice(0, 7)
  const start = `${ym}-01T00:00:00`
  const next = new Date(`${ym}-01T00:00:00`)
  next.setMonth(next.getMonth() + 1)
  const end = next.toISOString()

  const { supabase } = await verifySession()
  const { data: sessions } = await supabase
    .from("focus_sessions")
    .select("duration_minutes, client_id, is_billable, clients(id, name, hourly_rate_eur)")
    .eq("is_billable", true)
    .gte("started_at", start)
    .lt("started_at", end)
    .not("ended_at", "is", null)

  const byClient = new Map<string, { name: string; minutes: number; eur: number }>()
  for (const s of sessions ?? []) {
    const c = (s as unknown as { clients?: { id: string; name: string; hourly_rate_eur: number } | null })
      .clients
    if (!c) continue
    const min = s.duration_minutes ?? 0
    const cur = byClient.get(c.id) ?? { name: c.name, minutes: 0, eur: 0 }
    cur.minutes += min
    cur.eur += (min / 60) * Number(c.hourly_rate_eur ?? 0)
    byClient.set(c.id, cur)
  }
  const totalMin = [...byClient.values()].reduce((a, b) => a + b.minutes, 0)
  const totalEur = [...byClient.values()].reduce((a, b) => a + b.eur, 0)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Billable</h1>
          <p className="text-sm text-muted-fg">{ym}</p>
        </div>
        <form className="flex items-center gap-2">
          <input
            type="month"
            name="month"
            defaultValue={ym}
            className="h-9 rounded-md border border-border bg-card px-2 text-sm"
          />
          <button className="rounded-md border border-border bg-card px-3 py-2 text-sm" type="submit">
            Toon
          </button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Totaal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-fg">Uren</div>
            <div className="text-2xl font-semibold tabular-nums">{minutesToHM(totalMin)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-fg">Bedrag</div>
            <div className="text-2xl font-semibold">{formatEUR(totalEur)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per klant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...byClient.entries()].map(([id, v]) => (
            <div
              key={id}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div className="font-medium">{v.name}</div>
              <div className="flex gap-6 text-sm">
                <span className="tabular-nums">{minutesToHM(v.minutes)}</span>
                <span className="tabular-nums">{formatEUR(v.eur)}</span>
              </div>
            </div>
          ))}
          {byClient.size === 0 ? (
            <p className="text-sm text-muted-fg">Geen billable uren deze maand.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
