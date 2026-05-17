import Link from "next/link"
import { verifySession } from "@/lib/dal"
import { minutesToHM } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function LogPage() {
  const { supabase } = await verifySession()
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, ended_at, total_volume_kg, template_id, workout_templates(name)")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Logboek</h1>
      </header>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(sessions ?? []).map((s) => {
              const start = new Date(s.started_at)
              const end = s.ended_at ? new Date(s.ended_at) : null
              const min = end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0
              const tpl = (s as unknown as { workout_templates?: { name: string } | null })
                .workout_templates
              return (
                <Link
                  key={s.id}
                  href={`/gym/log/${s.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {start.toLocaleDateString("nl-NL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-muted-fg">
                      {tpl?.name ? `${tpl.name} · ` : ""}
                      {minutesToHM(min)}
                    </div>
                  </div>
                  <div className="text-sm text-muted-fg">
                    {s.total_volume_kg
                      ? `${Math.round(Number(s.total_volume_kg)).toLocaleString("nl-NL")} kg`
                      : "—"}
                  </div>
                </Link>
              )
            })}
            {(sessions ?? []).length === 0 ? (
              <div className="p-4 text-sm text-muted-fg">Nog geen voltooide sessies.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
