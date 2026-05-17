/**
 * Readiness score
 *   HRV        50%  (vs 30-day average — higher = better recovery)
 *   Sleep      30%  (sleep_score if available, else duration heuristic)
 *   Resting HR 20%  (vs 30-day average — lower = better recovery)
 *
 * Score < 65 → red (Herstel), 65–84 → amber (Normaal), 85+ → green (Push)
 */

export type ReadinessInput = {
  hrv_ms:              number | null
  sleep_duration_min:  number | null
  sleep_score?:        number | null   // 0-100; if provided replaces duration heuristic
  resting_heart_rate:  number | null
  hrv_30d_avg?:        number | null
  rhr_30d_avg?:        number | null
}

export type ReadinessFactor = {
  name:      string
  value:     string        // human-readable measurement
  sub:       number        // 0-100 sub-score for this factor
  weight:    number        // percentage weight (50 / 30 / 20)
  baseline?: string        // e.g. "62 ms 30d avg"
}

export type ReadinessBreakdown = {
  score:          number
  factors:        ReadinessFactor[]
  missingFactors: string[]   // signals not available yet
}

export function readinessBreakdown(input: ReadinessInput): ReadinessBreakdown {
  const factors:        ReadinessFactor[] = []
  const missingFactors: string[]          = []
  let total  = 0
  let weight = 0

  // ── HRV  (50%) ────────────────────────────────────────────────────────────
  if (input.hrv_ms != null) {
    const baseline = input.hrv_30d_avg ?? 60
    const ratio    = input.hrv_ms / baseline
    const sub      = Math.max(0, Math.min(100, ratio * 80))
    total  += sub * 0.5
    weight += 0.5
    factors.push({
      name:     "HRV",
      value:    `${input.hrv_ms} ms`,
      sub:      Math.round(sub),
      weight:   50,
      baseline: `${Math.round(baseline)} ms 30d gem`,
    })
  } else {
    missingFactors.push("HRV")
  }

  // ── Sleep  (30%) ─────────────────────────────────────────────────────────
  if (input.sleep_score != null) {
    const sub = Math.max(0, Math.min(100, input.sleep_score))
    total  += sub * 0.3
    weight += 0.3
    factors.push({
      name:   "Slaapscore",
      value:  `${input.sleep_score}/100`,
      sub:    Math.round(sub),
      weight: 30,
    })
  } else if (input.sleep_duration_min != null) {
    const h   = input.sleep_duration_min / 60
    const sub = h >= 7.5 ? 100
              : h >= 7   ? 85
              : h >= 6.5 ? 70
              : h >= 6   ? 55
              : h >= 5   ? 35
              :             15
    total  += sub * 0.3
    weight += 0.3
    const hStr = `${Math.floor(h)}u ${Math.round((h % 1) * 60)}m`
    factors.push({
      name:   "Slaap",
      value:  hStr,
      sub:    Math.round(sub),
      weight: 30,
    })
  } else {
    missingFactors.push("Slaap")
  }

  // ── Resting HR  (20%) ────────────────────────────────────────────────────
  if (input.resting_heart_rate != null) {
    const baseline = input.rhr_30d_avg ?? 55
    const diff     = baseline - input.resting_heart_rate
    const sub      = Math.max(0, Math.min(100, 70 + diff * 4))
    total  += sub * 0.2
    weight += 0.2
    factors.push({
      name:     "Rusthartslag",
      value:    `${input.resting_heart_rate} bpm`,
      sub:      Math.round(sub),
      weight:   20,
      baseline: `${Math.round(baseline)} bpm 30d gem`,
    })
  } else {
    missingFactors.push("Rusthartslag")
  }

  const score = weight === 0 ? 0 : Math.round(total / weight)
  return { score, factors, missingFactors }
}

/** Thin wrapper — kept for callers that only need the number. */
export function readinessScore(input: ReadinessInput): number {
  return readinessBreakdown(input).score
}

export type ReadinessZone = "red" | "amber" | "green"

export function readinessZone(score: number): ReadinessZone {
  if (score >= 85) return "green"
  if (score >= 65) return "amber"
  return "red"
}

/**
 * Compute a sleep score (0-100) from Apple Health sleep-stage data.
 * Uses three components:
 *   Duration   40%  — total sleep vs target (7-9h)
 *   Quality    40%  — (deep + REM) as % of total sleep
 *   Continuity 20%  — awake time as % of total sleep (lower = better)
 */
export function sleepScore(
  totalHr: number,
  deepHr:  number,
  remHr:   number,
  awakeHr: number,
): number {
  if (totalHr <= 0) return 0

  // Duration
  const dur = totalHr >= 7.5 ? 100
            : totalHr >= 7   ?  90
            : totalHr >= 6.5 ?  75
            : totalHr >= 6   ?  60
            : totalHr >= 5   ?  40
            :                    20

  // Quality — deep + REM percentage
  // Calibrated against Apple Health sleep scores: 34% deep+REM → 98, 35% → 95
  const qualPct = (deepHr + remHr) / totalHr
  const qual = qualPct >= 0.35 ? 100
             : qualPct >= 0.27 ?  95
             : qualPct >= 0.20 ?  75
             : qualPct >= 0.13 ?  50
             :                    25

  // Continuity — awake percentage (lower is better)
  const awakePct = awakeHr / totalHr
  const cont = awakePct < 0.05 ? 100
             : awakePct < 0.10 ?  85
             : awakePct < 0.15 ?  70
             : awakePct < 0.20 ?  50
             :                    25

  return Math.round(dur * 0.4 + qual * 0.4 + cont * 0.2)
}
