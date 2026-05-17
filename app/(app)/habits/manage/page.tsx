import { verifySession } from "@/lib/dal"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { addHabit } from "../actions"
import { HabitRow } from "./HabitRow"
import { SortableList } from "./SortableList"

export default async function ManageHabits() {
  const { supabase } = await verifySession()

  // 30-day window for the per-habit insights sheet
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceISO = since.toISOString().slice(0, 10)

  const [{ data: items }, { data: completions }, { data: lifetimeRows }] = await Promise.all([
    supabase
      .from("habit_items")
      .select("*")
      .order("is_active", { ascending: false })
      .order("display_order", { ascending: true }),
    supabase
      .from("habit_completions")
      .select("date, habit_item_id, was_skipped, was_auto, quantity_value, skip_reason")
      .gte("date", sinceISO),
    // Lifetime totals — aggregated client-side from a thin projection so the
    // insights sheet can show "Sinds X · 142× afgevinkt".
    supabase
      .from("habit_completions")
      .select("habit_item_id, was_skipped, skip_reason"),
  ])

  const all = items ?? []
  const active = all.filter((h) => h.is_active)
  const archived = all.filter((h) => !h.is_active)
  const allCompletions = completions ?? []

  // Per-habit lifetime aggregates
  type Lifetime = { total: number; skips: number; reasons: Record<string, number> }
  const lifetime = new Map<string, Lifetime>()
  for (const r of lifetimeRows ?? []) {
    const entry = lifetime.get(r.habit_item_id) ?? { total: 0, skips: 0, reasons: {} }
    if (r.was_skipped) {
      entry.skips++
      if (r.skip_reason) entry.reasons[r.skip_reason] = (entry.reasons[r.skip_reason] ?? 0) + 1
    } else {
      entry.total++
    }
    lifetime.set(r.habit_item_id, entry)
  }

  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={[{ label: "Habits", href: "/habits" }, { label: "Beheren" }]} />
      <LiveHeader title="Habits beheren" />

      <Card>
        <CardHeader>
          <CardTitle>Nieuwe habit</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addHabit} className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="name">Naam</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                <option value="habit">Habit</option>
                <option value="supplement">Supplement</option>
              </select>
            </div>
            <div>
              <Label htmlFor="time_of_day">Tijdstip</Label>
              <select
                id="time_of_day"
                name="time_of_day"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                <option value="morning">Ochtend</option>
                <option value="afternoon">Middag</option>
                <option value="evening">Avond</option>
                <option value="anytime">Hele dag</option>
              </select>
            </div>
            <div>
              <Label htmlFor="category">Categorie (optioneel)</Label>
              <Input id="category" name="category" placeholder="bv. Gezondheid, Mindset" />
            </div>
            <div>
              <Label htmlFor="target_per_week">Doel per week</Label>
              <select
                id="target_per_week"
                name="target_per_week"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                defaultValue=""
              >
                <option value="">Dagelijks (elke dag)</option>
                <option value="1">1× per week</option>
                <option value="2">2× per week</option>
                <option value="3">3× per week</option>
                <option value="4">4× per week</option>
                <option value="5">5× per week</option>
                <option value="6">6× per week</option>
              </select>
            </div>
            <div>
              <Label htmlFor="reminder_time">Eigen reminder (optioneel)</Label>
              <Input id="reminder_time" name="reminder_time" type="time" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="dosage">Dosering / notitie (optioneel)</Label>
              <Input id="dosage" name="dosage" placeholder="bv. 5g, 1 cap, 8 uur" />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Toevoegen</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actieve habits ({active.length})</CardTitle>
          <CardDescription>Sleep aan de greep om te herordenen. Tap een habit voor inzichten. Koppel een habit aan een ander om hem alleen te tonen nadat de eerste klaar is.</CardDescription>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-sm text-muted-fg">Nog geen actieve habits.</p>
          ) : (
            <SortableList
              initialItems={active}
              allHabits={all}
              allCompletions={allCompletions}
              lifetime={Object.fromEntries(lifetime)}
            />
          )}
        </CardContent>
      </Card>

      {archived.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Gearchiveerd ({archived.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {archived.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                allHabits={all}
                completions={allCompletions.filter((c) => c.habit_item_id === h.id)}
                lifetime={lifetime.get(h.id) ?? null}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
