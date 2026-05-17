export const revalidate = 60

import { verifySession } from "@/lib/dal"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { minutesToHM, formatEUR } from "@/lib/utils"
import type { WorkClientRow } from "@/lib/work-timer"
import { fetchRecentWorkEntries } from "@/lib/work-tracker"
import { WorkTimerCard } from "./WorkTimerCard"
import { ClientManager } from "./ClientManager"
import { DeleteSessionButton } from "./DeleteSessionButton"
import { SyncRetryButton } from "./SyncRetryButton"
import { PeriodStats } from "./PeriodStats"
import { WorkTracker } from "@/components/morning/WorkTracker"

export const dynamic = "force-dynamic"

/** Berekent vandaag-, week- en maandstart in Amsterdam-tijd als UTC-ms. */
function getAmsPeriodStartsMs() {
  const now = new Date()
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" })
  const [y, m, d] = todayStr.split("-").map(Number)

  const dow = new Date(y, m - 1, d).getDay()
  const daysToMonday = dow === 0 ? 6 : dow - 1
  const mon = new Date(y, m - 1, d - daysToMonday)
  const weekStr = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`
  const monthStr = `${y}-${String(m).padStart(2, "0")}-01`

  const tzParts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Amsterdam",
    timeZoneName: "longOffset",
  }).formatToParts(now)
  const tzName = tzParts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+1"
  const offset =
    tzName.startsWith("GMT+") || tzName.startsWith("GMT-") ? tzName.slice(3) : "+01:00"

  const toMs = (date: string) => new Date(`${date}T00:00:00${offset}`).getTime()

  return {
    todayMs: toMs(todayStr),
    weekMs: toMs(weekStr),
    monthMs: toMs(monthStr),
    monthISO: `${monthStr}T00:00:00${offset}`,
  }
}

export default async function WorkTimerPage() {
  const { supabase } = await verifySession()
  const { todayMs, weekMs, monthMs, monthISO } = getAmsPeriodStartsMs()

  const [
    { data: active },
    { data: recent },
    { data: periodSessions },
    { data: clientsRaw },
    workEntries,
  ] = await Promise.all([
    supabase.from("work_sessions").select("*").is("ended_at", null).maybeSingle(),
    supabase
      .from("work_sessions")
      .select("*")
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(50),
    supabase
      .from("work_sessions")
      .select("started_at, duration_minutes, is_billable, client_name")
      .not("ended_at", "is", null)
      .gte("started_at", monthISO),
    supabase
      .from("clients")
      .select("id, name, hourly_rate_eur, notion_client_name, is_active")
      .order("name"),
    fetchRecentWorkEntries(60, 100),
  ])

  const clients: WorkClientRow[] = (clientsRaw ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    hourly_rate_eur: c.hourly_rate_eur ? Number(c.hourly_rate_eur) : 0,
    notion_client_name: c.notion_client_name,
    is_active: c.is_active ?? true,
  }))
  const activeClients = clients.filter((c) => c.is_active)
  const rates = Object.fromEntries(clients.map((c) => [c.name, c.hourly_rate_eur]))

  return (
    <div className="space-y-5">
      <LiveHeader title="Work Timer" subtitle="Track tijd per klant · auto-sync naar Notion" />

      <WorkTimerCard active={active ?? null} clients={activeClients} />

      <PeriodStats
        sessions={periodSessions ?? []}
        rates={rates}
        todayStartMs={todayMs}
        weekStartMs={weekMs}
        monthStartMs={monthMs}
      />

      {/* Recente sessies — boven klanten */}
      <Card>
        <CardHeader>
          <CardTitle>Recente sessies</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(recent ?? []).length === 0 ? (
            <div className="p-4 text-sm text-muted-fg">Nog geen voltooide sessies.</div>
          ) : (
            <div className="divide-y divide-border">
              {(recent ?? []).map((s) => {
                const start = new Date(s.started_at)
                const rate = rates[s.client_name] ?? 0
                const earnings = s.is_billable ? ((s.duration_minutes ?? 0) / 60) * rate : 0
                return (
                  <div key={s.id} className="group flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {s.task_description || `${s.client_name} — werk`}
                      </div>
                      <div className="text-xs text-muted-fg flex flex-wrap gap-1.5 mt-0.5 items-center">
                        <span>
                          {start.toLocaleDateString("nl-NL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          {start.toLocaleTimeString("nl-NL", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>·</span>
                        <Badge variant="outline" className="text-[9px]">
                          {s.client_name}
                        </Badge>
                        {s.is_billable ? (
                          <Badge variant="warn" className="text-[9px]">billable</Badge>
                        ) : (
                          <Badge variant="default" className="text-[9px]">non-billable</Badge>
                        )}
                        {s.notion_synced ? (
                          <Badge variant="good" className="text-[9px]">Notion ✓</Badge>
                        ) : s.is_billable ? (
                          <>
                            <Badge variant="bad" className="text-[9px]">sync mislukt</Badge>
                            <SyncRetryButton id={s.id} />
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right shrink-0 mr-2">
                      <div className="text-sm tabular-nums">{minutesToHM(s.duration_minutes ?? 0)}</div>
                      {s.is_billable && earnings > 0 ? (
                        <div className="text-[10px] text-muted-fg tabular-nums">{formatEUR(earnings)}</div>
                      ) : null}
                    </div>
                    <DeleteSessionButton id={s.id} />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Klanten */}
      <ClientManager clients={clients} />

      {/* Work Tracker — Notion entries */}
      <WorkTracker entries={workEntries} clients={clients} />
    </div>
  )
}
