"use client"
import { useState, useTransition } from "react"
import { Repeat, X, RotateCcw, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatEUR } from "@/lib/utils"
import { dismissSubscription, restoreSubscription } from "./actions"
import type { Subscription } from "@/lib/finance/subscriptions"

export function SubscriptionRadar({
  active,
  dismissed,
}: {
  active: Subscription[]
  dismissed: Subscription[]
}) {
  const router = useRouter()
  const [showDismissed, setShowDismissed] = useState(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [, start] = useTransition()

  if (active.length === 0 && dismissed.length === 0) return null

  // Total monthly drain assumes one charge per cadence period — every
  // detected sub contributes its full amount per ~month.
  const monthlyTotal = active.reduce((acc, s) => acc + s.amountEur, 0)

  function onDismiss(key: string) {
    setPendingKey(key)
    start(async () => {
      await dismissSubscription(key)
      setPendingKey(null)
      router.refresh()
    })
  }

  function onRestore(key: string) {
    setPendingKey(key)
    start(async () => {
      await restoreSubscription(key)
      setPendingKey(null)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat size={15} className="text-muted-fg" />
          Abonnementen-radar
          {active.length > 0 ? (
            <Badge variant="outline" className="text-[10px]">
              {active.length}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          Automatisch gedetecteerde maandelijkse uitgaven.{" "}
          {active.length > 0 ? (
            <span className="font-medium text-fg">
              Samen {formatEUR(monthlyTotal)} per maand.
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {active.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-fg">
            Geen actieve abonnementen gedetecteerd.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {active.map((s) => (
              <li
                key={s.patternKey}
                className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-[11px] text-muted-fg flex flex-wrap gap-x-2">
                    <span>{s.hits}× gedetecteerd</span>
                    <span>· elke ~{s.cadenceDays}d</span>
                    <span>· volgende ≈ {s.nextDue}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm tabular-nums font-semibold text-bad">
                    −{formatEUR(s.amountEur)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pendingKey === s.patternKey}
                  onClick={() => onDismiss(s.patternKey)}
                  title="Verberg (geen abonnement)"
                  className="shrink-0"
                >
                  {pendingKey === s.patternKey ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <X size={13} />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {dismissed.length > 0 ? (
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => setShowDismissed((v) => !v)}
              className="w-full px-5 py-2 text-left text-[11px] uppercase tracking-wider text-muted-fg hover:bg-muted/40 transition-colors"
            >
              {showDismissed ? "Verbergen" : `Verborgen (${dismissed.length})`}
            </button>
            {showDismissed ? (
              <ul className="divide-y divide-border">
                {dismissed.map((s) => (
                  <li
                    key={s.patternKey}
                    className="flex items-center justify-between gap-3 p-3 opacity-70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      <div className="text-[11px] text-muted-fg">
                        {formatEUR(s.amountEur)} · elke ~{s.cadenceDays}d
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingKey === s.patternKey}
                      onClick={() => onRestore(s.patternKey)}
                      title="Weer tonen"
                    >
                      {pendingKey === s.patternKey ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <RotateCcw size={13} />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
