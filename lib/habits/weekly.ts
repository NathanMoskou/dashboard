/**
 * Weekly-target habit math.
 *
 * Some habits (gym, lange wandeling) aren't meant to be daily — the user
 * sets `target_per_week` from 1..6 and the habit is "done for the week"
 * once that many completions land in the current Mon–Sun week.
 *
 * Daily habits keep `target_per_week = null` and use the old per-day logic.
 *
 * These helpers are pure and run on both server and client.
 */

/** ISO date (YYYY-MM-DD) of the Monday of the week containing `date`. */
export function startOfIsoWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  // 0=Sun..6=Sat → Monday=1, so jsDow=0 → diff=-6
  const jsDow = d.getDay()
  const diff = jsDow === 0 ? -6 : 1 - jsDow
  d.setDate(d.getDate() + diff)
  return d
}

export function startOfIsoWeekISO(date: Date): string {
  return startOfIsoWeek(date).toISOString().slice(0, 10)
}

/** Inclusive list of YYYY-MM-DD strings for the 7-day week containing `date`. */
export function isoWeekDates(date: Date): string[] {
  const start = startOfIsoWeek(date)
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export type WeeklyHabit = {
  id: string
  target_per_week: number | null
  quantity_target: number | null
}

export type WeekCompletion = {
  habit_item_id: string
  date: string
  was_skipped: boolean | null
  quantity_value: number | null
}

/**
 * For a weekly-target habit, count completions in the current week that
 * count as "done" — same definition as the daily check (skipped doesn't
 * count, quantity habits need to hit their daily target).
 */
export function weekHits(
  habit: WeeklyHabit,
  completions: WeekCompletion[],
  weekDates: Set<string>,
): number {
  if (habit.target_per_week == null) return 0
  let n = 0
  for (const c of completions) {
    if (c.habit_item_id !== habit.id) continue
    if (!weekDates.has(c.date)) continue
    if (c.was_skipped) continue
    const ok = habit.quantity_target != null
      ? (c.quantity_value ?? 0) >= Number(habit.quantity_target)
      : true
    if (ok) n++
  }
  return n
}

/**
 * For weekly-target habits, "done for today" = target already met for the
 * week. Once the user hits gym 3× on Mon/Wed/Fri, the gym habit drops out
 * of "Nog te doen" until next Monday.
 */
export function isWeeklyTargetMet(
  habit: WeeklyHabit,
  completions: WeekCompletion[],
  weekDates: Set<string>,
): boolean {
  if (habit.target_per_week == null) return false
  return weekHits(habit, completions, weekDates) >= habit.target_per_week
}
