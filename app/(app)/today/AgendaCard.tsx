"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type CalEvent = {
  id: string
  summary: string
  start: string
  allDay: boolean
}

const DAYS = [
  { key: "today" as const, label: "Vandaag" },
  { key: "tomorrow" as const, label: "Morgen" },
]

export function AgendaCard({
  today,
  tomorrow,
}: {
  today: CalEvent[]
  tomorrow: CalEvent[]
}) {
  const [day, setDay] = useState<"today" | "tomorrow">("today")
  const events = day === "today" ? today : tomorrow

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Agenda</CardTitle>
          <div className="flex gap-0.5 rounded-lg bg-muted/40 p-0.5">
            {DAYS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDay(key)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
                  day === key ? "bg-card text-fg shadow-sm" : "text-muted-fg hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {events.length === 0 ? (
          <p className="px-5 pb-4 text-sm text-muted-fg">Niets gepland.</p>
        ) : (
          <div className="px-5 pb-4 space-y-2 max-h-52 overflow-y-auto">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-border bg-bg-2 px-3 py-2.5 text-sm"
              >
                <span className="truncate">{e.summary}</span>
                <span className="text-xs text-muted-fg shrink-0 pl-2">
                  {e.allDay
                    ? "Hele dag"
                    : new Date(e.start).toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Amsterdam",
                      })}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
