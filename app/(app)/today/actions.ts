"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

/**
 * Upsert today's deep-work override row. Setting `skipped: true` makes the
 * day count 100% Habits. Setting `manualHours` overrides the focus_sessions
 * sum (useful when the user worked offline / on paper). Pass `null` to a
 * field to clear that override.
 */
export async function setDeepWorkOverride(input: {
  date: string
  manualHours: number | null
  skipped: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "unauthorized" }

  await supabase.from("daily_overrides").upsert(
    {
      user_id: user.id,
      date: input.date,
      deep_work_hours_manual: input.manualHours,
      deep_work_skipped: input.skipped,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  )
  revalidatePath("/today")
  return { ok: true as const }
}
