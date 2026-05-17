"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

// Keep saveRestConfig for gym active timer (rest times are still used there)
export async function saveRestConfig(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("rest_config").upsert(
    {
      user_id: user.id,
      compound_low_reps_s: Number(formData.get("compound_low_reps_s") ?? 240),
      compound_mid_reps_s: Number(formData.get("compound_mid_reps_s") ?? 180),
      compound_high_reps_s: Number(formData.get("compound_high_reps_s") ?? 120),
      isolation_low_reps_s: Number(formData.get("isolation_low_reps_s") ?? 120),
      isolation_mid_reps_s: Number(formData.get("isolation_mid_reps_s") ?? 90),
      isolation_high_reps_s: Number(formData.get("isolation_high_reps_s") ?? 60),
      early_rise_threshold: String(formData.get("early_rise_threshold") ?? "07:30"),
      deep_work_daily_goal_h: Number(formData.get("deep_work_daily_goal_h") ?? 4),
      billable_weekly_goal_h: Number(formData.get("billable_weekly_goal_h") ?? 20),
    },
    { onConflict: "user_id" },
  )
  revalidatePath("/settings")
}

// Saves only the productivity-facing goals (early rise, deep work, billable)
export async function saveGoals(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("rest_config").upsert(
    {
      user_id: user.id,
      early_rise_threshold: String(formData.get("early_rise_threshold") ?? "07:30"),
      deep_work_daily_goal_h: Number(formData.get("deep_work_daily_goal_h") ?? 4),
      billable_weekly_goal_h: Number(formData.get("billable_weekly_goal_h") ?? 20),
    },
    { onConflict: "user_id" },
  )
  revalidatePath("/settings")
}

export async function regenerateHealthKey() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const key = `lifeos_${crypto.randomUUID().replace(/-/g, "")}`
  await supabase.from("user_integrations").upsert(
    { user_id: user.id, apple_health_api_key: key },
    { onConflict: "user_id" },
  )
  revalidatePath("/settings")
}

export async function saveNotionTasksDb(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const clean = (k: string) => ((formData.get(k) as string) || "").trim() || null
  await supabase.from("user_integrations").upsert(
    {
      user_id: user.id,
      notion_tasks_db_id: clean("notion_tasks_db_id"),
      notion_work_tracker_db_id: clean("notion_work_tracker_db_id"),
      notion_projects_db_id: clean("notion_projects_db_id"),
    },
    { onConflict: "user_id" },
  )
  revalidatePath("/settings")
  revalidatePath("/focus")
  revalidatePath("/work-timer")
}

export async function disconnectNotion() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from("user_integrations")
    .upsert(
      {
        user_id: user.id,
        notion_access_token: null,
        notion_workspace_id: null,
        notion_tasks_db_id: null,
      },
      { onConflict: "user_id" },
    )
  revalidatePath("/settings")
}

export async function disconnectGoogle() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from("user_integrations")
    .upsert(
      {
        user_id: user.id,
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null,
      },
      { onConflict: "user_id" },
    )
  revalidatePath("/settings")
}

export async function saveNotificationPrefs(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("user_integrations").upsert(
    {
      user_id: user.id,
      notif_morning_enabled: formData.get("notif_morning_enabled") === "on",
      notif_morning_time: String(formData.get("notif_morning_time") ?? "09:00"),
      notif_evening_enabled: formData.get("notif_evening_enabled") === "on",
      notif_evening_time: String(formData.get("notif_evening_time") ?? "20:00"),
    },
    { onConflict: "user_id" },
  )
  revalidatePath("/settings")
}

/**
 * Persist the user's theme preference. `theme` may be:
 *   light      — always light
 *   dark       — always dark
 *   system     — follow the OS prefers-color-scheme
 *   auto-time  — dark between dark_start_hour..dark_end_hour Ams-local
 */
export async function saveThemePrefs(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const theme = String(formData.get("theme") ?? "auto-time")
  if (!["light", "dark", "system", "auto-time"].includes(theme)) return
  const start = Math.max(0, Math.min(23, Number(formData.get("dark_start_hour") ?? 21)))
  const end = Math.max(0, Math.min(23, Number(formData.get("dark_end_hour") ?? 6)))
  await supabase.from("user_integrations").upsert(
    {
      user_id: user.id,
      theme,
      dark_start_hour: start,
      dark_end_hour: end,
    },
    { onConflict: "user_id" },
  )
  revalidatePath("/settings")
  revalidatePath("/")
}

/**
 * Persist the user's Today-page widget config — an ordered array of
 * { key, hidden } entries. We accept the full new array each time
 * (no partial patches) so the client doesn't have to fetch first.
 */
export async function saveTodayWidgetConfig(
  config: { key: string; hidden: boolean }[],
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from("user_integrations").upsert(
    { user_id: user.id, today_widget_config: config },
    { onConflict: "user_id" },
  )
  revalidatePath("/settings")
  revalidatePath("/today")
}
