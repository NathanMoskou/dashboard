import { NextResponse } from "next/server"
import { sendPushTo, type PushSubscriptionJSON } from "@/lib/push"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/push/cron — Vercel cron handler. Fires hourly (per vercel.json)
 * and dispatches morning / evening push notifications to users whose
 * configured time matches the current Europe/Amsterdam hour.
 *
 * Auth: Vercel cron requests carry `Authorization: Bearer ${CRON_SECRET}`.
 * Returns 401 if the header doesn't match.
 *
 * Uses the service-role admin client because we need to read all users'
 * notification prefs + push subscriptions across the table.
 */

function amsHourNow(): number {
  return Number(
    new Date().toLocaleString("en-GB", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      hour12: false,
    }),
  )
}

function amsDateNow(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" })
}

export async function GET(req: Request) {
  // Auth — Vercel cron job sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization") || ""
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const hour = amsHourNow()
  const hourPrefix = String(hour).padStart(2, "0") + ":"
  const today = amsDateNow()

  const admin = createAdminClient()

  // Find every user whose morning OR evening time falls in the current hour.
  const { data: rows, error } = await admin
    .from("user_integrations")
    .select("user_id, push_subscription, notif_morning_enabled, notif_morning_time, notif_evening_enabled, notif_evening_time")
    .not("push_subscription", "is", null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Target = { userId: string; sub: PushSubscriptionJSON; type: "morning" | "evening" }
  const targets: Target[] = []
  for (const r of rows ?? []) {
    const sub = r.push_subscription as unknown as PushSubscriptionJSON | null
    if (!sub) continue
    if (r.notif_morning_enabled && (r.notif_morning_time ?? "").startsWith(hourPrefix)) {
      targets.push({ userId: r.user_id, sub, type: "morning" })
    }
    if (r.notif_evening_enabled && (r.notif_evening_time ?? "").startsWith(hourPrefix)) {
      targets.push({ userId: r.user_id, sub, type: "evening" })
    }
  }

  // For each target, compute today's habits stats and send a personalised push.
  const results: { userId: string; type: string; ok: boolean; reason?: string }[] = []
  for (const t of targets) {
    // Active habits + today's completions
    const [{ data: items }, { data: completions }] = await Promise.all([
      admin.from("habit_items").select("id, quantity_target").eq("user_id", t.userId).eq("is_active", true),
      admin.from("habit_completions").select("habit_item_id, was_skipped, quantity_value").eq("user_id", t.userId).eq("date", today),
    ])

    const total = items?.length ?? 0
    let done = 0
    for (const h of items ?? []) {
      const c = (completions ?? []).find((c) => c.habit_item_id === h.id)
      if (!c || c.was_skipped) continue
      const ok = h.quantity_target != null
        ? (c.quantity_value ?? 0) >= Number(h.quantity_target)
        : true
      if (ok) done++
    }
    const left = total - done

    const title = t.type === "morning" ? "Goedemorgen ☀️" : "Avondreflectie"
    const body = t.type === "morning"
      ? total === 0
        ? "Tijd voor een nieuwe dag — open Life OS."
        : `${total} habits voor vandaag — pak ze één voor één.`
      : left === 0
        ? `Top, alles afgevinkt vandaag.`
        : left === 1
          ? `Nog 1 habit te doen vandaag.`
          : `Nog ${left} habits open — sluit de dag af.`

    const r = await sendPushTo(t.sub, { title, body, url: "/today" })
    results.push({ userId: t.userId, type: t.type, ok: r.ok, reason: r.ok ? undefined : r.error })

    // If the subscription is dead, clear it so we stop retrying every hour.
    if (!r.ok && r.gone) {
      await admin.from("user_integrations").update({ push_subscription: null }).eq("user_id", t.userId)
    }
  }

  return NextResponse.json({ hour, count: targets.length, results })
}
