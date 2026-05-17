export const revalidate = 60

import { verifySession } from "@/lib/dal"
import { todayISO, startOfWeek } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { JournalForm } from "./JournalForm"
import { EntriesList, type JournalEntry } from "./EntriesList"
import { saveWeeklyReview } from "./actions"

function isSundayAms() {
  return (
    new Date().toLocaleDateString("en-US", {
      timeZone: "Europe/Amsterdam",
      weekday: "long",
    }) === "Sunday"
  )
}

function WeeklyField({ title, value }: { title: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-fg mb-1">{title}</div>
      {value ? (
        <p className="text-sm whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-sm text-muted-fg italic">—</p>
      )}
    </div>
  )
}

export default async function ReflectionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const sp = await searchParams
  const date = sp.date ?? todayISO()
  const isToday = date === todayISO()
  const isSunday = isToday && isSundayAms()

  const { supabase } = await verifySession()

  const weekStart = startOfWeek()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartISO = weekStart.toISOString().split("T")[0]
  const weekEndISO = weekEnd.toISOString().split("T")[0]

  const [{ data: today }, { data: recentRaw }, { data: weeklyReview }] = await Promise.all([
    supabase
      .from("journal_entries")
      .select(
        "date, went_well, was_difficult, insight, free_text, day_rating, productivity_rating, mood_rating",
      )
      .eq("date", date)
      .maybeSingle(),
    supabase
      .from("journal_entries")
      .select(
        "date, went_well, was_difficult, insight, free_text, day_rating, productivity_rating, mood_rating",
      )
      .order("date", { ascending: false })
      .limit(15),
    supabase.from("weekly_reviews").select("*").eq("week_start", weekStartISO).maybeSingle(),
  ])

  const recent = (recentRaw ?? []) as JournalEntry[]

  return (
    <div className="space-y-6">
      <LiveHeader title="Reflectie" subtitle="Dagboek & wekelijkse review" />

      <JournalForm date={date} existing={today as JournalEntry | null} />

      {/* Weekly review — always visible, editable only on Sunday */}
      <Card>
        <CardHeader>
          <CardTitle>
            Wekelijkse review — {weekStartISO} t/m {weekEndISO}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSunday ? (
            <form action={saveWeeklyReview} className="space-y-3">
              <input type="hidden" name="week_start" value={weekStartISO} />
              <input type="hidden" name="week_end" value={weekEndISO} />
              <div>
                <Label>Wat ging goed deze week?</Label>
                <Textarea
                  name="went_well"
                  defaultValue={weeklyReview?.went_well ?? ""}
                  rows={3}
                />
              </div>
              <div>
                <Label>Wat kan beter?</Label>
                <Textarea
                  name="improve_on"
                  defaultValue={weeklyReview?.improve_on ?? ""}
                  rows={3}
                />
              </div>
              <div>
                <Label>Mijn focus voor volgende week</Label>
                <Textarea
                  name="focus_next_week"
                  defaultValue={weeklyReview?.focus_next_week ?? ""}
                  rows={3}
                />
              </div>
              <Button type="submit">Bewaar review</Button>
            </form>
          ) : weeklyReview ? (
            <div className="space-y-4">
              <WeeklyField title="Wat ging goed deze week?" value={weeklyReview.went_well} />
              <WeeklyField title="Wat kon beter?" value={weeklyReview.improve_on} />
              <WeeklyField title="Focus voor volgende week" value={weeklyReview.focus_next_week} />
            </div>
          ) : (
            <p className="text-sm text-muted-fg italic">
              Nog niet ingevuld — kom terug op zondag.
            </p>
          )}
        </CardContent>
      </Card>

      <div id="recent-entries">
        <Card>
          <CardHeader>
            <CardTitle>Recente entries</CardTitle>
          </CardHeader>
          <CardContent>
            <EntriesList entries={recent} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
