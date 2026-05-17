import { Suspense, cache } from "react"
import Link from "next/link"
import { verifySession } from "@/lib/dal"
import { fetchOpenTasks, fetchClosedTasks } from "@/lib/notion"
import { fetchEventsForDay } from "@/lib/google"
import { fetchRecentThreads } from "@/lib/gmail"
import { triageEmails } from "@/lib/gemini"
import { inferProject } from "@/lib/morning/inferences"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/server"
import { QuickCapture } from "@/components/morning/QuickCapture"
import { DeadlineStrip } from "@/components/morning/DeadlineStrip"
import { DayPlanToggle } from "@/components/morning/DayPlanToggle"
import { loadRoutineForUser } from "@/lib/morning/routine-data"
import { TakenBuckets } from "@/components/morning/TakenBuckets"
import { ProjectPulse } from "@/components/morning/ProjectPulse"
import { InboxTriage, type TriagedEmail } from "@/components/morning/InboxTriage"
import { RefreshButton } from "@/components/morning/RefreshButton"
import { LiveHeader } from "@/components/ui/LiveHeader"
import { CollapsibleSection } from "@/components/ui/Collapsible"

export const dynamic = "force-dynamic"

// Shared per-request user_integrations fetch — every section needs to know what's connected.
const getIntegrations = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_integrations")
    .select(
      "notion_access_token, notion_tasks_db_id, google_access_token, google_refresh_token, email_state",
    )
    .maybeSingle()
  return {
    notionConnected: !!data?.notion_access_token && !!data?.notion_tasks_db_id,
    googleConnected: !!data?.google_access_token,
    emailState: (data?.email_state as
      | { triaged?: Record<string, number>; snoozed?: Record<string, number> }
      | null) ?? { triaged: {}, snoozed: {} },
  }
})

export default async function ProductiviteitDashboard() {
  await verifySession()

  return (
    <div className="space-y-6">
      <LiveHeader
        title="Focus"
        subtitle="Taken, agenda & inbox · productief starten"
        action={<RefreshButton />}
      />

      <Suspense fallback={null}>
        <ConnectionBanner />
      </Suspense>

      {/* Instant — no data fetch */}
      <QuickCapture />

      <CollapsibleSection title="Binnenkort">
        <Suspense fallback={<Skeleton className="h-14 w-full" />}>
          <DeadlineSection />
        </Suspense>
      </CollapsibleSection>

      <CollapsibleSection title="Agenda">
        <section className="space-y-4">
          <Suspense fallback={<AgendaHeader connected pending />}>
            <AgendaHeader />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <DayPlanToggleSection />
          </Suspense>
        </section>
      </CollapsibleSection>

      <CollapsibleSection title="Taken">
        <Suspense fallback={<CardSkeleton title="📋 Taken — uit Notion" rows={4} />}>
          <TakenBucketsSection />
        </Suspense>
      </CollapsibleSection>

      <CollapsibleSection title="Inbox">
        <Suspense fallback={<CardSkeleton title="📥 Inbox triage" rows={3} />}>
          <InboxTriageSection />
        </Suspense>
      </CollapsibleSection>

      <CollapsibleSection title="Projecten" defaultOpen={false}>
        <Suspense fallback={null}>
          <ProjectPulseSection />
        </Suspense>
      </CollapsibleSection>

    </div>
  )
}

async function ConnectionBanner() {
  const { notionConnected, googleConnected } = await getIntegrations()
  if (notionConnected && googleConnected) return null
  return (
    <Card className="p-4 bg-muted/40">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          {!notionConnected && !googleConnected
            ? "Verbind Notion en Google Calendar om je dashboard te activeren."
            : !notionConnected
            ? "Notion is nog niet verbonden — taken en deadlines blijven leeg."
            : "Google Calendar is nog niet verbonden — agenda blijft leeg."}
        </div>
        <Link
          href="/settings"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted"
        >
          Naar instellingen
        </Link>
      </div>
    </Card>
  )
}

async function DeadlineSection() {
  const { notionConnected } = await getIntegrations()
  const tasks = notionConnected ? await fetchOpenTasks() : []
  return <DeadlineStrip tasks={tasks} />
}

async function AgendaHeader({
  connected,
  pending,
}: {
  connected?: boolean
  pending?: boolean
} = {}) {
  let isConnected: boolean
  let eventCount: number | null
  if (pending) {
    isConnected = !!connected
    eventCount = null
  } else {
    const { googleConnected } = await getIntegrations()
    isConnected = googleConnected
    if (isConnected) {
      const [today, tomorrow] = await Promise.all([
        fetchEventsForDay(0),
        fetchEventsForDay(1),
      ])
      eventCount = today.length + tomorrow.length
    } else {
      eventCount = null
    }
  }
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span>📅</span> Agenda
      </div>
      {isConnected ? (
        <Badge variant="good" className="text-[10px]">
          {eventCount == null ? "Sync…" : `Sync • ${eventCount} events`}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-[10px]">
          Niet verbonden
        </Badge>
      )}
    </div>
  )
}

async function DayPlanToggleSection() {
  const { googleConnected } = await getIntegrations()
  const [todayEvents, tomorrowEvents, routineBlocks] = await Promise.all([
    googleConnected ? fetchEventsForDay(0) : Promise.resolve([]),
    googleConnected ? fetchEventsForDay(1) : Promise.resolve([]),
    loadRoutineForUser(),
  ])
  return (
    <DayPlanToggle
      todayEvents={todayEvents}
      tomorrowEvents={tomorrowEvents}
      googleConnected={googleConnected}
      routineBlocks={routineBlocks}
    />
  )
}

async function TakenBucketsSection() {
  const { notionConnected } = await getIntegrations()
  const tasks = notionConnected ? await fetchOpenTasks() : []
  return <TakenBuckets tasks={tasks} />
}

async function InboxTriageSection() {
  const { googleConnected, emailState } = await getIntegrations()
  if (!googleConnected) return <InboxTriage emails={[]} />

  const threads = await fetchRecentThreads(48, 15)
  const now = Date.now()
  const filtered = threads.filter((t) => {
    if (emailState.triaged?.[t.threadId]) return false
    const snoozedUntil = emailState.snoozed?.[t.threadId]
    if (snoozedUntil && now < snoozedUntil) return false
    return true
  })

  const geminiConfigured = !!process.env.GEMINI_API_KEY
  const verdicts = filtered.length && geminiConfigured
    ? await triageEmails(
        filtered.map((t) => ({
          fromEmail: t.fromEmail,
          subject: t.subject,
          snippet: t.snippet,
        })),
      )
    : []
  const byIndex = new Map(verdicts.map((v) => [v.i, v]))
  const triaged: TriagedEmail[] = filtered.map((t, i) => {
    const v = byIndex.get(i)
    return {
      threadId: t.threadId,
      fromName: t.fromName,
      fromEmail: t.fromEmail,
      replyTo: t.replyTo,
      subject: t.subject,
      snippet: t.snippet,
      isForwarded: t.isForwarded,
      originalSender: t.originalSender,
      receivedAt: t.receivedAt,
      priority: v?.priority ?? 3,
      action: v?.action ?? "Lees en beslis",
      inferredProject: inferProject(`${t.fromEmail} ${t.subject} ${t.snippet}`),
    }
  })
  return <InboxTriage emails={triaged} />
}

async function ProjectPulseSection() {
  const { notionConnected } = await getIntegrations()
  const closed = notionConnected ? await fetchClosedTasks(30) : []
  return <ProjectPulse closed={closed} />
}
