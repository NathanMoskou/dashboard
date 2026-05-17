"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
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

/**
 * Quick pomodoro: start a 25-minute deep_work focus session from a Notion
 * task on Today. Creates a focus_sessions row and redirects to the
 * existing /focus/active timer screen so the user can stop / extend.
 *
 * `notionTaskId` lets the session link back to its Notion source — the
 * existing stop-focus flow uses it to optionally mark the task done.
 */
export async function startPomodoroFromTask(taskTitle: string, notionTaskId: string | null) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("focus_sessions")
    .insert({
      started_at: new Date().toISOString(),
      type: "deep_work",
      is_billable: false,
      client_id: null,
      task_description: taskTitle,
      notion_task_id: notionTaskId,
    })
    .select("id")
    .single()
  if (error || !data) throw new Error(error?.message ?? "Kon pomodoro niet starten")
  redirect(`/focus/active?id=${data.id}`)
}
