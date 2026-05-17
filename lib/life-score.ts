/**
 * Life Score per SPEC:
 *   40%  Readiness  (HRV + sleep)
 *   40%  Habits     (habits-completed today / total active habits)
 *   20%  Deep Work  (deep_work hours today / daily goal)
 */

export type LifeScoreInput = {
  readiness?: number | null
  habitsDone: number
  habitsTotal: number
  deepWorkHours: number
  deepWorkGoalH: number
}

export function lifeScore(input: LifeScoreInput): number {
  const r = input.readiness ?? 0
  const habitsRatio =
    input.habitsTotal === 0 ? 0 : Math.min(1, input.habitsDone / input.habitsTotal)
  const dwRatio =
    input.deepWorkGoalH === 0 ? 0 : Math.min(1, input.deepWorkHours / input.deepWorkGoalH)
  const total = r * 0.4 + habitsRatio * 100 * 0.4 + dwRatio * 100 * 0.2
  return Math.round(total)
}

export function lifeScoreZone(score: number): "muted" | "neutral" | "good" | "great" {
  if (score >= 90) return "great"
  if (score >= 75) return "good"
  if (score >= 50) return "neutral"
  return "muted"
}
