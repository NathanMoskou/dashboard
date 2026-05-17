/**
 * Web Push helper. Wraps the `web-push` npm package and surfaces a single
 * sendPushTo(subscription, payload) function. Reads VAPID config from env.
 *
 * Setup (one-time):
 *   1. Run `node scripts/generate-vapid.mjs` locally — outputs a public/
 *      private keypair.
 *   2. Add to Vercel env vars (Production + Preview + Development):
 *        VAPID_PUBLIC_KEY
 *        VAPID_PRIVATE_KEY
 *        VAPID_SUBJECT          (mailto:you@example.com)
 *        NEXT_PUBLIC_VAPID_PUBLIC_KEY  (same as VAPID_PUBLIC_KEY)
 *        CRON_SECRET            (any random string — Vercel cron auth)
 *   3. Redeploy.
 */
import webpush from "web-push"

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:noreply@example.com"

let configured = false
function ensureConfigured() {
  if (configured) return
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    throw new Error(
      "VAPID keys missing — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in env",
    )
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  configured = true
}

export type PushPayload = {
  title: string
  body: string
  url?: string
}

export type PushSubscriptionJSON = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/**
 * Send one push. Returns { ok: true } on success, or { ok: false, gone: true }
 * if the subscription is no longer valid (caller should delete from DB).
 */
export async function sendPushTo(
  subscription: PushSubscriptionJSON,
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; gone: boolean; error: string }> {
  ensureConfigured()
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return { ok: true }
  } catch (err) {
    const e = err as { statusCode?: number; body?: string; message?: string }
    const gone = e.statusCode === 404 || e.statusCode === 410
    return { ok: false, gone, error: e.message ?? String(err) }
  }
}
