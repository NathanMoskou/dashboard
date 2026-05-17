"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function toggleHabit(habitId: string, date: string, currentlyDone: boolean) {
  const supabase = await createClient()
  if (currentlyDone) {
    await supabase
      .from("habit_completions")
      .delete()
      .eq("habit_item_id", habitId)
      .eq("date", date)
  } else {
    await supabase.from("habit_completions").upsert(
      {
        habit_item_id: habitId,
        date,
        completed_at: new Date().toISOString(),
        was_auto: false,
      },
      { onConflict: "habit_item_id,date" },
    )
  }
  await recomputeStreak(habitId)
  revalidatePath("/habits")
  revalidatePath("/today")
}

async function recomputeStreak(habitId: string) {
  const supabase = await createClient()
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 365)
  const { data: completions } = await supabase
    .from("habit_completions")
    .select("date")
    .eq("habit_item_id", habitId)
    .gte("date", start.toISOString().split("T")[0])
    .order("date", { ascending: false })
  if (!completions) return

  const days = new Set(completions.map((c) => c.date))
  let cur = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const k = d.toISOString().split("T")[0]
    if (days.has(k)) cur++
    else break
  }

  const { data: existing } = await supabase
    .from("habit_items")
    .select("streak_longest")
    .eq("id", habitId)
    .single()
  const longest = Math.max(existing?.streak_longest ?? 0, cur)
  await supabase
    .from("habit_items")
    .update({ streak_current: cur, streak_longest: longest })
    .eq("id", habitId)
}

export async function addHabit(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  const supabase = await createClient()
  await supabase.from("habit_items").insert({
    name,
    type: String(formData.get("type") ?? "habit"),
    time_of_day: String(formData.get("time_of_day") ?? "anytime"),
    dosage: (formData.get("dosage") as string) || null,
  })
  revalidatePath("/habits/manage")
  revalidatePath("/habits")
}

export async function archiveHabit(id: string) {
  const supabase = await createClient()
  await supabase.from("habit_items").update({ is_active: false }).eq("id", id)
  revalidatePath("/habits/manage")
  revalidatePath("/habits")
}

export async function updateHabit(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return { ok: false, error: "Naam verplicht" }
  const freq = String(formData.get("frequency") ?? "daily")
  await supabase
    .from("habit_items")
    .update({
      name,
      type: String(formData.get("type") ?? "habit"),
      time_of_day: String(formData.get("time_of_day") ?? "anytime"),
      dosage: (formData.get("dosage") as string)?.trim() || null,
      frequency: freq,
      display_order: formData.get("display_order")
        ? Number(formData.get("display_order"))
        : undefined,
    })
    .eq("id", id)
  revalidatePath("/habits/manage")
  revalidatePath("/habits")
  return { ok: true }
}

export async function reactivateHabit(id: string) {
  const supabase = await createClient()
  await supabase.from("habit_items").update({ is_active: true }).eq("id", id)
  revalidatePath("/habits/manage")
  revalidatePath("/habits")
}

export async function setWaterQuantity(habitId: string, date: string, value: number) {
  const supabase = await createClient()
  if (value <= 0) {
    await supabase
      .from("habit_completions")
      .delete()
      .eq("habit_item_id", habitId)
      .eq("date", date)
  } else {
    await supabase.from("habit_completions").upsert(
      {
        habit_item_id: habitId,
        date,
        quantity_value: value,
        completed_at: new Date().toISOString(),
        was_auto: false,
      },
      { onConflict: "habit_item_id,date" },
    )
  }
  if (value >= 3) await recomputeStreak(habitId)
  revalidatePath("/habits")
  revalidatePath("/today")
}
