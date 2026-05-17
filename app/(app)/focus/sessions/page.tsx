import { verifySession } from "@/lib/dal"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Breadcrumb } from "@/components/ui/Breadcrumb"
import { minutesToHM } from "@/lib/utils"

export default async function SessionsPage() {
  const { supabase } = await verifySession()
  const { data: sessions } = await supabase
    .from("focus_sessions")
    .select("*, clients(name)")
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <Breadcrumb crumbs={[{ label: "Focus", href: "/focus" }, { label: "Sessies" }]} />
      <LiveHeader title="Focus sessies" subtitle="Laatste 50 voltooide sessies" />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(sessions ?? []).map((s) => {
              const c = (s as unknown as { clients?: { name: string } | null }).clients
              return (
                <div key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{s.task_description}</div>
                      <div className="text-xs text-muted-fg">
                        {new Date(s.started_at).toLocaleString("nl-NL", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm tabular-nums">{minutesToHM(s.duration_minutes ?? 0)}</div>
                      <div className="mt-1 flex flex-wrap justify-end gap-1">
                        <Badge variant="outline">{s.type}</Badge>
                        {s.is_billable ? <Badge variant="warn">{c?.name ?? "billable"}</Badge> : null}
                        {s.notion_synced ? <Badge variant="good">synced</Badge> : null}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {(sessions ?? []).length === 0 ? (
              <div className="p-4 text-sm text-muted-fg">Nog geen sessies.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
