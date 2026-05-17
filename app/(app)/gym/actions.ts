"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function startSession(templateId: string | null) {
  const supabase = await createClient()
  const { data: latest } = await supabase
    .from("health_entries")
    .select("readiness_score")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      template_id: templateId,
      started_at: new Date().toISOString(),
      readiness_score: latest?.readiness_score ?? null,
    })
    .select("id")
    .single()
  if (error || !data) throw new Error(error?.message ?? "kon sessie niet aanmaken")
  redirect(`/gym/active?session=${data.id}`)
}

export async function logSet(input: {
  sessionId: string
  exerciseId: string
  setNumber: number
  setType: "warmup" | "working" | "dropset" | "failure"
  weightKg: number
  reps: number
  restSeconds: number | null
}) {
  const supabase = await createClient()
  await supabase.from("workout_sets").insert({
    session_id: input.sessionId,
    exercise_id: input.exerciseId,
    set_number: input.setNumber,
    set_type: input.setType,
    weight_kg: input.weightKg,
    reps: input.reps,
    completed: true,
    rest_seconds_taken: input.restSeconds,
    completed_at: new Date().toISOString(),
  })
  revalidatePath(`/gym/active`)
}

export async function endSession(sessionId: string, notes: string | null) {
  const supabase = await createClient()
  const { data: sets } = await supabase
    .from("workout_sets")
    .select("weight_kg, reps, set_type, exercise_id")
    .eq("session_id", sessionId)
    .eq("completed", true)
  const total =
    sets
      ?.filter((s) => s.set_type === "working")
      .reduce((acc, s) => acc + (s.weight_kg ?? 0) * (s.reps ?? 0), 0) ?? 0
  await supabase
    .from("workout_sessions")
    .update({
      ended_at: new Date().toISOString(),
      total_volume_kg: total,
      notes: notes ?? null,
    })
    .eq("id", sessionId)

  // Update template_exercises.last_used_weight_kg per exercise (max working weight)
  if (sets?.length) {
    const byExercise = new Map<string, number>()
    for (const s of sets) {
      if (s.set_type !== "working" || !s.exercise_id) continue
      const w = s.weight_kg ?? 0
      byExercise.set(s.exercise_id, Math.max(byExercise.get(s.exercise_id) ?? 0, w))
    }
    const { data: session } = await supabase
      .from("workout_sessions")
      .select("template_id")
      .eq("id", sessionId)
      .single()
    if (session?.template_id) {
      for (const [exId, weight] of byExercise) {
        await supabase
          .from("template_exercises")
          .update({ last_used_weight_kg: weight })
          .eq("template_id", session.template_id)
          .eq("exercise_id", exId)
      }
    }
  }
  revalidatePath("/gym")
  revalidatePath("/gym/log")
  redirect(`/gym/log/${sessionId}`)
}

export async function createTemplate(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  const supabase = await createClient()
  const { data } = await supabase
    .from("workout_templates")
    .insert({ name })
    .select("id")
    .single()
  revalidatePath("/gym/templates")
  if (data) redirect(`/gym/templates/${data.id}/edit`)
}

export async function addExerciseToTemplate(formData: FormData) {
  const templateId = String(formData.get("template_id") ?? "")
  const exerciseId = String(formData.get("exercise_id") ?? "")
  const targetSets = Number(formData.get("target_sets") ?? 3)
  const targetReps = String(formData.get("target_reps") ?? "8-12")
  if (!templateId || !exerciseId) return
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("template_exercises")
    .select("display_order")
    .eq("template_id", templateId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle()
  await supabase.from("template_exercises").insert({
    template_id: templateId,
    exercise_id: exerciseId,
    display_order: (existing?.display_order ?? 0) + 1,
    target_sets: targetSets,
    target_reps: targetReps,
  })
  revalidatePath(`/gym/templates/${templateId}/edit`)
}

export async function removeTemplateExercise(id: string, templateId: string) {
  const supabase = await createClient()
  await supabase.from("template_exercises").delete().eq("id", id)
  revalidatePath(`/gym/templates/${templateId}/edit`)
}

export async function addCustomExercise(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  if (!name) return
  const supabase = await createClient()
  await supabase.from("exercises").insert({
    name,
    primary_muscle_group: String(formData.get("primary_muscle_group") ?? "other"),
    category: String(formData.get("category") ?? "compound") as "compound" | "isolation",
    equipment: String(formData.get("equipment") ?? "barbell") as
      | "barbell"
      | "dumbbell"
      | "machine"
      | "bodyweight"
      | "cable",
    is_custom: true,
  })
  revalidatePath("/gym/exercises")
}
