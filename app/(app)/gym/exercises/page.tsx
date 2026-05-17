import { verifySession } from "@/lib/dal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { addCustomExercise } from "../actions"

export default async function ExercisesPage() {
  const { supabase } = await verifySession()
  const { data: exs } = await supabase
    .from("exercises")
    .select("*")
    .order("primary_muscle_group", { ascending: true })
    .order("name", { ascending: true })

  const grouped = new Map<string, typeof exs>()
  for (const e of exs ?? []) {
    const k = e.primary_muscle_group
    if (!grouped.has(k)) grouped.set(k, [])
    grouped.get(k)!.push(e)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Exercise Library</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Eigen oefening toevoegen</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addCustomExercise} className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Naam</Label>
              <Input name="name" required />
            </div>
            <div>
              <Label>Spiergroep</Label>
              <Input name="primary_muscle_group" required placeholder="bv. chest" />
            </div>
            <div>
              <Label>Categorie</Label>
              <select
                name="category"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                <option value="compound">compound</option>
                <option value="isolation">isolation</option>
              </select>
            </div>
            <div>
              <Label>Equipment</Label>
              <select
                name="equipment"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
              >
                <option>barbell</option>
                <option>dumbbell</option>
                <option>machine</option>
                <option>bodyweight</option>
                <option>cable</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Toevoegen</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {[...grouped.entries()].map(([group, list]) => (
        <section key={group} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{group}</h2>
          <div className="space-y-1.5">
            {list?.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-md border border-border bg-card p-2.5"
              >
                <div>
                  <div className="text-sm font-medium">{e.name}</div>
                  <div className="text-xs text-muted-fg">
                    {e.category} · {e.equipment}
                  </div>
                </div>
                {e.is_custom ? <Badge variant="outline">custom</Badge> : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
