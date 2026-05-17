import { verifySession } from "@/lib/dal"
import { minutesToHM } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function SessionDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase } = await verifySession()
  const [{ data: session }, { data: sets }] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("*, workout_templates(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("workout_sets")
      .select("*, exercises(name, primary_muscle_group)")
      .eq("session_id", id)
      .order("completed_at", { ascending: true }),
  ])
  if (!session) return <p className="p-4">Sessie niet gevonden.</p>

  const start = new Date(session.started_at)
  const end = session.ended_at ? new Date(session.ended_at) : null
  const min = end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0
  const tpl = (session as unknown as { workout_templates?: { name: string } | null })
    .workout_templates

  // group sets by exercise
  const byExercise = new Map<string, typeof sets>()
  for (const s of sets ?? []) {
    const k = s.exercise_id ?? "unknown"
    if (!byExercise.has(k)) byExercise.set(k, [])
    byExercise.get(k)!.push(s)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {start.toLocaleDateString("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h1>
        <p className="text-sm text-muted-fg">
          {tpl?.name ?? "Freestyle"} · {minutesToHM(min)} ·{" "}
          {session.total_volume_kg
            ? `${Math.round(Number(session.total_volume_kg)).toLocaleString("nl-NL")} kg volume`
            : "—"}
        </p>
      </header>

      {[...byExercise.entries()].map(([exId, list]) => {
        const ex = (list ?? [])[0]?.exercises as { name: string; primary_muscle_group: string } | null
        return (
          <Card key={exId}>
            <CardHeader>
              <CardTitle className="text-base">{ex?.name ?? "—"}</CardTitle>
              <p className="text-xs text-muted-fg">{ex?.primary_muscle_group}</p>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(list ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
                  <span>
                    <Badge variant="outline">#{s.set_number}</Badge>
                    <span className="ml-2 text-xs text-muted-fg">{s.set_type}</span>
                  </span>
                  <span className="tabular-nums">
                    {Number(s.weight_kg ?? 0)} kg × {s.reps ?? 0}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}

      {session.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Notities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{session.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
