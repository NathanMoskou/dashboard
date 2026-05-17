"use client"
import { useRef, useState, useTransition } from "react"
import { unzipSync, strFromU8 } from "fflate"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { importHealthEntries, importWorkouts, type HealthInput, type WorkoutInput } from "./actions"
import { sleepScore as computeSleepScore } from "@/lib/readiness"

// ─── CSV parser ───────────────────────────────────────────────────────────────

const FIELD_MAP: Record<string, keyof Omit<HealthInput, "date">> = {
  hrv_ms:               "hrv_ms",
  hrv:                  "hrv_ms",
  sleep_duration_min:   "sleep_duration_min",
  sleep_min:            "sleep_duration_min",
  sleep_score:          "sleep_score",
  resting_heart_rate:   "resting_heart_rate",
  rhr:                  "resting_heart_rate",
  wake_time:            "wake_time",
  weight_kg:            "weight_kg",
  weight:               "weight_kg",
  steps:                "steps",
  active_calories_kcal: "active_calories_kcal",
  active_calories:      "active_calories_kcal",
  kcal:                 "active_calories_kcal",
  vo2_max:              "vo2_max",
  body_fat_pct:         "body_fat_pct",
  body_fat:             "body_fat_pct",
  systolic_bp:          "systolic_bp",
  diastolic_bp:         "diastolic_bp",
  mood:                 "mood",
}

const NUM_FIELDS = new Set<keyof Omit<HealthInput, "date">>([
  "hrv_ms", "sleep_duration_min", "sleep_score", "resting_heart_rate",
  "weight_kg", "steps", "active_calories_kcal", "vo2_max",
  "body_fat_pct", "systolic_bp", "diastolic_bp", "mood",
])

function normaliseDate(raw: string): string {
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("-"); return `${y}-${m}-${d}`
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [m, d, y] = raw.split("/"); return `${y}-${m}-${d}`
  }
  return raw
}

function parseCSV(text: string): HealthInput[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"))
  const dateIdx = headers.findIndex((h) => h === "date" || h === "datum")
  if (dateIdx === -1) throw new Error('No "date" column found in CSV')

  const colMap = headers.map((h, i): { col: number; field: keyof Omit<HealthInput, "date"> } | null => {
    if (i === dateIdx) return null
    const field = FIELD_MAP[h]
    return field ? { col: i, field } : null
  })

  const entries: HealthInput[] = []
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((c) => c.trim())
    const rawDate = row[dateIdx]
    if (!rawDate) continue
    const date = normaliseDate(rawDate)
    const entry: HealthInput = { date }
    for (const mapping of colMap) {
      if (!mapping) continue
      const raw = row[mapping.col]
      if (!raw || raw === "" || raw === "-") continue
      if (NUM_FIELDS.has(mapping.field)) {
        const n = parseFloat(raw)
        if (!isNaN(n)) (entry as Record<string, unknown>)[mapping.field] = n
      } else {
        (entry as Record<string, unknown>)[mapping.field] = raw
      }
    }
    entries.push(entry)
  }
  return entries
}

// ─── Apple Health XML parser ─────────────────────────────────────────────────

// Maps Apple Health HKQuantityType identifiers to our fields + how to aggregate
const AH_QUANTITY: Record<string, {
  field: keyof Omit<HealthInput, "date">
  agg: "avg" | "sum" | "last"
  factor?: number   // multiply value by this (e.g. body fat 0-1 → 0-100)
}> = {
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: { field: "hrv_ms",               agg: "avg"  },
  HKQuantityTypeIdentifierRestingHeartRate:         { field: "resting_heart_rate",    agg: "avg"  },
  HKQuantityTypeIdentifierBodyMass:                 { field: "weight_kg",             agg: "last" },
  HKQuantityTypeIdentifierStepCount:                { field: "steps",                 agg: "sum"  },
  HKQuantityTypeIdentifierActiveEnergyBurned:       { field: "active_calories_kcal",  agg: "sum"  },
  HKQuantityTypeIdentifierVO2Max:                   { field: "vo2_max",               agg: "last" },
  HKQuantityTypeIdentifierBodyFatPercentage:        { field: "body_fat_pct",           agg: "last", factor: 100 },
  HKQuantityTypeIdentifierBloodPressureSystolic:    { field: "systolic_bp",            agg: "last" },
  HKQuantityTypeIdentifierBloodPressureDiastolic:   { field: "diastolic_bp",           agg: "last" },
}

// Sleep: asleep categories (not "InBed")
const AH_SLEEP_ASLEEP = new Set([
  "HKCategoryValueSleepAnalysisAsleepCore",
  "HKCategoryValueSleepAnalysisAsleepDeep",
  "HKCategoryValueSleepAnalysisAsleepREM",
  "HKCategoryValueSleepAnalysisAsleepUnspecified",
  "HKCategoryValueSleepAnalysisAsleep", // older iOS
])

// Extract the value of a named XML attribute from the attribute string of a tag
function attr(attrs: string, name: string): string {
  const m = attrs.match(new RegExp(`${name}="([^"]*)"`) )
  return m ? m[1] : ""
}

// Parse date string "2024-01-15 08:30:00 +0100" → Date object
function ahDate(s: string): Date {
  // Replace space with T, strip timezone offset, parse as local-ish
  return new Date(s.replace(" ", "T").replace(/ [+-]\d{4}$/, ""))
}

interface AggRow {
  sums:   Partial<Record<keyof Omit<HealthInput, "date">, number>>
  counts: Partial<Record<keyof Omit<HealthInput, "date">, number>>
  lasts:  Partial<Record<keyof Omit<HealthInput, "date">, number>>
  sleepMinutes: number   // accumulated asleep minutes for the night ending on this date
}

function parseAppleHealthXML(xml: string): HealthInput[] {
  const rows = new Map<string, AggRow>()

  const getRow = (date: string): AggRow => {
    if (!rows.has(date)) rows.set(date, { sums: {}, counts: {}, lasts: {}, sleepMinutes: 0 })
    return rows.get(date)!
  }

  // Match every <Record .../> element (self-closing, which covers 99%+ of Apple Health records)
  const re = /<Record\s([^>]+?)\/>/g
  let m: RegExpExecArray | null

  while ((m = re.exec(xml)) !== null) {
    const a = m[1]
    const type  = attr(a, "type")
    const start = attr(a, "startDate")
    const end   = attr(a, "endDate")
    const value = attr(a, "value")

    if (!start) continue

    // ── Quantity records ──────────────────────────────────────
    const mapping = AH_QUANTITY[type]
    if (mapping) {
      const n = parseFloat(value) * (mapping.factor ?? 1)
      if (isNaN(n)) continue
      const date = start.slice(0, 10) // "YYYY-MM-DD"
      const row = getRow(date)
      if (mapping.agg === "sum") {
        row.sums[mapping.field] = (row.sums[mapping.field] ?? 0) + n
      } else if (mapping.agg === "avg") {
        row.sums[mapping.field] = (row.sums[mapping.field] ?? 0) + n
        row.counts[mapping.field] = (row.counts[mapping.field] ?? 0) + 1
      } else {
        // "last" — keep overwriting; XML is roughly chronological
        row.lasts[mapping.field] = n
      }
      continue
    }

    // ── Sleep records ─────────────────────────────────────────
    if (type === "HKCategoryTypeIdentifierSleepAnalysis" && AH_SLEEP_ASLEEP.has(value)) {
      const startDt = ahDate(start)
      const endDt   = ahDate(end)
      const minutes = (endDt.getTime() - startDt.getTime()) / 60_000
      if (minutes > 0 && minutes < 720) { // sanity: 0-12h
        // Attribute sleep to the date of wake-up (endDate)
        const date = endDt.toISOString().slice(0, 10)
        getRow(date).sleepMinutes += minutes
      }
    }
  }

  // ── Collapse aggregations into HealthInput entries ────────────────────────
  const entries: HealthInput[] = []
  for (const [date, row] of rows) {
    const entry: HealthInput = { date }
    for (const [field, sum] of Object.entries(row.sums)) {
      const f = field as keyof Omit<HealthInput, "date">
      const count = row.counts[f]
      if (count) {
        // avg
        (entry as Record<string, unknown>)[f] = Math.round((sum / count) * 10) / 10
      } else {
        // sum
        (entry as Record<string, unknown>)[f] = Math.round(sum)
      }
    }
    for (const [field, last] of Object.entries(row.lasts)) {
      (entry as Record<string, unknown>)[field] = Math.round(last * 10) / 10
    }
    if (row.sleepMinutes > 0) {
      entry.sleep_duration_min = Math.round(row.sleepMinutes)
    }
    entries.push(entry)
  }

  return entries
}

// ─── Merge entries by date (last-write-wins per field) ───────────────────────
function mergeByDate(entries: HealthInput[]): HealthInput[] {
  const map = new Map<string, HealthInput>()
  for (const e of entries) {
    const existing = map.get(e.date)
    map.set(e.date, existing ? { ...existing, ...Object.fromEntries(
      Object.entries(e).filter(([, v]) => v != null && v !== "")
    ) } : e)
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

// ─── ZIP handler ─────────────────────────────────────────────────────────────

// Parse the wide "HealthAutoExport-*.csv" daily summary file (Dutch headers)
function parseHealthAutoExportCSV(text: string): HealthInput[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map((h) => h.trim())

  // Column name → our field mapping (Dutch header fragments)
  const DUTCH_MAP: Array<[string, keyof Omit<HealthInput, "date">, ((v: number) => number)?]> = [
    ["Hartslagvariabiliteit (ms)",       "hrv_ms"             ],
    ["Rusthartslag (count/min)",          "resting_heart_rate" ],
    ["Gewicht (kg)",                      "weight_kg"          ],
    ["Stappentelling (count)",            "steps",             Math.round],
    ["Lichaamsvetpercentage (%)",         "body_fat_pct",      (v) => Math.round(v * 10) / 10],
    ["VO2 Max (ml/(kg·min))",             "vo2_max"            ],
    ["Bloeddruk [Systolisch] (mmHg)",     "systolic_bp"        ],
    ["Bloeddruk [Diastolisch] (mmHg)",    "diastolic_bp"       ],
    // Total sleep duration in hours → minutes
    ["Slaap Analyse [Total] (hr)",        "sleep_duration_min", (v) => Math.round(v * 60)],
  ]

  // Sleep-stage columns needed to compute sleep_score
  const iSleepTotal = headers.indexOf("Slaap Analyse [Total] (hr)")
  const iSleepDeep  = headers.indexOf("Slaap Analyse [Diep] (hr)")
  const iSleepRem   = headers.indexOf("Slaap Analyse [REM] (hr)")
  const iSleepAwake = headers.indexOf("Slaap Analyse [Wakker] (hr)")

  const dateIdx = headers.findIndex((h) => h.startsWith("Datum"))
  if (dateIdx === -1) throw new Error("No date column found")

  const colMappings = DUTCH_MAP.map(([headerName, field, transform]) => {
    const col = headers.indexOf(headerName)
    return col !== -1 ? { col, field, transform } : null
  }).filter(Boolean) as Array<{ col: number; field: keyof Omit<HealthInput, "date">; transform?: (v: number) => number }>

  const entries: HealthInput[] = []
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",")
    const rawDate = row[dateIdx]?.trim()
    if (!rawDate) continue
    const date = rawDate.slice(0, 10) // "YYYY-MM-DD"

    const entry: HealthInput = { date }
    for (const { col, field, transform } of colMappings) {
      const raw = row[col]?.trim()
      if (!raw || raw === "") continue
      const n = parseFloat(raw)
      if (!isNaN(n) && n !== 0) {
        (entry as Record<string, unknown>)[field] = transform ? transform(n) : n
      }
    }

    // Compute sleep score from stages when all four columns are present
    if (iSleepTotal !== -1 && iSleepDeep !== -1 && iSleepRem !== -1 && iSleepAwake !== -1) {
      const total = parseFloat(row[iSleepTotal] ?? "")
      const deep  = parseFloat(row[iSleepDeep]  ?? "")
      const rem   = parseFloat(row[iSleepRem]   ?? "")
      const awake = parseFloat(row[iSleepAwake] ?? "")
      if (!isNaN(total) && total > 0) {
        entry.sleep_score = computeSleepScore(
          total,
          isNaN(deep)  ? 0 : deep,
          isNaN(rem)   ? 0 : rem,
          isNaN(awake) ? 0 : awake,
        )
      }
    }

    entries.push(entry)
  }
  return entries
}

async function parseZip(file: File): Promise<{
  healthEntries: HealthInput[]
  workoutEntries: WorkoutInput[]
  notes: string[]
}> {
  const notes: string[] = []
  const buffer = await file.arrayBuffer()
  const files  = unzipSync(new Uint8Array(buffer))

  const fileNames = Object.keys(files)
  notes.push(`Found ${fileNames.length} file(s) in ZIP`)

  const allHealth:   HealthInput[]  = []
  const allWorkouts: WorkoutInput[] = []

  const csvNames = fileNames.filter((n) => n.toLowerCase().endsWith(".csv") && !n.startsWith("__MACOSX"))

  // 1) Workout summary CSV: filename starts with "Workouts-"
  const workoutCsvName = csvNames.find((n) => {
    const base = n.split("/").pop() ?? n
    return base.startsWith("Workouts-")
  })
  if (workoutCsvName) {
    const text     = strFromU8(files[workoutCsvName])
    const workouts = parseWorkoutCSV(text)
    allWorkouts.push(...workouts)
    notes.push(`Parsed ${workouts.length} workout(s) from Workouts CSV`)
  }

  // 2) Health summary CSV: filename starts with "HealthAutoExport-"
  const healthCsvName = csvNames.find((n) => {
    const base = n.split("/").pop() ?? n
    return base.startsWith("HealthAutoExport-")
  })
  if (healthCsvName) {
    try {
      const text = strFromU8(files[healthCsvName])
      const rows = parseHealthAutoExportCSV(text)
      allHealth.push(...rows)
      notes.push(`Parsed ${rows.length} daily health record(s)`)
    } catch {
      // fall through to generic CSV parsing below
    }
  }

  // 3) Remaining CSVs that aren't workout per-metric files (those have format "{Type}-{Metric}-{ts}.csv")
  //    We skip per-workout metric CSVs (e.g. "Traditionele Krachttraining-Hartslag-*.csv") since
  //    all the useful aggregated data is already in the Workouts summary CSV.
  //    We also skip GPX files and the already-parsed summary files.
  const isPerWorkoutMetric = (name: string) => {
    const base = name.split("/").pop() ?? name
    return (
      !base.startsWith("Workouts-") &&
      !base.startsWith("HealthAutoExport-") &&
      !base.startsWith("ECG-") &&
      /^.+-.+-\d{8}_\d{6}\.csv$/.test(base)
    )
  }

  const otherCsvNames = csvNames.filter(
    (n) => !workoutCsvName || n !== workoutCsvName
  ).filter(
    (n) => !healthCsvName || n !== healthCsvName
  ).filter(
    (n) => !isPerWorkoutMetric(n)
  )

  if (otherCsvNames.length > 0) {
    let parsed = 0
    for (const name of otherCsvNames) {
      try {
        const text = strFromU8(files[name])
        const rows = parseCSV(text)
        allHealth.push(...rows)
        parsed += rows.length
      } catch {
        // not a health CSV format we understand — skip
      }
    }
    if (parsed > 0) notes.push(`Parsed ${parsed} rows from other CSV file(s)`)
  }

  // 4) Apple Health native export.xml
  const xmlName = fileNames.find((n) => n.endsWith("export.xml"))
  if (xmlName) {
    notes.push("Parsing Apple Health export.xml…")
    const xml     = strFromU8(files[xmlName])
    const xmlRows = parseAppleHealthXML(xml)
    allHealth.push(...xmlRows)
    notes.push(`Extracted ${xmlRows.length} daily records from export.xml`)
  }

  if (allHealth.length === 0 && allWorkouts.length === 0) {
    throw new Error("No supported files found in ZIP. Expected a HealthAutoExport ZIP or Apple Health export.zip.")
  }

  return {
    healthEntries:  mergeByDate(allHealth),
    workoutEntries: allWorkouts,
    notes,
  }
}

// ─── Workout CSV parser ───────────────────────────────────────────────────────

// Dutch workout type names from Health Auto Export → English display names
const WORKOUT_TYPE_MAP: Record<string, string> = {
  "Buiten Wandelen":                 "Outdoor Walk",
  "Wandelen":                        "Walk",
  "Hardlopen":                       "Running",
  "Buiten Hardlopen":                "Outdoor Running",
  "Traditionele Krachttraining":     "Strength Training",
  "Functionele Krachttraining":      "Functional Strength Training",
  "Fietsen":                         "Cycling",
  "Buiten Fietsen":                  "Outdoor Cycling",
  "Binnen Fietsen":                  "Indoor Cycling",
  "Zwemmen":                         "Swimming",
  "HIIT":                            "HIIT",
  "Yoga":                            "Yoga",
  "Eliptische Trainer":              "Elliptical",
  "Roeien":                          "Rowing",
  "Dansen":                          "Dancing",
  "Voetbal":                         "Football",
  "Basketball":                      "Basketball",
  "Tennis":                          "Tennis",
  "Squash":                          "Squash",
  "Badminton":                       "Badminton",
  "Boksen":                          "Boxing",
  "Vechtsport":                      "Martial Arts",
  "Pilates":                         "Pilates",
  "Klimmen":                         "Climbing",
  "Skiën":                           "Skiing",
  "Snowboarden":                     "Snowboarding",
  "Wandelen buiten":                 "Outdoor Walk",
  "Andere":                          "Other",
}

// HH:MM:SS or MM:SS → minutes
function parseDuration(s: string): number {
  const parts = s.trim().split(":").map(Number)
  if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60
  if (parts.length === 2) return parts[0] + parts[1] / 60
  return 0
}

// "Buiten" / "Binnen" → "outdoor" / "indoor"
function parseLocation(s: string): string | null {
  const l = s.trim().toLowerCase()
  if (l === "buiten") return "outdoor"
  if (l === "binnen") return "indoor"
  return s.trim() || null
}

// Parse the Workouts-*.csv summary file from Health Auto Export
function parseWorkoutCSV(text: string): WorkoutInput[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Normalise headers to a stable key
  const headers = lines[0].split(",").map((h) => h.trim())

  const idx = (names: string[]): number => {
    for (const name of names) {
      const i = headers.indexOf(name)
      if (i !== -1) return i
    }
    return -1
  }

  const iType     = idx(["Workout Type"])
  const iStart    = idx(["Start"])
  const iEnd      = idx(["End"])
  const iDur      = idx(["Duration"])
  const iActKJ    = idx(["Actieve Energie (kJ)"])
  const iRestKJ   = idx(["Rustenergie (kJ)"])
  const iMaxHR    = idx(["Max. Hartslag (count/min)"])
  const iAvgHR    = idx(["Gem. Hartslag (count/min)"])
  const iDist     = idx(["Afstand (km)"])
  const iSteps    = idx(["Stappentelling"])
  const iLoc      = idx(["Locatie"])

  if (iType === -1 || iStart === -1) return []

  const KJ_TO_KCAL = 0.239006

  const entries: WorkoutInput[] = []
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",")
    if (!row[iType]?.trim()) continue

    const rawType    = row[iType].trim()
    const workoutType = WORKOUT_TYPE_MAP[rawType] ?? rawType
    const startRaw   = row[iStart]?.trim()
    const endRaw     = iEnd !== -1 ? row[iEnd]?.trim() : ""
    const durRaw     = iDur !== -1 ? row[iDur]?.trim() : ""
    const durationMin = parseDuration(durRaw)

    // Skip bogus entries (> 4 hours is almost certainly a data error)
    if (durationMin > 240) continue
    if (!startRaw) continue

    // Dates from Health Auto Export: "2026-05-11 10:22" — treat as local and add :00
    const toISO = (s: string) => s.length === 16 ? s + ":00" : s

    const n = (colIdx: number): number | null => {
      if (colIdx === -1) return null
      const v = parseFloat(row[colIdx])
      return isNaN(v) || v === 0 ? null : v
    }

    const entry: WorkoutInput = {
      workout_type: workoutType,
      start_time:   toISO(startRaw),
      end_time:     toISO(endRaw || startRaw),
      duration_min: Math.round(durationMin * 10) / 10,
    }

    const actKJ  = n(iActKJ)
    const restKJ = n(iRestKJ)
    if (actKJ  != null) entry.active_kcal  = Math.round(actKJ  * KJ_TO_KCAL)
    if (restKJ != null) entry.resting_kcal = Math.round(restKJ * KJ_TO_KCAL)

    const avgHR = n(iAvgHR)
    const maxHR = n(iMaxHR)
    if (avgHR != null) entry.avg_hr = Math.round(avgHR * 10) / 10
    if (maxHR != null) entry.max_hr = Math.round(maxHR)

    const dist  = n(iDist)
    const steps = iSteps !== -1 ? Math.round(parseFloat(row[iSteps]) || 0) : null
    if (dist  != null && dist  > 0) entry.distance_km = Math.round(dist * 100) / 100
    if (steps != null && steps > 0) entry.steps       = steps

    if (iLoc !== -1) entry.location = parseLocation(row[iLoc])

    entries.push(entry)
  }
  return entries
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export function buildExportCSV(rows: HealthInput[]): string {
  const headers = [
    "date", "hrv_ms", "sleep_duration_min", "sleep_score", "resting_heart_rate",
    "wake_time", "weight_kg", "steps", "active_calories_kcal",
    "vo2_max", "body_fat_pct", "systolic_bp", "diastolic_bp", "mood",
  ]
  const lines = [headers.join(",")]
  for (const r of rows) {
    lines.push(headers.map((h) => (r as Record<string, unknown>)[h] ?? "").join(","))
  }
  return lines.join("\n")
}

const TEMPLATE_CSV = `date,hrv_ms,sleep_duration_min,sleep_score,resting_heart_rate,wake_time,weight_kg,steps,active_calories_kcal,vo2_max,body_fat_pct,mood
2026-05-12,62,450,85,52,07:15,78.5,9230,420,48.2,15.1,8
2026-05-11,55,420,78,56,07:45,78.7,7400,310,,15.3,7`

// ─── Component ───────────────────────────────────────────────────────────────

interface Props { exportRows: HealthInput[] }

export function HealthImport({ exportRows }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ type: "idle" | "processing" | "ok" | "error"; msg?: string }>({ type: "idle" })
  const [pending, startTransition] = useTransition()

  function handleExport() {
    const csv = buildExportCSV(exportRows)
    const blob = new Blob([csv], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = `health-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  function handleTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement("a")
    a.href = url; a.download = "health-template.csv"
    a.click(); URL.revokeObjectURL(url)
  }

  async function handleImport() {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setStatus({ type: "processing", msg: "Reading file…" })

    let healthEntries: HealthInput[] = []
    let workoutEntries: WorkoutInput[] = []

    try {
      if (file.name.toLowerCase().endsWith(".zip")) {
        setStatus({ type: "processing", msg: "Unzipping…" })
        const result = await parseZip(file)
        healthEntries  = result.healthEntries
        workoutEntries = result.workoutEntries
        setStatus({ type: "processing", msg: result.notes[result.notes.length - 1] })
      } else {
        const text = await file.text()
        // Could be the Workouts summary CSV or a health CSV — detect by header
        const firstLine = text.split("\n")[0]
        if (firstLine.startsWith("Workout Type,")) {
          workoutEntries = parseWorkoutCSV(text)
        } else {
          healthEntries = parseCSV(text)
        }
      }
    } catch (err) {
      setStatus({ type: "error", msg: String(err) })
      return
    }

    if (!healthEntries.length && !workoutEntries.length) {
      setStatus({ type: "error", msg: "No valid rows found in the file." })
      return
    }

    startTransition(async () => {
      const results: string[] = []
      if (healthEntries.length) {
        const res = await importHealthEntries(healthEntries)
        if (!res.ok) { setStatus({ type: "error", msg: res.error }); return }
        results.push(`${res.count} health entries`)
      }
      if (workoutEntries.length) {
        const res = await importWorkouts(workoutEntries)
        if (!res.ok) { setStatus({ type: "error", msg: res.error }); return }
        results.push(`${res.count} workouts`)
      }
      setStatus({ type: "ok", msg: `Imported ${results.join(" and ")}.` })
      if (fileRef.current) fileRef.current.value = ""
    })
  }

  const busy = status.type === "processing" || pending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import &amp; Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upload row */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.zip,text/csv,application/zip"
              className="sr-only"
              onChange={() => setStatus({ type: "idle" })}
            />
            Kies CSV of ZIP
          </label>
          <Button
            type="button"
            onClick={handleImport}
            disabled={busy}
            className="rounded-full"
            size="sm"
          >
            {busy ? (status.msg ?? "Bezig…") : "Importeren"}
          </Button>
          {status.type === "ok" && (
            <span className="text-xs text-good">{status.msg}</span>
          )}
          {status.type === "error" && (
            <span className="text-xs text-bad">{status.msg}</span>
          )}
        </div>

        {/* Export / template */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
          <Button type="button" variant="ghost" size="sm" onClick={handleExport} className="rounded-full">
            Exporteer data
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleTemplate} className="rounded-full">
            Download template
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
