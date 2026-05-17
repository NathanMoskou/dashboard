"use client"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { readinessZone, type ReadinessBreakdown } from "@/lib/readiness"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { minutesToHM } from "@/lib/utils"
import { cn } from "@/lib/utils"

export function ReadinessCard({
  hrv,
  sleepMin,
  rhr,
  score,
  breakdown,
}: {
  hrv:        number | null
  sleepMin:   number | null
  rhr:        number | null
  score:      number | null
  breakdown?: ReadinessBreakdown | null
}) {
  const [open, setOpen] = useState(false)

  const z       = score != null ? readinessZone(score) : null
  const label   = z === "green" ? "Push" : z === "amber" ? "Normaal" : z === "red" ? "Herstel" : "—"
  const variant = (z === "green" ? "good" : z === "amber" ? "warn" : z === "red" ? "bad" : "outline") as
    "good" | "warn" | "bad" | "outline"

  const canExpand = !!breakdown && breakdown.factors.length > 0

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header row — clickable if breakdown available */}
        <button
          className={cn("w-full text-left", canExpand && "cursor-pointer")}
          onClick={() => canExpand && setOpen((v) => !v)}
          disabled={!canExpand}
          aria-expanded={canExpand ? open : undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-fg">Readiness</div>
              <div className="text-3xl font-semibold tabular-nums mt-0.5">
                {score == null ? "—" : score}
                {score != null && (
                  <span className="text-base font-normal text-muted-fg">/100</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={variant}>{label}</Badge>
              {canExpand && (
                <ChevronDown
                  size={14}
                  className={cn("text-muted-fg transition-transform duration-200", open && "rotate-180")}
                />
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-muted-fg">
            <Stat label="Slaap"        value={minutesToHM(sleepMin)} />
            <Stat label="HRV"          value={hrv != null ? `${hrv} ms` : "—"} />
            <Stat label="Rusthartslag" value={rhr != null ? `${rhr} bpm` : "—"} />
          </div>
        </button>

        {/* Expandable breakdown */}
        {open && breakdown && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-fg">Opgebouwd uit</p>
            {breakdown.factors.map((f) => {
              const barColor = f.sub >= 85 ? "var(--good)"
                             : f.sub >= 65 ? "var(--warn)"
                             :               "var(--bad)"
              return (
                <div key={f.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted-fg tabular-nums">
                      {f.value}{f.baseline ? <> · <span className="opacity-70">{f.baseline}</span></> : null}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${f.sub}%`, background: barColor }}
                      />
                    </div>
                    <span className="text-xs tabular-nums w-7 text-right text-muted-fg">{f.sub}</span>
                    <span className="text-[10px] text-muted-fg w-8 text-right opacity-60">{f.weight}%</span>
                  </div>
                </div>
              )
            })}
            {breakdown.missingFactors.length > 0 && (
              <p className="text-[10px] text-muted-fg pt-1">
                Ontbreekt: {breakdown.missingFactors.join(", ")} — voeg toe voor een nauwkeuriger score
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-2">
      <div className="text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium text-fg">{value}</div>
    </div>
  )
}
