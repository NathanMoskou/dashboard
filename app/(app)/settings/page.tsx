export const revalidate = 300

import { verifySession } from "@/lib/dal"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  saveGoals,
  saveNotionTasksDb,
  disconnectNotion,
  disconnectGoogle,
} from "./actions"

export default async function SettingsPage() {
  const { supabase, userId } = await verifySession()
  const [{ data: cfg }, { data: integ }] = await Promise.all([
    supabase.from("rest_config").select("early_rise_threshold, deep_work_daily_goal_h, billable_weekly_goal_h").eq("user_id", userId).maybeSingle(),
    supabase.from("user_integrations").select("*").eq("user_id", userId).maybeSingle(),
  ])

  return (
    <div className="space-y-6">
      <LiveHeader title="Settings" subtitle="Integrations & preferences" />

      {/* ── Productivity goals ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Productivity goals</CardTitle>
          <CardDescription>Daily and weekly targets used across the dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveGoals} className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Early rise threshold</Label>
              <Input
                name="early_rise_threshold"
                type="time"
                defaultValue={cfg?.early_rise_threshold ?? "07:30"}
              />
            </div>
            <div>
              <Label>Deep work daily goal (hours)</Label>
              <Input
                name="deep_work_daily_goal_h"
                type="number"
                step="0.5"
                min="0"
                defaultValue={cfg?.deep_work_daily_goal_h ?? 4}
              />
            </div>
            <div>
              <Label>Billable weekly goal (hours)</Label>
              <Input
                name="billable_weekly_goal_h"
                type="number"
                step="0.5"
                min="0"
                defaultValue={cfg?.billable_weekly_goal_h ?? 20}
              />
            </div>
            <div className="md:col-span-3">
              <Button type="submit">Save</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Notion ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Notion{" "}
            {integ?.notion_access_token ? <Badge variant="good">connected</Badge> : <Badge variant="outline">not connected</Badge>}
          </CardTitle>
          <CardDescription>Tasks database for Focus & Today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {integ?.notion_access_token ? (
            <>
              <form action={saveNotionTasksDb} className="space-y-2">
                <Label>Tasks database ID</Label>
                <Input
                  name="notion_tasks_db_id"
                  defaultValue={integ.notion_tasks_db_id ?? ""}
                  placeholder="32-character Notion DB ID"
                />
                <Button type="submit" size="sm">Save</Button>
              </form>
              <form action={disconnectNotion}>
                <Button type="submit" variant="ghost" size="sm">Disconnect</Button>
              </form>
            </>
          ) : (
            <a
              href="/api/integrations/notion/authorize"
              className="inline-flex items-center justify-center rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg active:scale-95 transition-all duration-150"
            >
              Connect Notion
            </a>
          )}
        </CardContent>
      </Card>

      {/* ── Google Calendar ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Google Calendar{" "}
            {integ?.google_access_token ? <Badge variant="good">connected</Badge> : <Badge variant="outline">not connected</Badge>}
          </CardTitle>
          <CardDescription>Agenda sync for Focus & morning routine</CardDescription>
        </CardHeader>
        <CardContent>
          {integ?.google_access_token ? (
            <form action={disconnectGoogle}>
              <Button type="submit" variant="ghost" size="sm">Disconnect</Button>
            </form>
          ) : (
            <a
              href="/api/integrations/google/authorize"
              className="inline-flex items-center justify-center rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg active:scale-95 transition-all duration-150"
            >
              Connect Google Calendar
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
