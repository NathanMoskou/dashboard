"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

/**
 * Add a new routine block at the bottom of the list. Time bounds are
 * clamped to 0..23h / 0..59m server-side so invalid keystrokes can't
 * sneak past the form input constraints.
 */
export async function addRoutineBlock(input: {
  title: string
  startH: number
  startM: number
  endH: number
  endM: number
  colorId?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: "Niet ingelogd" }

  const clean = sanitize(input)
  if (!clean.title.trim()) return { ok: false as const, error: "Titel verplicht" }

  // Append: find current max display_order and add 1
  const { data: last } = await supabase
    .from("routine_blocks")
    .select("display_order")
    .eq("user_id", user.id)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  const next = (last?.display_order ?? -1) + 1

  await supabase.from("routine_blocks").insert({
    user_id: user.id,
    title: clean.title,
    start_h: clean.startH,
    start_m: clean.startM,
    end_h: clean.endH,
    end_m: clean.endM,
    color_id: clean.colorId,
    display_order: next,
  })
  revalidatePath("/focus")
  revalidatePath("/focus/routine")
  return { ok: true as const }
}

export async function updateRoutineBlock(id: string, fields: {
  title?: string
  startH?: number
  startM?: number
  endH?: number
  endM?: number
  colorId?: string
}) {
  const supabase = await createClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (fields.title !== undefined) patch.title = fields.title.trim()
  if (fields.startH !== undefined) patch.start_h = clamp(fields.startH, 0, 23)
  if (fields.startM !== undefined) patch.start_m = clamp(fields.startM, 0, 59)
  if (fields.endH !== undefined) patch.end_h = clamp(fields.endH, 0, 23)
  if (fields.endM !== undefined) patch.end_m = clamp(fields.endM, 0, 59)
  if (fields.colorId !== undefined) patch.color_id = fields.colorId

  const { error } = await supabase.from("routine_blocks").update(patch).eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/focus")
  revalidatePath("/focus/routine")
  return { ok: true as const }
}

export async function deleteRoutineBlock(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("routine_blocks").delete().eq("id", id)
  if (error) return { ok: false as const, error: error.message }
  revalidatePath("/focus")
  revalidatePath("/focus/routine")
  return { ok: true as const }
}

export async function reorderRoutineBlocks(orderedIds: string[]) {
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from("routine_blocks").update({ display_order: idx }).eq("id", id),
    ),
  )
  revalidatePath("/focus")
  revalidatePath("/focus/routine")
  return { ok: true as const }
}

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, Math.round(n)))
}

function sanitize(input: {
  title: string
  startH: number
  startM: number
  endH: number
  endM: number
  colorId?: string
}) {
  return {
    title: input.title.trim(),
    startH: clamp(input.startH, 0, 23),
    startM: clamp(input.startM, 0, 59),
    endH: clamp(input.endH, 0, 23),
    endM: clamp(input.endM, 0, 59),
    colorId: input.colorId ?? "9",
  }
}
