import { verifySession } from "@/lib/dal"
import { startOfWeek, formatEUR, minutesToHM } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { saveWeeklyReview } from "../actions"

export default async function WeeklyReviewPage() {
  const { supabase } = await verifySession()
  const start = startOfWeek()
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const startISO = start.toISOString().split("T")[0]
  const endISO = end.toISOString().split("T")[0]

  const [
    { data: workouts },
    { data: focuses },
    { data: items },
    { data: completions },
    { data: existing },
  ] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id")
      .not("ended_at", "is", null)
      .gte("started_at", `${startISO}T00:00:00`)
      .lte("started_at", `${endISO}T23:59:59`),
    supabase
      .from("focus_sessions")
      .select("duration_minutes, type, is_billable, clients(hourly_rate_eur)")
      .not("ended_at", "is", null)
      .gte("started_at", `${startISO}T00:00:00`)
      .lte("started_at", `${endISO}T23:59:59`),
    supabase.from("habit_items").select("id").eq("is_active", true),
    supabase
      .from("habit_completions")
      .select("date, habit_item_id")
      .gte("date", startISO)
      .lte("date", endISO),
    supabase.from("weekly_reviews").select("*").eq("week_start", startISO).maybeSingle(),
  ])

  const workoutsCount = workouts?.length ?? 0
  const deepWorkMin = (focuses ?? [])
    .filter((f) => f.type === "deep_work")
    .reduce((a, b) => a + (b.duration_minutes ?? 0), 0)
  const billableMin = (focuses ?? [])
    .filter((f) => f.is_billable)
    .reduce((a, b) => a + (b.duration_minutes ?? 0), 0)
  const billableEur = (focuses ?? [])
    .filter((f) => f.is_billable)
    .reduce((a, b) => {
      const rate =
        Number(
          (b as unknown as { clients?: { hourly_rate_eur?: number } | null }).clients
            ?.hourly_rate_eur ?? 0,
        ) || 0
      return a + ((b.duration_minutes ?? 0) / 60) * rate
    }, 0)
  const totalActive = items?.length ?? 0
  const totalSlots = totalActive * 7
  const totalDone = completions?.length ?? 0
  const habitsPct = totalSlots === 0 ? 0 : Math.round((totalDone / totalSlots) * 100)

  return (
    <div className="space-y-6">
      <LiveHeader
        title="Wekelijkse review"
        subtitle={`${startISO} t/m ${endISO}`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Workouts" value={String(workoutsCount)} />
        <Stat label="Habits" value={`${habitsPct}%`} />
        <Stat label="Deep Work" value={minutesToHM(deepWorkMin)} />
        <Stat label="Billable" value={`${minutesToHM(billableMin)} · ${formatEUR(billableEur)}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reflectie</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveWeeklyReview} className="space-y-3">
            <input type="hidden" name="week_start" value={startISO} />
            <input type="hidden" name="week_end" value={endISO} />
            <div>
              <Label>Wat ging goed deze week?</Label>
              <Textarea name="went_well" defaultValue={existing?.went_well ?? ""} rows={3} />
            </div>
            <div>
              <Label>Wat kan beter?</Label>
              <Textarea name="improve_on" defaultValue={existing?.improve_on ?? ""} rows={3} />
            </div>
            <div>
              <Label>Mijn focus voor volgende week</Label>
              <Textarea
                name="focus_next_week"
                defaultValue={existing?.focus_next_week ?? ""}
                rows={3}
              />
            </div>
            <Button type="submit">Bewaar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-fg">{label}</div>
        <div className="text-base font-medium tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}
