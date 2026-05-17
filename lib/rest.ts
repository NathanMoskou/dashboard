import type { Database } from "@/types/database"

type RestConfig = Database["public"]["Tables"]["rest_config"]["Row"]

const FALLBACK = {
  compound_low_reps_s: 240,
  compound_mid_reps_s: 180,
  compound_high_reps_s: 120,
  isolation_low_reps_s: 120,
  isolation_mid_reps_s: 90,
  isolation_high_reps_s: 60,
}

export function restSeconds(
  category: "compound" | "isolation",
  reps: number,
  cfg: Partial<RestConfig> | null,
  override: number | null,
): number {
  if (override && override > 0) return override
  const c = { ...FALLBACK, ...(cfg ?? {}) }
  if (category === "compound") {
    if (reps <= 5) return c.compound_low_reps_s ?? FALLBACK.compound_low_reps_s
    if (reps <= 10) return c.compound_mid_reps_s ?? FALLBACK.compound_mid_reps_s
    return c.compound_high_reps_s ?? FALLBACK.compound_high_reps_s
  }
  if (reps <= 5) return c.isolation_low_reps_s ?? FALLBACK.isolation_low_reps_s
  if (reps <= 10) return c.isolation_mid_reps_s ?? FALLBACK.isolation_mid_reps_s
  return c.isolation_high_reps_s ?? FALLBACK.isolation_high_reps_s
}

export function warmupSets(workingWeight: number): { weight: number; reps: number }[] {
  const round = (n: number) => Math.round(n * 2) / 2
  return [
    { weight: round(workingWeight * 0.4), reps: 10 },
    { weight: round(workingWeight * 0.6), reps: 6 },
    { weight: round(workingWeight * 0.8), reps: 3 },
  ]
}
