import { verifySession } from "@/lib/dal"
import { ActiveFocus } from "./ActiveFocus"

export default async function ActiveFocusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const sp = await searchParams
  if (!sp.id) return <p className="p-4">Geen sessie.</p>
  const { supabase } = await verifySession()
  const { data: session } = await supabase
    .from("focus_sessions")
    .select("*, clients(name, hourly_rate_eur)")
    .eq("id", sp.id)
    .single()
  if (!session) return <p className="p-4">Sessie niet gevonden.</p>

  const c = (session as unknown as { clients?: { name: string; hourly_rate_eur: number } | null })
    .clients
  return (
    <ActiveFocus
      sessionId={session.id}
      task={session.task_description ?? ""}
      type={session.type ?? "deep_work"}
      isBillable={!!session.is_billable}
      clientName={c?.name ?? null}
      hourlyRate={c?.hourly_rate_eur ? Number(c.hourly_rate_eur) : null}
      startedAt={session.started_at}
      hasNotionTask={!!session.notion_task_id}
    />
  )
}
