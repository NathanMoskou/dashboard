// One-time helper: generate a VAPID keypair for Web Push.
// Run:  node scripts/generate-vapid.mjs
// Then paste the output values into Vercel env vars (Production + Preview + Development):
//   VAPID_PUBLIC_KEY              ← public
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  ← same (this one is bundled into the client)
//   VAPID_PRIVATE_KEY             ← private (server-only)
//   VAPID_SUBJECT                 ← mailto:you@example.com
//   CRON_SECRET                   ← any random string (Vercel attaches it as Authorization on cron)
import webpush from "web-push"

const keys = webpush.generateVAPIDKeys()
console.log("")
console.log("─── VAPID keypair ─────────────────────────────────────────────")
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:nathanstel@live.nl`)
console.log("")
console.log("Also add (any random string):")
console.log(`CRON_SECRET=${[...crypto.getRandomValues(new Uint8Array(24))]
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("")}`)
console.log("───────────────────────────────────────────────────────────────")
