export const revalidate = 60

import Link from "next/link"
import { Dumbbell, History, LineChart, Library, Settings } from "lucide-react"
import { verifySession } from "@/lib/dal"
import { todayISO, minutesToHM } from "@/lib/utils"
import { ReadinessCard } from "@/components/ReadinessCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LiveHeader } from "@/components/ui/LiveHeader"

export default async function GymPage() {
  const { supabase } = await verifySession()
  const [{ data: health }, { data: templates }, { data: recent }] = await Promise.all([
    supabase
      .from("health_entries")
      .select("*")
      .eq("date", todayISO())
      .maybeSingle(),
    supabase
      .from("workout_templates")
      .select("id, name")
      .order("created_at", { ascending: false }),
    supabase
      .from("workout_sessions")
      .select("id, started_at, ended_at, total_volume_kg")
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(5),
  ])

  return (
    <div className="space-y-6">
      <LiveHeader title="Gym" subtitle="Workouts starten, loggen & voortgang bijhouden" />

      <ReadinessCard
        hrv={health?.hrv_ms ?? null}
        sleepMin={health?.sleep_duration_min ?? null}
        rhr={health?.resting_heart_rate ?? null}
        score={health?.readiness_score ?? null}
      />

      <Card>
        <CardHeader>
          <CardTitle>Start workout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(templates ?? []).map((t) => (
            <form key={t.id} action={`/gym/active?template=${t.id}`} method="GET">
              <Button variant="outline" className="w-full justify-start">
                <Dumbbell size={16} /> {t.name}
              </Button>
            </form>
          ))}
          <Link href="/gym/active?template=freestyle">
            <Button className="w-full">
              <Dumbbell size={16} /> Freestyle workout
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <NavCard href="/gym/templates" icon={Settings} label="Templates" />
        <NavCard href="/gym/log" icon={History} label="Logboek" />
        <NavCard href="/gym/progress" icon={LineChart} label="Progressie" />
        <NavCard href="/gym/exercises" icon={Library} label="Library" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recente sessies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(recent ?? []).length === 0 ? (
            <p className="text-sm text-muted-fg">Nog geen sessies — start je eerste workout.</p>
          ) : (
            (recent ?? []).map((s) => {
              const start = new Date(s.started_at)
              const end = s.ended_at ? new Date(s.ended_at) : null
              const min = end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0
              return (
                <Link
                  key={s.id}
                  href={`/gym/log/${s.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {start.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}
                    </div>
                    <div className="text-xs text-muted-fg">{minutesToHM(min)}</div>
                  </div>
                  <div className="text-sm text-muted-fg">
                    {s.total_volume_kg ? `${Math.round(Number(s.total_volume_kg)).toLocaleString("nl-NL")} kg` : "—"}
                  </div>
                </Link>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function NavCard({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ size?: number }>
  label: string
}) {
  return (
    <Link href={href}>
      <Card className="p-4 hover:bg-muted">
        <div className="flex flex-col items-center gap-2 text-sm">
          <Icon size={20} />
          {label}
        </div>
      </Card>
    </Link>
  )
}
