import Link from "next/link"
import { verifySession } from "@/lib/dal"
import { formatDate } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function RatingPip({ value }: { value: number | null }) {
  if (value == null) return null
  const color = value <= 3 ? "bg-bad" : value <= 6 ? "bg-warn" : "bg-good"
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0",
        color,
      )}
    >
      {value}
    </span>
  )
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() ?? ""
  const { supabase } = await verifySession()
  let qb = supabase
    .from("journal_entries")
    .select("date, went_well, was_difficult, insight, day_rating, productivity_rating, mood_rating")
    .order("date", { ascending: false })
  if (q) {
    qb = qb.or(
      [
        `went_well.ilike.%${q}%`,
        `was_difficult.ilike.%${q}%`,
        `insight.ilike.%${q}%`,
      ].join(","),
    )
  }
  const { data } = await qb.limit(50)

  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={[{ label: "Reflectie", href: "/reflection" }, { label: "Geschiedenis" }]} />
      <LiveHeader title="Journal geschiedenis" subtitle="Terugkijken op eerdere entries" />
      <form className="flex gap-2">
        <Input name="q" placeholder="Zoeken in entries..." defaultValue={q} />
        <button className="rounded-md border border-border bg-card px-3 text-sm hover:bg-muted">
          Zoek
        </button>
      </form>
      <div className="space-y-2">
        {(data ?? []).map((e) => (
          <Link
            key={e.date}
            href={`/reflection?date=${e.date}`}
            className="flex items-start gap-3 rounded-md border border-border bg-card p-3 hover:bg-muted"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-fg">{formatDate(e.date)}</div>
              <div className="mt-1 text-sm line-clamp-2">
                {[e.went_well, e.insight, e.was_difficult].filter(Boolean).join(" · ") || "(leeg)"}
              </div>
            </div>
            <div className="flex gap-1 items-center shrink-0 pt-0.5">
              <RatingPip value={e.day_rating} />
              <RatingPip value={e.productivity_rating} />
              <RatingPip value={e.mood_rating} />
            </div>
          </Link>
        ))}
        {(data ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-fg">Geen entries gevonden.</CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
