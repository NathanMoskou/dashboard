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

  type Target =
    | { userId: string; sub: PushSubscriptionJSON; type: "morning" | "evening" }
    | { userId: string; sub: PushSubscriptionJSON; type: "habit"; habitId: string; habitName: string }
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

  // Per-habit reminders. For each subscribed user, fetch active habits with
  // a reminder_time in the current hour and that aren't already complete
  // (or skipped) for today. One push per matching habit.
  const subbed = (rows ?? [])
    .filter((r) => r.push_subscription)
    .map((r) => ({ user_id: r.user_id, sub: r.push_subscription as unknown as PushSubscriptionJSON }))

  if (subbed.length > 0) {
    const userIds = subbed.map((s) => s.user_id)
    const [{ data: habits }, { data: doneToday }] = await Promise.all([
      admin
        .from("habit_items")
        .select("id, user_id, name, reminder_time, quantity_target")
        .eq("is_active", true)
        .in("user_id", userIds)
        .not("reminder_time", "is", null),
      admin
        .from("habit_completions")
        .select("habit_item_id, was_skipped, quantity_value")
        .in("user_id", userIds)
        .eq("date", today),
    ])

    const doneByHabit = new Map<string, { skipped: boolean; qty: number }>()
    for (const c of doneToday ?? []) {
      doneByHabit.set(c.habit_item_id, {
        skipped: !!c.was_skipped,
        qty: Number(c.quantity_value ?? 0),
      })
    }

    for (const h of habits ?? []) {
      if (!h.reminder_time || !h.reminder_time.startsWith(hourPrefix)) continue
      const status = doneByHabit.get(h.id)
      if (status) {
        const fulfilled = h.quantity_target != null
          ? status.qty >= Number(h.quantity_target)
          : true
        if (status.skipped || fulfilled) continue // nothing to remind about
      }
      const sub = subbed.find((s) => s.user_id === h.user_id)?.sub
      if (!sub) continue
      targets.push({
        userId: h.user_id,
        sub,
        type: "habit",
        habitId: h.id,
        habitName: h.name,
      })
    }
  }

  // For each target, compute personalised content and send.
  const results: { userId: string; type: string; ok: boolean; reason?: string }[] = []
  for (const t of targets) {
    let title: string
    let body: string

    if (t.type === "habit") {
      title = "Herinnering"
      body = `Tijd voor: ${t.habitName}`
    } else {
      // Morning / evening — need today's habit completion stats
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

      title = t.type === "morning" ? "Goedemorgen ☀️" : "Avondreflectie"
      body = t.type === "morning"
        ? total === 0
          ? "Tijd voor een nieuwe dag — open Life OS."
          : `${total} habits voor vandaag — pak ze één voor één.`
        : left === 0
          ? `Top, alles afgevinkt vandaag.`
          : left === 1
            ? `Nog 1 habit te doen vandaag.`
            : `Nog ${left} habits open — sluit de dag af.`
    }

    const r = await sendPushTo(t.sub, { title, body, url: "/today" })
    results.push({ userId: t.userId, type: t.type, ok: r.ok, reason: r.ok ? undefined : r.error })

    // If the subscription is dead, clear it so we stop retrying every hour.
    if (!r.ok && r.gone) {
      await admin.from("user_integrations").update({ push_subscription: null }).eq("user_id", t.userId)
    }
  }

  return NextResponse.json({ hour, count: targets.length, results })
}
