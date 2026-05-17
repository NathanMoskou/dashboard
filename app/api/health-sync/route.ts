import { NextResponse, type NextRequest } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { readinessScore } from "@/lib/readiness"

/* ============================================================================
 *  Two payload formats accepted:
 *
 *  1) Native (iOS Shortcut hand-built):
 *     { "date": "2026-05-10", "hrv_ms": 64, "sleep_duration_min": 432, ... }
 *
 *  2) Health Auto Export (HAE) "REST API" feature:
 *     { "data": { "metrics": [
 *         { "name": "heart_rate_variability", "data": [ { "date": "...", "qty": 64 } ] },
 *         { "name": "sleep_analysis", "data": [ { "asleep": 432, ... } ] },
 *         ...
 *     ] } }
 *
 *  We detect format and translate HAE → native, then run a single write path.
 * ========================================================================= */

// Accept date as YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, or any ISO string
const flexDate = z
  .string()
  .transform((v) => {
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
    const dmy = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/.exec(v)
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
    return v
  })
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))

// Accept number OR numeric string (coerce)
const num = z.union([z.number(), z.string().transform(Number)]).pipe(z.number()).nullable().optional()
const int = z.union([z.number(), z.string().transform(Number)]).pipe(z.number().int()).nullable().optional()

const native = z.object({
  date: flexDate,
  hrv_ms: num,
  sleep_duration_min: num,
  resting_heart_rate: num,
  sleep_quality: int,
  sleep_score: int,
  wake_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  weight_kg: num,
  steps: int,
  active_calories_kcal: int,
  vo2_max: num,
  body_fat_pct: num,
  systolic_bp: int,
  diastolic_bp: int,
  mood: int,
})

type Native = z.infer<typeof native>

function intOrNull(v: number | null | undefined): number | null {
  if (v == null) return null
  return Math.round(v)
}

/* ---------------- HAE translation ---------------- */

type HAEEntry = { date?: string; qty?: number; asleep?: number; inBed?: number; awake?: number; rem?: number; deep?: number; core?: number; source?: string }
type HAEMetric = { name?: string; units?: string; data?: HAEEntry[] }
type HAEBody = { data?: { metrics?: HAEMetric[] } }

const HAE_METRIC_MAP: Record<string, keyof Native> = {
  // HRV — multiple possible names from HAE
  heart_rate_variability: "hrv_ms",
  heartratevariabilitysdnn: "hrv_ms",
  hrv: "hrv_ms",
  // Resting HR
  resting_heart_rate: "resting_heart_rate",
  restingheartrate: "resting_heart_rate",
  // Weight
  weight_body_mass: "weight_kg",
  body_mass: "weight_kg",
  weight: "weight_kg",
  // Steps
  step_count: "steps",
  steps: "steps",
  stepcount: "steps",
  // Active calories
  active_energy: "active_calories_kcal",
  active_calories: "active_calories_kcal",
  active_energy_burned: "active_calories_kcal",
  activeenergyburned: "active_calories_kcal",
  // Other
  vo2_max: "vo2_max",
  vo2max: "vo2_max",
  body_fat_percentage: "body_fat_pct",
  body_fat_pct: "body_fat_pct",
  bodyfatpercentage: "body_fat_pct",
  sleep_score: "sleep_score",
}

// Metrics where we should SUM all entries (per source/period) instead of taking the last one
const HAE_SUM_METRICS = new Set(["steps", "active_calories_kcal"])

function parseHAEDate(raw: string | undefined): string | null {
  if (!raw) return null
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  const d = new Date(raw)
  if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
  return null
}

function lastEntry(metric: HAEMetric): HAEEntry | null {
  const entries = metric.data ?? []
  if (!entries.length) return null
  // HAE typically sorts oldest→newest; pick the last with a value
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i]
    if (
      e.qty != null ||
      e.asleep != null ||
      e.inBed != null
    ) return e
  }
  return null
}

function translateHAE(body: HAEBody): Native | null {
  const metrics = body.data?.metrics ?? []
  if (!metrics.length) return null

  const out: Partial<Native> = {}
  let latestDate: string | null = null

  for (const m of metrics) {
    const name = (m.name ?? "").toLowerCase().replace(/[\s\-]+/g, "_")
    const entries = m.data ?? []

    // Use last entry's date for the overall record date
    const lastE = lastEntry(m)
    if (lastE) {
      const date = parseHAEDate(lastE.date)
      if (date && (latestDate == null || date > latestDate)) latestDate = date
    }

    if (name === "sleep_analysis") {
      const entry = lastEntry(m)
      if (!entry) continue
      const min = entry.asleep ?? entry.inBed
      if (typeof min === "number") out.sleep_duration_min = min
      continue
    }

    const mapped = HAE_METRIC_MAP[name]
    if (!mapped) continue

    if (HAE_SUM_METRICS.has(mapped as string)) {
      // Sum across all entries/sources (e.g. iPhone + Watch steps)
      const total = entries.reduce((acc, e) => acc + (typeof e.qty === "number" ? e.qty : 0), 0)
      if (total > 0) {
        const existing = (out as Record<string, number>)[mapped as string] ?? 0
        ;(out as Record<string, number>)[mapped as string] = existing + total
      }
    } else {
      // Point-in-time measurement: take the last valid entry
      const entry = lastEntry(m)
      if (entry && typeof entry.qty === "number") {
        ;(out as Record<string, number>)[mapped as string] = entry.qty
      }
    }
  }

  if (!latestDate) latestDate = new Date().toISOString().split("T")[0]
  return { date: latestDate, ...out } as Native
}

/* ---------------- Handler ---------------- */

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 })
  const token = m[1].trim()

  const supabase = createAdminClient()
  const { data: integ } = await supabase
    .from("user_integrations")
    .select("user_id")
    .eq("apple_health_api_key", token)
    .maybeSingle()
  if (!integ) return NextResponse.json({ error: "Invalid key" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Detect format: HAE has `data.metrics`, native has top-level fields.
  let normalized: Native | null = null
  const obj = body as Record<string, unknown>
  const isHAE = obj && typeof obj === "object" && obj.data && (obj.data as Record<string, unknown>).metrics

  if (isHAE) {
    normalized = translateHAE(obj as HAEBody)
    if (!normalized) {
      return NextResponse.json({ error: "HAE payload had no usable metrics", received: obj }, { status: 400 })
    }
  } else {
    // Add today as fallback date if missing
    if (obj && typeof obj === "object" && !obj.date) {
      obj.date = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" })
    }
    const parsed = native.safeParse(obj)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten(), received: obj }, { status: 400 })
    }
    normalized = parsed.data
  }

  // Final parse — lenient, just extract what we can
  const finalParsed = native.safeParse(normalized)
  if (!finalParsed.success) {
    return NextResponse.json({ error: finalParsed.error.flatten(), received: normalized }, { status: 400 })
  }
  const p = finalParsed.data

  // Merge against existing row for this date so partial pushes (e.g. only weight)
  // don't blow away earlier readiness signals.
  const { data: existing } = await supabase
    .from("health_entries")
    .select("hrv_ms, sleep_duration_min, sleep_score, resting_heart_rate, readiness_score, steps, active_calories_kcal")
    .eq("user_id", integ.user_id)
    .eq("date", p.date)
    .maybeSingle()

  // 30-day baselines for readiness
  const start = new Date(p.date)
  start.setDate(start.getDate() - 30)
  const startISO = start.toISOString().split("T")[0]
  const { data: history } = await supabase
    .from("health_entries")
    .select("hrv_ms, resting_heart_rate")
    .eq("user_id", integ.user_id)
    .gte("date", startISO)
    .lt("date", p.date)
  const hrvVals = (history ?? [])
    .map((h) => h.hrv_ms)
    .filter((n): n is number => typeof n === "number")
  const rhrVals = (history ?? [])
    .map((h) => h.resting_heart_rate)
    .filter((n): n is number => typeof n === "number")
  const hrvAvg = hrvVals.length ? hrvVals.reduce((a, b) => a + b, 0) / hrvVals.length : null
  const rhrAvg = rhrVals.length ? rhrVals.reduce((a, b) => a + b, 0) / rhrVals.length : null

  // new value > existing > null
  const hrv = p.hrv_ms ?? existing?.hrv_ms ?? null
  const sleepMin = p.sleep_duration_min ?? existing?.sleep_duration_min ?? null
  const sleepScore = p.sleep_score ?? existing?.sleep_score ?? null
  const rhr = p.resting_heart_rate ?? existing?.resting_heart_rate ?? null
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

  const patch: Record<string, unknown> = {
    user_id: integ.user_id,
    date: p.date,
  }
  if (hasSignal) patch.readiness_score = score
  if (p.hrv_ms != null) patch.hrv_ms = intOrNull(p.hrv_ms)
  if (p.sleep_duration_min != null) patch.sleep_duration_min = intOrNull(p.sleep_duration_min)
  if (p.resting_heart_rate != null) patch.resting_heart_rate = intOrNull(p.resting_heart_rate)
  if (p.sleep_quality != null) patch.sleep_quality = p.sleep_quality
  if (p.sleep_score != null) patch.sleep_score = p.sleep_score
  if (p.wake_time != null) patch.wake_time = p.wake_time
  if (p.weight_kg != null) patch.weight_kg = p.weight_kg
  if (p.steps != null) patch.steps = Math.max(intOrNull(p.steps) ?? 0, existing?.steps ?? 0)
  if (p.active_calories_kcal != null)
    patch.active_calories_kcal = Math.max(
      intOrNull(p.active_calories_kcal) ?? 0,
      existing?.active_calories_kcal ?? 0,
    )
  if (p.vo2_max != null) patch.vo2_max = p.vo2_max
  if (p.body_fat_pct != null) patch.body_fat_pct = p.body_fat_pct
  if (p.systolic_bp != null) patch.systolic_bp = p.systolic_bp
  if (p.diastolic_bp != null) patch.diastolic_bp = p.diastolic_bp
  if (p.mood != null) patch.mood = p.mood

  const { error } = await supabase
    .from("health_entries")
    .upsert(patch as never, { onConflict: "user_id,date" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidatePath("/health")
  revalidatePath("/today")
  return NextResponse.json({
    ok: true,
    readiness_score: score,
    received: {
      date: p.date,
      hrv_ms: p.hrv_ms ?? null,
      sleep_duration_min: p.sleep_duration_min ?? null,
      resting_heart_rate: p.resting_heart_rate ?? null,
      steps: p.steps ?? null,
      weight_kg: p.weight_kg ?? null,
      active_calories_kcal: p.active_calories_kcal ?? null,
    },
  })
}
