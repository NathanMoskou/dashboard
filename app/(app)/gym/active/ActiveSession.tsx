"use client"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Check, X, Pause, Play } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Label, Textarea } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { secondsToMS, cn } from "@/lib/utils"
import { restSeconds, warmupSets } from "@/lib/rest"
import { logSet, endSession } from "../actions"
import type { Database } from "@/types/database"

type ExerciseLite = {
  id: string
  name: string
  category: string | null
  primary_muscle_group: string
  equipment?: string | null
}
type TemplateExercise = Database["public"]["Tables"]["template_exercises"]["Row"] & {
  exercises: ExerciseLite | null
}
type WorkoutSet = Database["public"]["Tables"]["workout_sets"]["Row"]

type Props = {
  sessionId: string
  initialSets: WorkoutSet[]
  exercises: ExerciseLite[]
  templateExercises: TemplateExercise[]
  restConfig: Database["public"]["Tables"]["rest_config"]["Row"] | null
}

export function ActiveSession({
  sessionId,
  initialSets,
  exercises,
  templateExercises,
  restConfig,
}: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [sets, setSets] = useState<WorkoutSet[]>(initialSets)
  const [notes, setNotes] = useState("")
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(
    templateExercises[0]?.exercise_id ?? exercises[0]?.id ?? null,
  )
  const [weight, setWeight] = useState<string>("")
  const [reps, setReps] = useState<string>("8")
  const [setType, setSetType] = useState<"warmup" | "working" | "dropset" | "failure">("working")
  const [restRemaining, setRestRemaining] = useState<number>(0)
  const [restPaused, setRestPaused] = useState(false)
  const restRef = useRef<number | null>(null)

  // pre-populate weight from template last_used or latest set
  useEffect(() => {
    if (!activeExerciseId) return
    const tpl = templateExercises.find((t) => t.exercise_id === activeExerciseId)
    const last = [...sets]
      .reverse()
      .find((s) => s.exercise_id === activeExerciseId && s.set_type === "working")
    setWeight(
      last?.weight_kg
        ? String(last.weight_kg)
        : tpl?.last_used_weight_kg
        ? String(tpl.last_used_weight_kg)
        : "",
    )
  }, [activeExerciseId, templateExercises])

  // rest countdown
  useEffect(() => {
    if (restRemaining <= 0 || restPaused) return
    restRef.current = window.setTimeout(() => setRestRemaining((r) => r - 1), 1000)
    return () => {
      if (restRef.current) window.clearTimeout(restRef.current)
    }
  }, [restRemaining, restPaused])

  const activeEx = exercises.find((e) => e.id === activeExerciseId) ?? null
  const exerciseSets = useMemo(
    () => sets.filter((s) => s.exercise_id === activeExerciseId),
    [sets, activeExerciseId],
  )
  const tplEx = templateExercises.find((t) => t.exercise_id === activeExerciseId)

  // Warmup recommendation when no working sets done yet
  const showWarmup =
    activeEx && weight && exerciseSets.filter((s) => s.set_type === "warmup").length === 0
  const recommendedWarmup = activeEx && weight ? warmupSets(parseFloat(weight)) : []

  function commitSet() {
    if (!activeExerciseId) return
    const w = parseFloat(weight)
    const r = parseInt(reps, 10)
    if (Number.isNaN(w) || Number.isNaN(r) || r <= 0) return

    const setNumber = exerciseSets.length + 1
    const restS =
      setType === "warmup"
        ? 60
        : restSeconds(
            (activeEx?.category ?? "compound") as "compound" | "isolation",
            r,
            restConfig,
            tplEx?.rest_override_s ?? null,
          )

    start(() =>
      logSet({
        sessionId,
        exerciseId: activeExerciseId,
        setNumber,
        setType,
        weightKg: w,
        reps: r,
        restSeconds: restS,
      }).then(() => {
        setSets((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            session_id: sessionId,
            exercise_id: activeExerciseId,
            set_number: setNumber,
            set_type: setType,
            weight_kg: w,
            reps: r,
            completed: true,
            rest_seconds_taken: restS,
            completed_at: new Date().toISOString(),
            user_id: "",
          },
        ])
        setRestRemaining(restS)
        setRestPaused(false)
        if (setType === "warmup" && recommendedWarmup.length > 1) {
          // auto-advance to next warmup
          const idx = exerciseSets.filter((s) => s.set_type === "warmup").length + 1
          if (idx < recommendedWarmup.length) {
            setWeight(String(recommendedWarmup[idx].weight))
            setReps(String(recommendedWarmup[idx].reps))
          } else {
            setSetType("working")
          }
        }
      }),
    )
  }

  function finish() {
    start(() => endSession(sessionId, notes || null))
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Actieve sessie</h1>
        <Button variant="outline" onClick={() => router.push("/gym")}>
          <X size={16} /> Sluit
        </Button>
      </header>

      {/* Rest timer */}
      {restRemaining > 0 ? (
        <Card className="bg-muted">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-fg">Rust</div>
              <div className="text-3xl font-semibold tabular-nums">{secondsToMS(restRemaining)}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRestPaused((p) => !p)}>
                {restPaused ? <Play size={14} /> : <Pause size={14} />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRestRemaining((r) => r + 30)}>
                +30s
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRestRemaining(0)}>
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Exercise picker */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Oefening</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={activeExerciseId ?? ""}
            onChange={(e) => setActiveExerciseId(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
          >
            {(templateExercises.length ? templateExercises.map((t) => t.exercises) : exercises)
              .filter(Boolean)
              .map((e) =>
                e ? (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.primary_muscle_group}
                  </option>
                ) : null,
              )}
          </select>
        </CardContent>
      </Card>

      {/* Warmup helper */}
      {showWarmup ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Warmup voorstel</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {recommendedWarmup.map((w, i) => (
              <div key={i} className="flex justify-between">
                <span>W{i + 1}</span>
                <span>
                  {w.weight} kg × {w.reps}
                </span>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => {
                setSetType("warmup")
                setWeight(String(recommendedWarmup[0].weight))
                setReps(String(recommendedWarmup[0].reps))
              }}
            >
              Begin met warmup
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Active set card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-muted-fg">
            Set {exerciseSets.length + 1}{" "}
            {tplEx?.target_sets ? `/ ${tplEx.target_sets}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Gewicht (kg)</Label>
              <Input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div>
              <Label>Reps</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["warmup", "working", "dropset", "failure"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSetType(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs",
                  setType === t ? "border-fg bg-fg text-bg" : "border-border text-muted-fg",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <Button onClick={commitSet} disabled={pending} className="w-full">
            <Check size={16} /> Set klaar
          </Button>
        </CardContent>
      </Card>

      {/* Sets log */}
      {exerciseSets.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Vandaag — {activeEx?.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {exerciseSets.map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b border-border py-1.5 last:border-0">
                <span>
                  <Badge variant="outline">#{s.set_number}</Badge>{" "}
                  <span className="ml-1 text-xs text-muted-fg">{s.set_type}</span>
                </span>
                <span className="tabular-nums">
                  {Number(s.weight_kg)} kg × {s.reps}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* Finish */}
      <Card>
        <CardHeader>
          <CardTitle>Sessie afsluiten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea placeholder="Notities (optioneel)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button onClick={finish} disabled={pending} variant="good" className="w-full">
            Klaar — bewaar workout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
