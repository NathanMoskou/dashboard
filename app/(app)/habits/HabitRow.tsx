"use client"
import { useTransition } from "react"
import { Check, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { toggleHabit } from "./actions"

export function HabitRow({
  id,
  name,
  dosage,
  done,
  isAuto,
  streak,
  date,
}: {
  id: string
  name: string
  dosage: string | null
  done: boolean
  isAuto: boolean
  streak: number
  date: string
}) {
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() => start(() => toggleHabit(id, date, done))}
      disabled={pending || isAuto}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left transition-colors",
        done ? "bg-good/10 border-good/30" : "bg-card hover:bg-muted",
        isAuto && "cursor-default",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full border",
          done ? "border-good bg-good text-white" : "border-border bg-card",
        )}
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : done ? (
          <Check size={14} />
        ) : null}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{name}</span>
        {dosage ? <span className="block text-xs text-muted-fg">{dosage}</span> : null}
      </span>
      {isAuto ? <Sparkles size={14} className="text-muted-fg" /> : null}
      {streak > 0 ? (
        <span className="text-xs font-medium text-muted-fg">🔥 {streak}</span>
      ) : null}
    </button>
  )
}
