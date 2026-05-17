"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function saveJournal(formData: FormData) {
  const date = String(formData.get("date") ?? new Date().toISOString().split("T")[0])
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("journal_entries")
    .select("went_well, was_difficult, insight, free_text, day_rating, productivity_rating, mood_rating")
    .eq("date", date)
    .maybeSingle()

  const trim = (k: string) => ((formData.get(k) as string | null) ?? "").trim()
  const numOpt = (k: string): number | null => {
    const v = formData.get(k)
    if (v == null || v === "") return null
    const n = Number(v)
    return isNaN(n) ? null : n
  }

  const merged = {
    went_well: trim("went_well") || existing?.went_well || null,
    was_difficult: trim("was_difficult") || existing?.was_difficult || null,
    insight: trim("insight") || existing?.insight || null,
    free_text: trim("free_text") || existing?.free_text || null,
    day_rating: numOpt("day_rating") ?? existing?.day_rating ?? null,
    productivity_rating: numOpt("productivity_rating") ?? existing?.productivity_rating ?? null,
    mood_rating: numOpt("mood_rating") ?? existing?.mood_rating ?? null,
  }

  await supabase.from("journal_entries").upsert(
    {
      date,
      ...merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,date" },
  )
  revalidatePath("/reflection")
  revalidatePath("/today")
}

export async function saveWeeklyReview(formData: FormData) {
  const weekStart = String(formData.get("week_start") ?? "")
  const weekEnd = String(formData.get("week_end") ?? "")
  if (!weekStart || !weekEnd) return
  const supabase = await createClient()
  await supabase.from("weekly_reviews").upsert(
    {
      week_start: weekStart,
      week_end: weekEnd,
      went_well: (formData.get("went_well") as string) || null,
      improve_on: (formData.get("improve_on") as string) || null,
      focus_next_week: (formData.get("focus_next_week") as string) || null,
    },
    { onConflict: "user_id,week_start" },
  )
  revalidatePath("/reflection/weekly")
  revalidatePath("/reflection")
}
