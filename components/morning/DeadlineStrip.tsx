import type { NotionTask } from "@/lib/notion"
import { HARD_DEADLINES, daysUntil, pillColor } from "@/lib/morning/deadlines"
import { Badge } from "@/components/ui/badge"

export function DeadlineStrip({ tasks }: { tasks: NotionTask[] }) {
  const fromNotion = tasks
    .filter((t) => t.deadline)
    .map((t) => ({ label: t.title, date: t.deadline! }))

  const all = [...HARD_DEADLINES, ...fromNotion]
    .filter((d) => daysUntil(d.date) >= 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  if (!all.length) return null

  return (
    <section>
      <div className="flex items-center gap-2 text-sm font-semibold mb-2">
        <span>⏰</span> Aankomende deadlines
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-hide">
        <ul className="flex gap-2 min-w-min">
          {all.map((d, i) => {
            const days = daysUntil(d.date)
            const variant = pillColor(d.date)
            const variantClass =
              variant === "bad" ? "bad" : variant === "warn" ? "warn" : "outline"
            return (
              <li key={i} className="shrink-0">
                <Badge
                  variant={variantClass as "bad" | "warn" | "outline"}
                  className="whitespace-nowrap py-1.5 px-3"
                >
                  <span className="font-medium">
                    {days === 0 ? "vandaag" : days === 1 ? "morgen" : `${days}d`}
                  </span>
                  <span className="ml-2 text-[11px] opacity-80">{d.label}</span>
                </Badge>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
