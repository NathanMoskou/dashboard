export const revalidate = 300

import { Bell, Download } from "lucide-react"
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
  saveNotificationPrefs,
} from "./actions"
import { PushPermissionCard } from "./PushPermissionCard"
import { ThemeCard } from "./ThemeCard"
import { TodayWidgetsCard } from "./TodayWidgetsCard"
import { normalizeWidgetConfig } from "@/lib/today/widgets"
import type { ThemeMode } from "@/components/ui/ThemeController"

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
              className="inline-flex items-center justify-center rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96]"
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
              className="inline-flex items-center justify-center rounded-full bg-fg px-5 py-2 text-sm font-semibold text-bg active:scale-[0.96] transition-all duration-200 ease-[var(--ease-spring)]"
            >
              Connect Google Calendar
            </a>
          )}
        </CardContent>
      </Card>

      {/* ── Theme ───────────────────────────────────────────── */}
      <ThemeCard
        initialMode={(integ?.theme as ThemeMode | undefined) ?? "auto-time"}
        initialDarkStart={integ?.dark_start_hour ?? 21}
        initialDarkEnd={integ?.dark_end_hour ?? 6}
      />

      {/* ── Today widgets ───────────────────────────────────── */}
      <TodayWidgetsCard initial={normalizeWidgetConfig(integ?.today_widget_config)} />

      {/* ── Notifications ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell size={15} className="text-muted-fg" />
            Meldingen
          </CardTitle>
          <CardDescription>
            Push naar dit apparaat + tijdvoorkeuren voor de cron-trigger.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PushPermissionCard />
          <form action={saveNotificationPrefs} className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-medium">Ochtendbriefing</div>
                <div className="text-xs text-muted-fg">Habits voor vandaag + agenda-headline</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  name="notif_morning_time"
                  defaultValue={integ?.notif_morning_time ?? "09:00"}
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm w-[100px]"
                />
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="notif_morning_enabled"
                    defaultChecked={integ?.notif_morning_enabled ?? false}
                    className="h-4 w-4 accent-primary"
                  />
                  Aan
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-medium">Avondsamenvatting</div>
                <div className="text-xs text-muted-fg">Onafgevinkte habits + Life Score</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  name="notif_evening_time"
                  defaultValue={integ?.notif_evening_time ?? "20:00"}
                  className="h-9 rounded-md border border-border bg-card px-2 text-sm w-[100px]"
                />
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="notif_evening_enabled"
                    defaultChecked={integ?.notif_evening_enabled ?? false}
                    className="h-4 w-4 accent-primary"
                  />
                  Aan
                </label>
              </div>
            </div>

            <Button type="submit" size="sm">Bewaar voorkeuren</Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Backup & Export ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download size={15} className="text-muted-fg" />
            Backup &amp; export
          </CardTitle>
          <CardDescription>
            Download al je habits, focus-sessies, transacties en journaal-entries als JSON.
            OAuth tokens en wachtwoorden zijn uitgesloten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/api/export"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition-all duration-200 ease-[var(--ease-spring)] hover:bg-muted active:scale-[0.96]"
          >
            <Download size={14} />
            Download data (.json)
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
