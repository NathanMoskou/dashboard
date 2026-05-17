"use client"
import { useState } from "react"
import { Dumbbell, Footprints, Bike, Waves, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Workout = {
  id: string
  workout_type: string
  start_time: string
  duration_min: number
  active_kcal: number | null
  avg_hr: number | null
  max_hr: number | null
  distance_km: number | null
}

type WorkoutStats = {
  week:  { count: number; types: Record<string, number> }
  month: { count: number; types: Record<string, number> }
  year:  { count: number; types: Record<string, number> }
}

function workoutIcon(type: string) {
  const t = type.toLowerCase()
  if (t.includes("strength") || t.includes("gym"))  return Dumbbell
  if (t.includes("walk") || t.includes("run"))       return Footprints
  if (t.includes("cycl") || t.includes("bike"))      return Bike
  if (t.includes("swim"))                            return Waves
  return Zap
}

export function WorkoutSection({
  workouts,
  stats,
  rangeDays,
}: {
  workouts: Workout[]
  stats: WorkoutStats
  rangeDays: number
}) {
  const allTypes = Array.from(new Set(workouts.map((w) => w.workout_type))).sort()
  const [filter, setFilter] = useState<string>("all")

  const filtered = filter === "all" ? workouts : workouts.filter((w) => w.workout_type === filter)

  const periods: { key: keyof WorkoutStats; label: string }[] = [
    { key: "week",  label: "Week"  },
    { key: "month", label: "Maand" },
    { key: "year",  label: "Jaar"  },
  ]

  return (
    <div className="space-y-3">
      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {periods.map(({ key, label }) => {
          const s = stats[key]
          const types = Object.entries(s.types).sort((a, b) => b[1] - a[1])
          return (
            <Card key={key}>
              <CardContent className="p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-fg">{label}</div>
                <div className="text-2xl font-semibold tabular-nums mt-0.5">{s.count}</div>
                {types.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {types.slice(0, 3).map(([type, count]) => {
                      const Icon = workoutIcon(type)
                      return (
                        <div key={type} className="flex items-center gap-1.5 text-[10px] text-muted-fg">
                          <Icon size={10} className="shrink-0" />
                          <span className="truncate">{type}</span>
                          <span className="ml-auto tabular-nums font-medium text-fg">{count}×</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── Filter pills ──────────────────────────────────────── */}
      {allTypes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === "all"
                ? "border-fg bg-fg text-bg"
                : "border-border text-muted-fg hover:bg-muted"
            }`}
          >
            Alles ({workouts.length})
          </button>
          {allTypes.map((type) => {
            const count = workouts.filter((w) => w.workout_type === type).length
            const Icon  = workoutIcon(type)
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  filter === type
                    ? "border-fg bg-fg text-bg"
                    : "border-border text-muted-fg hover:bg-muted"
                }`}
              >
                <Icon size={11} />
                {type} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* ── Workout list ──────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((w) => {
                const Icon       = workoutIcon(w.workout_type)
                const durationH  = Math.floor(w.duration_min / 60)
                const durationM  = Math.round(w.duration_min % 60)
                const durationStr = durationH > 0 ? `${durationH}u ${durationM}m` : `${durationM}m`
                const dateStr    = new Date(w.start_time).toLocaleDateString("nl-NL", {
                  weekday: "short", month: "short", day: "numeric",
                })
                return (
                  <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-fg">
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{w.workout_type}</div>
                      <div className="text-xs text-muted-fg">{dateStr} · {durationStr}</div>
                    </div>
                    <div className="text-right text-xs tabular-nums shrink-0 space-y-0.5">
                      {w.active_kcal != null && (
                        <div className="font-medium">{Math.round(w.active_kcal)} kcal</div>
                      )}
                      {w.avg_hr != null && (
                        <div className="text-muted-fg">
                          ♥ {Math.round(w.avg_hr)}{w.max_hr != null ? `–${Math.round(w.max_hr)}` : ""} bpm
                        </div>
                      )}
                      {w.distance_km != null && w.distance_km > 0 && (
                        <div className="text-muted-fg">{w.distance_km.toFixed(2)} km</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-fg py-2">
          {filter === "all"
            ? `Geen workouts in de afgelopen ${rangeDays} dagen.`
            : `Geen ${filter} workouts in deze periode.`}
        </p>
      )}
    </div>
  )
}
