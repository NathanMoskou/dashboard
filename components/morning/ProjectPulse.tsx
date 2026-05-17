import type { NotionTask } from "@/lib/notion"

const PROJECTS = ["PGS", "TIP", "Het Tuintheater", "VitalScan", "Next-Adventure", "E-Chopperz", "Persoonlijk"]

export function ProjectPulse({ closed }: { closed: NotionTask[] }) {
  const counts = new Map<string, number>()
  for (const t of closed) {
    const k = t.project ?? "Persoonlijk"
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  const totals = PROJECTS.map((p) => ({ project: p, count: counts.get(p) ?? 0 }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
  if (totals.length === 0) return null
  return (
    <footer className="border-t border-border pt-4 mt-6">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg mb-2">
        Project pulse — afgeronde taken
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-fg">
        {totals.map((p) => (
          <span key={p.project}>
            <span className="text-fg font-medium">{p.count}</span> {p.project}
          </span>
        ))}
      </div>
    </footer>
  )
}
