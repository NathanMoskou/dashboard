"use client"
import { useState, useTransition } from "react"
import { Check, Loader2, Sparkles, Sunrise, Sun, Moon, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleHabit, skipHabitForDay } from "./actions"

const TIME_ICON = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
  anytime: Sparkles,
} as const

const SKIP_REASONS = ["Moe", "Geen tijd", "Vergeten", "Bewust", "Anders"] as const

export function HabitRow({
  id,
  name,
  dosage,
  done,
  isAuto,
  isSkipped,
  streak,
  date,
  timeOfDay,
  cue,
  /** Optional weekly progress, shown instead of streak when set. */
  weekly,
}: {
  id: string
  name: string
  dosage: string | null
  done: boolean
  isAuto: boolean
  isSkipped?: boolean
  streak: number
  date: string
  timeOfDay?: "morning" | "afternoon" | "evening" | "anytime" | null
  /** Optional "after X" cue when this habit is paired behind another. */
  cue?: string | null
  weekly?: { hits: number; target: number } | null
}) {
  const [pending, start] = useTransition()
  const [skipping, startSkip] = useTransition()
  const [menu, setMenu] = useState(false)
  const TimeIcon = timeOfDay && TIME_ICON[timeOfDay] ? TIME_ICON[timeOfDay] : null

  function doSkip(reason: string) {
    setMenu(false)
    startSkip(() => skipHabitForDay(id, date, reason))
  }

  return (
    <div
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-all duration-200 ease-[var(--ease-spring)]",
        done && !isSkipped ? "bg-good/8 border-good/30" : "",
        isSkipped ? "opacity-60" : "",
      )}
    >
      {/* Check / toggle button */}
      <button
        type="button"
        onClick={() => !isAuto && !isSkipped && start(() => toggleHabit(id, date, done))}
        disabled={pending || isAuto}
        aria-label={done ? `${name} afgevinkt — opnieuw togglen` : `${name} afvinken`}
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ease-[var(--ease-spring)]",
          done && !isSkipped
            ? "border-good bg-good text-white scale-100 active:scale-90"
            : "border-border bg-card text-transparent hover:border-fg/40 active:scale-90",
          isSkipped && "border-dashed border-muted-fg/40 bg-transparent",
        )}
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin text-current" />
        ) : done && !isSkipped ? (
          <Check size={14} className="pop-in" />
        ) : isSkipped ? (
          <span className="text-[10px] font-bold text-muted-fg">↷</span>
        ) : null}
      </button>

      {/* Name + dosage + optional cue */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {TimeIcon ? <TimeIcon size={12} className="shrink-0 text-muted-fg" aria-hidden="true" /> : null}
          <span className={cn("text-sm font-medium truncate", done && !isSkipped && "line-through opacity-70")}>
            {name}
          </span>
        </div>
        {cue ? <div className="text-[11px] text-muted-fg mt-0.5">{cue}</div> : null}
        {dosage ? <div className="text-[11px] text-muted-fg mt-0.5">{dosage}</div> : null}
      </div>

      {/* Streak / weekly progress + auto-fired indicator */}
      <div className="flex items-center gap-2 shrink-0">
        {isAuto ? <Sparkles size={13} className="text-muted-fg" /> : null}
        {weekly ? (
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              weekly.hits >= weekly.target ? "text-good" : "text-muted-fg",
            )}
            title={`${weekly.hits} van ${weekly.target} deze week`}
          >
            {weekly.hits}/{weekly.target}w
          </span>
        ) : streak > 0 ? (
          <span className="text-xs font-semibold text-muted-fg tabular-nums">🔥 {streak}</span>
        ) : null}

        {/* Overflow menu — Skip today (with optional reason) */}
        {!done && !isAuto ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-label="Meer opties"
              className="p-1 rounded-md text-muted-fg hover:text-fg hover:bg-muted/60 transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
            {menu ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[170px] rounded-xl bg-card shadow-[var(--shadow-card-hover)] border border-border overflow-hidden py-1 text-sm">
                  <div className="px-3 pt-1.5 pb-1 text-[10px] uppercase tracking-wider text-muted-fg">
                    Overslaan vandaag
                  </div>
                  {SKIP_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      disabled={skipping}
                      onClick={() => doSkip(r)}
                      className="block w-full text-left px-3 py-1.5 hover:bg-muted/60 transition-colors"
                    >
                      {r}
                    </button>
                  ))}
                  <div className="border-t border-border my-1" />
                  <button
                    type="button"
                    disabled={skipping}
                    onClick={() => doSkip("")}
                    className="block w-full text-left px-3 py-1.5 hover:bg-muted/60 transition-colors text-muted-fg"
                  >
                    Overslaan zonder reden
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
