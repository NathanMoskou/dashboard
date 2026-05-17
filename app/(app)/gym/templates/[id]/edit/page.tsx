import { verifySession } from "@/lib/dal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { addExerciseToTemplate, removeTemplateExercise } from "../../../actions"

export default async function EditTemplate({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await verifySession()
  const [{ data: tpl }, { data: rows }, { data: exercises }] = await Promise.all([
    supabase.from("workout_templates").select("*").eq("id", id).single(),
    supabase
      .from("template_exercises")
      .select("*, exercises(name, primary_muscle_group)")
      .eq("template_id", id)
      .order("display_order", { ascending: true }),
    supabase.from("exercises").select("id, name, primary_muscle_group").order("name"),
  ])

  if (!tpl) return <p className="p-4">Template niet gevonden.</p>

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{tpl.name}</h1>
        <p className="text-sm text-muted-fg">Template bewerken</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Oefening toevoegen</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addExerciseToTemplate} className="grid gap-3 md:grid-cols-3">
            <input type="hidden" name="template_id" value={id} />
            <div className="md:col-span-2">
              <Label>Oefening</Label>
              <select
                name="exercise_id"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                required
              >
                {(exercises ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.primary_muscle_group})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 md:col-span-1">
              <div>
                <Label>Sets</Label>
                <Input name="target_sets" type="number" defaultValue="3" />
              </div>
              <div>
                <Label>Reps</Label>
                <Input name="target_reps" defaultValue="8-12" />
              </div>
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Toevoegen</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(rows ?? []).map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-md border border-border bg-card p-3"
          >
            <div>
              <div className="font-medium">{r.exercises?.name}</div>
              <div className="text-xs text-muted-fg">
                {r.target_sets} × {r.target_reps} ·{" "}
                {r.last_used_weight_kg ? `${r.last_used_weight_kg} kg laatst` : "—"}
              </div>
            </div>
            <form action={removeTemplateExercise.bind(null, r.id, id)}>
              <Button variant="ghost" size="sm" type="submit">
                Verwijder
              </Button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
