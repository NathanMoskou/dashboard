"use client"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { CalendarEvent } from "@/lib/google"
import type { RoutineBlock } from "@/lib/morning/routines"
import { DayPlan } from "./DayPlan"
import { AddEventForm } from "./AddEventForm"
import { RoutineCards } from "./RoutineCards"

const DAYS = [
  { key: 0 as const, label: "Vandaag" },
  { key: 1 as const, label: "Morgen" },
]

export function DayPlanToggle({
  todayEvents,
  tomorrowEvents,
  googleConnected,
  routineBlocks,
}: {
  todayEvents: CalendarEvent[]
  tomorrowEvents: CalendarEvent[]
  googleConnected: boolean
  routineBlocks: RoutineBlock[]
}) {
  const [offset, setOffset] = useState<0 | 1>(0)
  const events = offset === 0 ? todayEvents : tomorrowEvents
  const emptyText = googleConnected
    ? offset === 0
      ? "Niets gepland vandaag."
      : "Niets gepland morgen."
    : "Verbind Google Calendar om je agenda te zien."

  return (
    <div className="space-y-3">
      <div className="flex gap-0.5 rounded-lg bg-muted/40 p-0.5 w-fit">
        {DAYS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setOffset(key)}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
              offset === key
                ? "bg-card text-fg shadow-sm"
                : "text-muted-fg hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <RoutineCards blocks={routineBlocks} offsetDays={offset} />
      <DayPlan events={events} offsetDays={offset} emptyText={emptyText} />
      <AddEventForm defaultOffset={offset} />
    </div>
  )
}
