"use client"
import { useState, useTransition } from "react"
import { Pencil, Loader2, X, Check, SkipForward } from "lucide-react"
import { cn } from "@/lib/utils"
import { setDeepWorkOverride } from "./actions"

/**
 * Inline tap-to-edit for the day's deep-work value. Lives below the hero
 * ring trio. Shows current state (auto / manual / skipped) and opens a
 * small popover where the user can override the value or skip the day.
 */
export function DeepWorkOverride({
  date,
  autoHours,
  manualHours,
  skipped,
}: {
  date: string
  /** Sum from focus_sessions — used as the implicit fallback. */
  autoHours: number
  manualHours: number | null
  skipped: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [hoursInput, setHoursInput] = useState(
    manualHours != null ? String(manualHours) : autoHours > 0 ? autoHours.toFixed(1) : "",
  )
  const [skipDraft, setSkipDraft] = useState(skipped)

  function save() {
    const parsed = hoursInput.trim() === "" ? null : Number(hoursInput.replace(",", "."))
    if (parsed != null && !Number.isFinite(parsed)) return
    start(async () => {
      await setDeepWorkOverride({
        date,
        manualHours: parsed,
        skipped: skipDraft,
      })
      setOpen(false)
    })
  }

  function clearAll() {
    setHoursInput("")
    setSkipDraft(false)
    start(async () => {
      await setDeepWorkOverride({ date, manualHours: null, skipped: false })
      setOpen(false)
    })
  }

  // Status pill shown when collapsed
  let status: string
  if (skipped) status = "Overgeslagen voor vandaag"
  else if (manualHours != null) status = `Handmatig: ${manualHours.toFixed(1)}u`
  else if (autoHours > 0) status = `${autoHours.toFixed(1)}u uit Focus`
  else status = "Pas deep work aan voor vandaag"

  return (
    <div className="pt-3 border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 text-[11px] text-muted-fg hover:text-fg transition-colors",
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          {skipped ? <SkipForward size={11} /> : <Pencil size={11} />}
          <span>{status}</span>
        </span>
        <span className="text-[10px] opacity-70">{open ? "Sluit" : "Wijzig"}</span>
      </button>

      {open ? (
        <div className="mt-3 space-y-3 rounded-xl bg-muted/40 p-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-muted-fg mb-1.5">
              Handmatige uren (overschrijft Focus-sessies)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0"
                max="24"
                value={hoursInput}
                disabled={skipDraft || pending}
                onChange={(e) => setHoursInput(e.target.value)}
                placeholder={autoHours > 0 ? autoHours.toFixed(1) : "0"}
                className="h-9 flex-1 rounded-xl border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
              />
              <span className="self-center text-xs text-muted-fg">uur</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={skipDraft}
              disabled={pending}
              onChange={(e) => setSkipDraft(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span>Skip deep work voor vandaag</span>
            <span className="text-[10px] text-muted-fg ml-1">(Life Score = 100% Habits)</span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-fg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.96] disabled:opacity-60"
            >
              {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Bewaar
            </button>
            {(manualHours != null || skipped) ? (
              <button
                type="button"
                onClick={clearAll}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-fg transition-all duration-200 ease-[var(--ease-spring)] hover:text-fg hover:bg-muted active:scale-[0.96] disabled:opacity-60"
              >
                <X size={12} />
                Reset (terug naar auto)
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
