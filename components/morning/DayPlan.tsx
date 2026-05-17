import type { CalendarEvent } from "@/lib/google"
import { EventRow } from "./EventRow"

export function DayPlan({
  events,
  offsetDays,
  emptyText,
}: {
  events: CalendarEvent[]
  offsetDays: 0 | 1
  emptyText: string
}) {
  return (
    <section className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
        {offsetDays === 0 ? "Vandaag" : "Morgen"}
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted-fg">{emptyText}</p>
      ) : (
        events.map((e) => <EventRow key={e.id} event={e} offsetDays={offsetDays} />)
      )}
    </section>
  )
}
