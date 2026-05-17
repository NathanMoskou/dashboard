import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { PushSubscriptionJSON } from "@/lib/push"

/**
 * POST /api/push/subscribe — store the user's PushSubscription on
 * user_integrations.push_subscription so the cron handler can fan out
 * notifications to it.
 * DELETE /api/push/subscribe — clear the stored subscription.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let sub: PushSubscriptionJSON
  try {
    sub = (await req.json()) as PushSubscriptionJSON
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: "invalid subscription shape" }, { status: 400 })
  }

  await supabase.from("user_integrations").upsert(
    { user_id: user.id, push_subscription: sub },
    { onConflict: "user_id" },
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  await supabase.from("user_integrations").upsert(
    { user_id: user.id, push_subscription: null },
    { onConflict: "user_id" },
  )
  return NextResponse.json({ ok: true })
}
