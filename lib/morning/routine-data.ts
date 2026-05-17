import { createClient } from "@/lib/supabase/server"
import { DEFAULT_ROUTINE, type RoutineBlock } from "./routines"

/**
 * Load the signed-in user's routine blocks from Supabase. On first access
 * (zero rows for this user) we seed the legacy DEFAULT_ROUTINE so existing
 * users land on the familiar five blocks and can edit from there.
 */
export async function loadRoutineForUser(): Promise<RoutineBlock[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEFAULT_ROUTINE

  const { data: rows } = await supabase
    .from("routine_blocks")
    .select("*")
    .eq("user_id", user.id)
    .order("display_order", { ascending: true })

  if (rows && rows.length > 0) return rows.map(rowToBlock)

  // First-time use: seed defaults so the user has something to edit
  const seedPayload = DEFAULT_ROUTINE.map((b, i) => ({
    user_id: user.id,
    title: b.title,
    start_h: b.startH,
    start_m: b.startM,
    end_h: b.endH,
    end_m: b.endM,
    color_id: b.colorId,
    display_order: i,
  }))
  const { data: seeded, error } = await supabase
    .from("routine_blocks")
    .insert(seedPayload)
    .select()
    .order("display_order", { ascending: true })
  if (error || !seeded) return DEFAULT_ROUTINE
  return seeded.map(rowToBlock)
}

type Row = {
  id: string
  title: string
  start_h: number
  start_m: number
  end_h: number
  end_m: number
  color_id: string
}

function rowToBlock(r: Row): RoutineBlock {
  return {
    id: r.id,
    title: r.title,
    startH: r.start_h,
    startM: r.start_m,
    endH: r.end_h,
    endM: r.end_m,
    colorId: r.color_id,
  }
}
