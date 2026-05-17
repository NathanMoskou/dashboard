/**
 * Life Score:
 *   70%  Habits     (habits-completed today / total active habits)
 *   30%  Deep Work  (deep_work hours today / daily goal)
 *
 * Previous formula also weighted Readiness (HRV + sleep) at 40%, fed by
 * Apple Health. The user moved bio-signal tracking to Bevel, so the
 * Life Score now reflects only the parts the app owns end-to-end.
 */

export type LifeScoreInput = {
  habitsDone: number
  habitsTotal: number
  deepWorkHours: number
  deepWorkGoalH: number
}

export function lifeScore(input: LifeScoreInput): number {
  const habitsRatio =
    input.habitsTotal === 0 ? 0 : Math.min(1, input.habitsDone / input.habitsTotal)
  const dwRatio =
    input.deepWorkGoalH === 0 ? 0 : Math.min(1, input.deepWorkHours / input.deepWorkGoalH)
  const total = habitsRatio * 100 * 0.7 + dwRatio * 100 * 0.3
  return Math.round(total)
}

export function lifeScoreZone(score: number): "muted" | "neutral" | "good" | "great" {
  if (score >= 90) return "great"
  if (score >= 75) return "good"
  if (score >= 50) return "neutral"
  return "muted"
}
