import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/export → JSON dump of the signed-in user's data.
 * Downloads as `life-os-export-YYYY-MM-DD.json`. Owns-your-own-data feature.
 *
 * Tables included: habit_items, habit_completions, focus_sessions, transactions,
 * journal_entries, weekly_reviews, bucket_list_items, work_sessions, rest_config,
 * clients, csv_imports, health_entries (kept for legacy), workouts.
 * Excludes: user_integrations (contains OAuth tokens), auth.users.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const tables = [
    "habit_items",
    "habit_completions",
    "focus_sessions",
    "transactions",
    "journal_entries",
    "weekly_reviews",
    "bucket_list_items",
    "work_sessions",
    "rest_config",
    "clients",
    "csv_imports",
    "health_entries",
    "workouts",
  ] as const

  const data: Record<string, unknown[]> = {}
  for (const t of tables) {
    const { data: rows } = await supabase.from(t).select("*")
    data[t] = rows ?? []
  }

  const payload = {
    exported_at: new Date().toISOString(),
    user_email: user.email,
    schema_version: 1,
    data,
  }

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="life-os-export-${today}.json"`,
      "Cache-Control": "no-store",
    },
  })
}
