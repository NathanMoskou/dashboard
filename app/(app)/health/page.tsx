import Link from "next/link"
import { verifySession } from "@/lib/dal"
import { todayISO, minutesToHM, formatDate } from "@/lib/utils"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ReadinessCard } from "@/components/ReadinessCard"
import { readinessZone, readinessBreakdown } from "@/lib/readiness"
import { CollapsibleSection } from "@/components/ui/Collapsible"
import { HealthTrend } from "./HealthTrend"
import { ManualEntryForm } from "./ManualEntryForm"
import { HealthImport } from "./HealthImport"
import { WorkoutSection } from "./WorkoutSection"

export const dynamic = "force-dynamic"

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const sp   = await searchParams
  const days = Math.max(7, Math.min(180, parseInt(sp.range ?? "30", 10)))
  const { supabase } = await verifySession()

  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceISO = since.toISOString().split("T")[0]

  // ── Health entries (selected range + latest ever) ───────────────────────
  const [{ data: rows }, { data: latest }] = await Promise.all([
    supabase
      .from("health_entries")
      .select("*")
      .gte("date", sinceISO)
      .order("date", { ascending: true }),
    supabase
      .from("health_entries")
      .select("*")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const recent = rows ?? []
  const today  = recent.find((r) => r.date === todayISO()) ?? null

  // ── Stats / averages ────────────────────────────────────────────────────
  const weights = recent.map((r) => r.weight_kg).filter((v): v is number => v != null)
  const weightDelta =
    weights.length >= 2 ? Number((weights[weights.length - 1] - weights[0]).toFixed(1)) : null

  const avgSleep = avg(recent.map((r) => r.sleep_duration_min ?? null))
  const avgSteps = avg(recent.map((r) => r.steps ?? null))
  const avgRhr   = avg(recent.map((r) => r.resting_heart_rate ?? null))
  const avgHrv   = avg(recent.map((r) => r.hrv_ms ?? null))

  // ── Series for charts ───────────────────────────────────────────────────
  const series = (key: keyof typeof recent[number]) =>
    recent.map((r) => ({
      date:  r.date.slice(5),
      value: (r as unknown as Record<string, number | null>)[key as string] ?? null,
    }))

  const sleepSeries = recent.map((r) => ({
    date:  r.date.slice(5),
    value: r.sleep_duration_min != null ? Number((r.sleep_duration_min / 60).toFixed(2)) : null,
  }))

  const zone = latest?.readiness_score != null ? readinessZone(latest.readiness_score) : null

  // ── Fresh readiness: pick most-recent signal per factor (last 3 days) ───
  const last3      = [...recent].reverse().slice(0, 3)
  const freshSleep = last3.find((r) => r.sleep_duration_min != null)
  const freshScore = last3.find((r) => r.sleep_score        != null)
  const freshHrv   = last3.find((r) => r.hrv_ms             != null)
  const freshRhr   = last3.find((r) => r.resting_heart_rate != null)

  const hrvVals30 = recent.map((r) => r.hrv_ms).filter((v): v is number => v != null)
  const rhrVals30 = recent.map((r) => r.resting_heart_rate).filter((v): v is number => v != null)
  const hrv30dAvg = hrvVals30.length ? hrvVals30.reduce((a, b) => a + b, 0) / hrvVals30.length : null
  const rhr30dAvg = rhrVals30.length ? rhrVals30.reduce((a, b) => a + b, 0) / rhrVals30.length : null

  const freshBreakdown = (freshSleep || freshScore || freshHrv || freshRhr)
    ? readinessBreakdown({
        hrv_ms:             freshHrv?.hrv_ms              ?? null,
        sleep_duration_min: freshSleep?.sleep_duration_min ?? null,
        sleep_score:        freshScore?.sleep_score        ?? null,
        resting_heart_rate: freshRhr?.resting_heart_rate   ?? null,
        hrv_30d_avg:        hrv30dAvg,
        rhr_30d_avg:        rhr30dAvg,
      })
    : null

  // ── Workouts in range ───────────────────────────────────────────────────
  const { data: workoutRows } = await supabase
    .from("workouts")
    .select("*")
    .gte("start_time", sinceISO)
    .order("start_time", { ascending: false })
  const workouts = workoutRows ?? []

  // ── Workout stats: week / month / year ──────────────────────────────────
  const now        = new Date()
  const weekStart  = new Date(now)
  const dow        = now.getDay() === 0 ? 6 : now.getDay() - 1 // Monday = 0
  weekStart.setDate(now.getDate() - dow)
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart  = new Date(now.getFullYear(), 0, 1)

  const { data: allWorkouts } = await supabase
    .from("workouts")
    .select("workout_type, start_time, duration_min, active_kcal")
    .gte("start_time", yearStart.toISOString())
    .order("start_time", { ascending: false })

  const typeCounts = (list: typeof allWorkouts) => {
    const counts: Record<string, number> = {}
    for (const w of list ?? []) counts[w.workout_type] = (counts[w.workout_type] ?? 0) + 1
    return counts
  }

  const weekList  = (allWorkouts ?? []).filter((w) => new Date(w.start_time) >= weekStart)
  const monthList = (allWorkouts ?? []).filter((w) => new Date(w.start_time) >= monthStart)
  const yearList  = allWorkouts ?? []

  const workoutStats = {
    week:  { count: weekList.length,  types: typeCounts(weekList)  },
    month: { count: monthList.length, types: typeCounts(monthList) },
    year:  { count: yearList.length,  types: typeCounts(yearList)  },
  }

  // ── Export rows (all-time) ──────────────────────────────────────────────
  const { data: allRows } = await supabase
    .from("health_entries")
    .select("date,hrv_ms,sleep_duration_min,sleep_score,resting_heart_rate,wake_time,weight_kg,steps,active_calories_kcal,vo2_max,body_fat_pct,systolic_bp,diastolic_bp,mood")
    .order("date", { ascending: false })
  const exportRows = allRows ?? []

  return (
    <div className="space-y-5">
      <LiveHeader title="Health" subtitle="Slaap, herstel & activiteit" />

      {/* Range selector */}
      <nav className="flex items-center gap-1.5 -mt-2">
        {[7, 30, 90, 180].map((d) => (
          <Link
            key={d}
            href={`/health?range=${d}`}
            prefetch
            className={`rounded-full border px-3 py-1 text-xs ${
              d === days
                ? "border-fg bg-fg text-bg"
                : "border-border text-muted-fg hover:bg-muted"
            }`}
          >
            {d}d
          </Link>
        ))}
      </nav>

      {/* Readiness — always visible, not collapsible */}
      <ReadinessCard
        hrv={freshHrv?.hrv_ms ?? null}
        sleepMin={freshSleep?.sleep_duration_min ?? null}
        rhr={freshRhr?.resting_heart_rate ?? null}
        score={freshBreakdown?.score ?? today?.readiness_score ?? latest?.readiness_score ?? null}
        breakdown={freshBreakdown}
      />

      {/* Averages */}
      <CollapsibleSection title={`Gemiddelden — ${days} dagen`}>
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 pt-4 md:grid-cols-4">
            <Stat
              label="Slaap"
              value={avgSleep != null ? minutesToHM(Math.round(avgSleep)) : "—"}
              sub={today?.sleep_score ? `score ${today.sleep_score}/100 vandaag` : undefined}
            />
            <Stat
              label="Gewicht"
              value={latest?.weight_kg ? `${Number(latest.weight_kg).toFixed(1)} kg` : "—"}
              sub={weightDelta != null ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg in ${days}d` : undefined}
              tone={weightDelta == null ? "default" : weightDelta < 0 ? "good" : weightDelta > 0 ? "warn" : "default"}
            />
            <Stat label="Stappen"      value={avgSteps != null ? Math.round(avgSteps).toLocaleString("nl-NL") : "—"} sub="per dag" />
            <Stat label="Rusthartslag" value={avgRhr != null ? `${Math.round(avgRhr)} bpm` : "—"} />
            <Stat label="HRV"          value={avgHrv != null ? `${Math.round(avgHrv)} ms` : "—"} />
            <Stat
              label="VO2 max"
              value={latest?.vo2_max != null ? `${Number(latest.vo2_max).toFixed(1)}` : "—"}
              sub="laatste meting"
            />
            <Stat
              label="Vetpercentage"
              value={latest?.body_fat_pct != null ? `${Number(latest.body_fat_pct).toFixed(1)}%` : "—"}
            />
            <Stat
              label="Actieve kcal"
              value={
                today?.active_calories_kcal != null ? `${today.active_calories_kcal}`
                : latest?.active_calories_kcal != null ? `${latest.active_calories_kcal}`
                : "—"
              }
              sub="vandaag"
            />
          </CardContent>
        </Card>
      </CollapsibleSection>

      {/* Workouts */}
      <CollapsibleSection title="Workouts">
        <WorkoutSection
          workouts={workouts}
          stats={workoutStats}
          rangeDays={days}
        />
      </CollapsibleSection>

      {/* Charts */}
      <CollapsibleSection title="Grafieken" defaultOpen={false}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Chart title="Slaapscore" color="#818cf8">
            <HealthTrend data={series("sleep_score")} color="#818cf8" type="area" unit="" />
          </Chart>
          <Chart title="Slaap (uren)" color="#6366f1">
            <HealthTrend data={sleepSeries} color="#6366f1" type="area" unit="u" />
          </Chart>
          <Chart title="Gewicht (kg)" color="#22c55e">
            <HealthTrend data={series("weight_kg")} color="#22c55e" unit=" kg" />
          </Chart>
          <Chart title="Stappen" color="#f59e0b">
            <HealthTrend data={series("steps")} color="#f59e0b" type="area" />
          </Chart>
          <Chart title="HRV (ms)" color="#06b6d4">
            <HealthTrend data={series("hrv_ms")} color="#06b6d4" unit=" ms" />
          </Chart>
          <Chart title="Rusthartslag (bpm)" color="#ef4444">
            <HealthTrend data={series("resting_heart_rate")} color="#ef4444" unit=" bpm" />
          </Chart>
          <Chart title="Readiness" color="#a855f7">
            <HealthTrend data={series("readiness_score")} color="#a855f7" type="area" />
          </Chart>
        </div>
      </CollapsibleSection>

      {/* Recent entries table */}
      <CollapsibleSection title="Recente metingen" defaultOpen={false}>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] text-muted-fg uppercase">
                    <th className="p-2">Datum</th>
                    <th className="p-2 text-right">Slaap</th>
                    <th className="p-2 text-right">Score</th>
                    <th className="p-2 text-right">HRV</th>
                    <th className="p-2 text-right">RHR</th>
                    <th className="p-2 text-right">Gewicht</th>
                    <th className="p-2 text-right">Stappen</th>
                    <th className="p-2 text-right">Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {[...recent].reverse().slice(0, 14).map((r) => {
                    const zoneR = r.readiness_score != null ? readinessZone(r.readiness_score) : null
                    return (
                      <tr key={r.id} className="border-t border-border">
                        <td className="p-2">{r.date}</td>
                        <td className="p-2 text-right tabular-nums">
                          {r.sleep_duration_min != null ? minutesToHM(r.sleep_duration_min) : "—"}
                        </td>
                        <td className="p-2 text-right tabular-nums">{r.sleep_score ?? "—"}</td>
                        <td className="p-2 text-right tabular-nums">{r.hrv_ms != null ? `${r.hrv_ms}` : "—"}</td>
                        <td className="p-2 text-right tabular-nums">{r.resting_heart_rate ?? "—"}</td>
                        <td className="p-2 text-right tabular-nums">
                          {r.weight_kg != null ? Number(r.weight_kg).toFixed(1) : "—"}
                        </td>
                        <td className="p-2 text-right tabular-nums">
                          {r.steps != null ? r.steps.toLocaleString("nl-NL") : "—"}
                        </td>
                        <td className="p-2 text-right">
                          {r.readiness_score != null ? (
                            <Badge variant={zoneR === "green" ? "good" : zoneR === "amber" ? "warn" : "bad"}>
                              {r.readiness_score}
                            </Badge>
                          ) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                  {recent.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-muted-fg">
                        Nog geen metingen. Importeer een CSV of gebruik het formulier hieronder.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </CollapsibleSection>

      {/* Import / manual entry — always at the bottom */}
      <CollapsibleSection title="Invoer &amp; export" defaultOpen={false}>
        <div className="space-y-3">
          <HealthImport exportRows={exportRows} />
          <ManualEntryForm today={todayISO()} />
        </div>
      </CollapsibleSection>

      {zone && (
        <p className="text-xs text-muted-fg">
          <Badge variant="outline">Laatste meting: {formatDate(latest!.date)}</Badge>
        </p>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Stat({
  label, value, sub, tone,
}: {
  label: string; value: string; sub?: string; tone?: "good" | "warn" | "default"
}) {
  const t = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-fg"
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-fg">{label}</div>
      <div className={`text-sm font-medium tabular-nums ${t}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-fg">{sub}</div>}
    </div>
  )
}

function Chart({ title, color, children }: { title: string; color?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-40 px-2 pb-2">{children}</CardContent>
    </Card>
  )
}

function avg(vals: (number | null | undefined)[]): number | null {
  const xs = vals.filter((v): v is number => typeof v === "number")
  if (!xs.length) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
