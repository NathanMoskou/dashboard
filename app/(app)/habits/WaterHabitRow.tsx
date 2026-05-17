"use client"
import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { setWaterQuantity } from "./actions"

export function WaterHabitRow({
  id,
  name,
  target,
  current,
  date,
}: {
  id: string
  name: string
  target: number
  current: number
  date: string
}) {
  const [value, setValue] = useState(current)
  const [pending, start] = useTransition()
  const done = value >= target
  const pct = Math.min(100, (value / target) * 100)

  function handleRelease() {
    start(() => setWaterQuantity(id, date, value))
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border px-3 py-3 transition-colors",
        done ? "bg-good/10 border-good/30" : "bg-card",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <span className={cn("text-sm font-bold tabular-nums", done ? "text-good" : "text-fg")}>
          {value % 1 === 0 ? value : value.toFixed(2).replace(/\.?0+$/, "")} / {target} L
          {pending ? <Loader2 size={12} className="inline ml-1.5 animate-spin text-muted-fg" /> : null}
        </span>
      </div>

      <div className="relative">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", done ? "bg-good" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={target}
        step={0.25}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onMouseUp={handleRelease}
        onTouchEnd={handleRelease}
        className="w-full cursor-pointer accent-primary"
      />
      <div className="flex justify-between text-[10px] text-muted-fg -mt-1 select-none">
        <span>0L</span>
        <span>{target / 2}L</span>
        <span>{target}L</span>
      </div>
    </div>
  )
}
