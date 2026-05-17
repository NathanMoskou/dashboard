import { verifySession, getRestConfig } from "@/lib/dal"
import { startSession } from "../actions"
import { ActiveSession } from "./ActiveSession"

export default async function ActivePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; template?: string }>
}) {
  const sp = await searchParams
  const { supabase } = await verifySession()

  if (!sp.session) {
    const tpl = sp.template === "freestyle" ? null : sp.template ?? null
    await startSession(tpl)
    return null
  }

  const sessionId = sp.session
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", sessionId)
    .single()

  if (!session) return <p className="p-4">Sessie niet gevonden.</p>

  const [{ data: sets }, { data: exercises }, { data: templateExercises }, cfg] =
    await Promise.all([
      supabase
        .from("workout_sets")
        .select("*")
        .eq("session_id", sessionId)
        .order("completed_at", { ascending: true }),
      supabase
        .from("exercises")
        .select("id, name, category, primary_muscle_group, equipment")
        .order("name"),
      supabase
        .from("template_exercises")
        .select("*, exercises(id, name, category, primary_muscle_group)")
        .eq("template_id", session.template_id ?? "00000000-0000-0000-0000-000000000000")
        .order("display_order", { ascending: true }),
      getRestConfig(),
    ])

  return (
    <ActiveSession
      sessionId={sessionId}
      initialSets={sets ?? []}
      exercises={exercises ?? []}
      templateExercises={(templateExercises ?? []) as never}
      restConfig={cfg ?? null}
    />
  )
}
