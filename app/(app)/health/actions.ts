"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { readinessScore } from "@/lib/readiness"

export type HealthInput = {
  date: string
  hrv_ms?: number | null
  sleep_duration_min?: number | null
  sleep_score?: number | null
  resting_heart_rate?: number | null
  wake_time?: string | null
  weight_kg?: number | null
  steps?: number | null
  active_calories_kcal?: number | null
  vo2_max?: number | null
  body_fat_pct?: number | null
  systolic_bp?: number | null
  diastolic_bp?: number | null
  mood?: number | null
}

export async function saveHealthEntry(input: HealthInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Niet ingelogd" }

  // 1) Existing row for this date (we MERGE rather than overwrite)
  const { data: existing } = await supabase
    .from("health_entries")
    .select("hrv_ms, sleep_duration_min, sleep_score, resting_heart_rate, readiness_score")
    .eq("date", input.date)
    .maybeSingle()

  // 2) 30-day baselines for readiness (excluding today)
  const start = new Date(input.date)
  start.setDate(start.getDate() - 30)
  const { data: history } = await supabase
    .from("health_entries")
    .select("hrv_ms, resting_heart_rate")
    .gte("date", start.toISOString().split("T")[0])
    .lt("date", input.date)
  const hrvVals = (history ?? []).map((h) => h.hrv_ms).filter((n): n is number => typeof n === "number")
  const rhrVals = (history ?? []).map((h) => h.resting_heart_rate).filter((n): n is number => typeof n === "number")
  const hrvAvg = hrvVals.length ? hrvVals.reduce((a, b) => a + b, 0) / hrvVals.length : null
  const rhrAvg = rhrVals.length ? rhrVals.reduce((a, b) => a + b, 0) / rhrVals.length : null

  // 3) Merge: new input > existing > null. So adding only weight keeps the existing readiness signals.
  const hrv = input.hrv_ms ?? existing?.hrv_ms ?? null
  const sleepMin = input.sleep_duration_min ?? existing?.sleep_duration_min ?? null
  const sleepScore = input.sleep_score ?? existing?.sleep_score ?? null
  const rhr = input.resting_heart_rate ?? existing?.resting_heart_rate ?? null

  const hasSignal = hrv != null || sleepMin != null || sleepScore != null || rhr != null
  const score = hasSignal
    ? readinessScore({
        hrv_ms: hrv,
        sleep_duration_min: sleepMin,
        sleep_score: sleepScore,
        resting_heart_rate: rhr,
        hrv_30d_avg: hrvAvg,
        rhr_30d_avg: rhrAvg,
      })
    : existing?.readiness_score ?? null

  // 4) Build patch: only include user-provided fields + readiness if we actually computed it.
  const patch: Record<string, unknown> = {
    user_id: user.id,
    date: input.date,
  }
  if (hasSignal) patch.readiness_score = score
  for (const [k, v] of Object.entries(input)) {
    if (k === "date") continue
    if (v == null || v === "") continue
    // steps is an integer column — round any float that slipped through
    patch[k] = k === "steps" && typeof v === "number" ? Math.round(v) : v
  }

  const { error } = await supabase
    .from("health_entries")
    .upsert(patch as never, { onConflict: "user_id,date" })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/health")
  revalidatePath("/today")
  return { ok: true, readiness_score: score }
}

export async function importHealthEntries(entries: HealthInput[]) {
  if (!entries.length) return { ok: false, error: "No entries provided" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not logged in" }

  // Fetch all existing rows for the incoming dates in one query so we can
  // merge new signals with stored signals before recomputing readiness.
  const dates = entries.map((e) => e.date)
  const { data: existingRows } = await supabase
    .from("health_entries")
    .select("date, hrv_ms, sleep_duration_min, sleep_score, resting_heart_rate, readiness_score")
    .in("date", dates)
  const existingMap = new Map((existingRows ?? []).map((r) => [r.date, r]))

  // Also fetch 30-day history for baselines (single query covering the full range)
  const minDate = dates.reduce((a, b) => a < b ? a : b)
  const start30 = new Date(minDate)
  start30.setDate(start30.getDate() - 30)
  const { data: history } = await supabase
    .from("health_entries")
    .select("date, hrv_ms, resting_heart_rate")
    .gte("date", start30.toISOString().split("T")[0])
    .lt("date", minDate)

  const patches = entries.map((input) => {
    // 30-day baselines relative to this entry's date
    const cutoff  = input.date
    const hrvVals = (history ?? [])
      .filter((h) => h.date < cutoff)
      .map((h) => h.hrv_ms)
      .filter((n): n is number => typeof n === "number")
    const rhrVals = (history ?? [])
      .filter((h) => h.date < cutoff)
      .map((h) => h.resting_heart_rate)
      .filter((n): n is number => typeof n === "number")
    const hrvAvg = hrvVals.length ? hrvVals.reduce((a, b) => a + b, 0) / hrvVals.length : null
    const rhrAvg = rhrVals.length ? rhrVals.reduce((a, b) => a + b, 0) / rhrVals.length : null

    // Merge: incoming value wins, then existing DB value, then null
    const existing   = existingMap.get(input.date)
    const hrv        = input.hrv_ms             ?? existing?.hrv_ms             ?? null
    const sleepMin   = input.sleep_duration_min ?? existing?.sleep_duration_min ?? null
    const sleepScore = input.sleep_score        ?? existing?.sleep_score        ?? null
    const rhr        = input.resting_heart_rate ?? existing?.resting_heart_rate ?? null

    const hasSignal = hrv != null || sleepMin != null || sleepScore != null || rhr != null
    const score = hasSignal
      ? readinessScore({ hrv_ms: hrv, sleep_duration_min: sleepMin, sleep_score: sleepScore,
                         resting_heart_rate: rhr, hrv_30d_avg: hrvAvg, rhr_30d_avg: rhrAvg })
      : (existing?.readiness_score ?? null)

    const patch: Record<string, unknown> = { user_id: user.id, date: input.date }
    if (hasSignal) patch.readiness_score = score
    for (const [k, v] of Object.entries(input)) {
      if (k === "date") continue
      if (v == null || v === "") continue
      patch[k] = k === "steps" && typeof v === "number" ? Math.round(v) : v
    }
    return patch
  })

  const { error } = await supabase
    .from("health_entries")
    .upsert(patches as never[], { onConflict: "user_id,date" })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/health")
  revalidatePath("/today")
  return { ok: true, count: patches.length }
}

// ─── Workout import ───────────────────────────────────────────────────────────

export type WorkoutInput = {
  workout_type: string
  start_time: string        // ISO timestamptz
  end_time: string
  duration_min: number
  active_kcal?: number | null
  resting_kcal?: number | null
  avg_hr?: number | null
  max_hr?: number | null
  distance_km?: number | null
  steps?: number | null
  location?: string | null
}

export async function importWorkouts(entries: WorkoutInput[]) {
  if (!entries.length) return { ok: false, error: "No entries provided" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not logged in" }

  const rows = entries.map((e) => ({ ...e, user_id: user.id }))
  const { error } = await supabase
    .from("workouts")
    .upsert(rows as never[], { onConflict: "user_id,start_time" })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/health")
  revalidatePath("/today")
  return { ok: true, count: rows.length }
}
