"use client"
import { useEffect, useState, useTransition } from "react"
import { Bell, BellOff, Loader2, Check, X, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

/**
 * iOS Web Push enable / disable. Lives inside the existing Notifications
 * card. Three states are handled:
 *   1. Browser doesn't support push at all (rare desktop browsers).
 *   2. iOS Safari but not added to Home Screen — push is blocked, guide
 *      the user to add to home screen first.
 *   3. Supported — show the enable / disable button per the current
 *      Notification.permission state.
 *
 * On enable:
 *   - request permission
 *   - register service worker (already registered by app/layout.tsx)
 *   - subscribe via PushManager with the VAPID public key
 *   - POST the subscription JSON to /api/push/subscribe
 *
 * On disable: PushManager.unsubscribe + DELETE /api/push/subscribe.
 */

type State =
  | "loading"
  | "unsupported"
  | "ios-needs-pwa"
  | "default"
  | "granted-subscribed"
  | "granted-not-subscribed"
  | "denied"
  | "missing-vapid"

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function PushPermissionCard() {
  const [state, setState] = useState<State>("loading")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    if (typeof window === "undefined") return

    // Detect iOS standalone (Add to Home Screen) — on iOS, push only works in PWA mode.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported")
      return
    }
    if (isIOS && !standalone) {
      setState("ios-needs-pwa")
      return
    }
    if (!vapidKey) {
      setState("missing-vapid")
      return
    }

    if (Notification.permission === "denied") {
      setState("denied")
      return
    }
    if (Notification.permission === "default") {
      setState("default")
      return
    }
    // granted — check if we're already subscribed
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        setState(sub ? "granted-subscribed" : "granted-not-subscribed")
      } catch {
        setState("granted-not-subscribed")
      }
    })()
  }, [vapidKey])

  function enable() {
    setError(null)
    if (!vapidKey) {
      setError("VAPID public key ontbreekt in env (NEXT_PUBLIC_VAPID_PUBLIC_KEY).")
      return
    }
    start(async () => {
      try {
        const perm = await Notification.requestPermission()
        if (perm !== "granted") {
          setState(perm === "denied" ? "denied" : "default")
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
        const r = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        })
        if (!r.ok) throw new Error(`Subscribe save failed: ${r.status}`)
        setState("granted-subscribed")
      } catch (e) {
        setError((e as Error).message ?? "Onbekende fout")
      }
    })
  }

  function disable() {
    setError(null)
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
        await fetch("/api/push/subscribe", { method: "DELETE" })
        setState("granted-not-subscribed")
      } catch (e) {
        setError((e as Error).message ?? "Onbekende fout")
      }
    })
  }

  function testNotification() {
    start(async () => {
      try {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification("Life OS", {
          body: "Push werkt! ✓ Je krijgt morgenochtend je eerste echte notificatie.",
          icon: "/logo.svg",
          badge: "/logo.svg",
        })
      } catch (e) {
        setError((e as Error).message ?? "Onbekende fout")
      }
    })
  }

  return (
    <div className="rounded-xl bg-muted/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {state === "granted-subscribed" ? (
            <Bell size={15} className="text-good" />
          ) : (
            <BellOff size={15} className="text-muted-fg" />
          )}
          <span className="text-sm font-semibold">Push-meldingen op dit toestel</span>
          {state === "granted-subscribed" ? <Badge variant="good">aan</Badge>
            : state === "denied" ? <Badge variant="bad">geblokkeerd</Badge>
              : state === "ios-needs-pwa" ? <Badge variant="warn">PWA nodig</Badge>
                : state === "unsupported" ? <Badge variant="outline">niet ondersteund</Badge>
                  : state === "missing-vapid" ? <Badge variant="warn">setup nodig</Badge>
                    : <Badge variant="outline">uit</Badge>}
        </div>
        {state === "granted-subscribed" ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={testNotification} disabled={pending}>
              Test
            </Button>
            <Button size="sm" variant="outline" onClick={disable} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" size={13} /> : <X size={13} />}
              Uit
            </Button>
          </div>
        ) : state === "granted-not-subscribed" || state === "default" ? (
          <Button size="sm" onClick={enable} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={13} /> : <Check size={13} />}
            Schakel in
          </Button>
        ) : null}
      </div>

      {state === "ios-needs-pwa" ? (
        <p className="text-xs text-muted-fg flex items-start gap-1.5">
          <Smartphone size={13} className="mt-0.5 shrink-0" />
          <span>
            Op iPhone werkt push alleen als je Life OS eerst toevoegt aan beginscherm:
            tik op het Delen-icoon in Safari → &ldquo;Zet op beginscherm&rdquo;. Open dan de
            app vanuit dat icoon en kom hier terug.
          </span>
        </p>
      ) : null}
      {state === "denied" ? (
        <p className="text-xs text-muted-fg">
          Je hebt push geblokkeerd voor deze site. Schakel het weer aan via instellingen → Notificaties → Life OS.
        </p>
      ) : null}
      {state === "missing-vapid" ? (
        <p className="text-xs text-muted-fg">
          Setup nog niet compleet: <code className="font-mono">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> ontbreekt in Vercel env.
        </p>
      ) : null}
      {state === "unsupported" ? (
        <p className="text-xs text-muted-fg">
          Deze browser ondersteunt geen push-notificaties.
        </p>
      ) : null}
      {error ? <p className="text-xs text-bad">{error}</p> : null}
    </div>
  )
}
