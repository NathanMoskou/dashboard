// Life OS service worker — v4
// Strategy:
//   - Navigations (HTML): ALWAYS network. No caching. Prevents stale-HTML-with-dead-chunks bugs.
//   - /_next/static/* (immutable, fingerprinted): cache-first. Filenames include content hashes so
//     they're safe to cache forever; new deploys produce new filenames automatically.
//   - Everything else: pass through, no caching.
//   - Web Push: show notification on `push`, open /today on `notificationclick`.
//
// On activation: delete old caches and take over open clients immediately so a broken
// previous-version SW can be replaced without a manual hard-reload.

const VERSION = "v4"
const STATIC_CACHE = `life-os-static-${VERSION}`

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return

  // Always network for HTML navigations — no stale-asset bugs.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(
        () =>
          new Response(
            "<!doctype html><html><body style='font-family:system-ui;padding:2rem;text-align:center'><h2>Offline</h2><p>Herlaad zodra je weer internet hebt.</p></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
          ),
      ),
    )
    return
  }

  // Cache-first for immutable Next.js assets.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        const res = await fetch(req)
        if (res.ok) {
          const clone = res.clone()
          caches.open(STATIC_CACHE).then((c) => c.put(req, clone))
        }
        return res
      })(),
    )
    return
  }

  // Everything else: pass-through, no caching.
})

// ── Web Push ────────────────────────────────────────────────────────
// Payload shape (matches lib/push.ts PushPayload):
//   { title: string, body: string, url?: string }
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: "Life OS", body: event.data ? event.data.text() : "" }
  }
  const title = data.title || "Life OS"
  const options = {
    body: data.body || "",
    icon: "/logo.svg",
    badge: "/logo.svg",
    data: { url: data.url || "/today" },
    tag: "life-os",
    renotify: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || "/today"
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      // If a tab is already open, focus + navigate
      for (const c of all) {
        if ("focus" in c) {
          try { await c.focus() } catch {}
          if ("navigate" in c) {
            try { await c.navigate(url) } catch {}
          }
          return
        }
      }
      // Otherwise open a fresh window
      if (self.clients.openWindow) await self.clients.openWindow(url)
    })(),
  )
})
