import * as React from "react"
import { cn } from "@/lib/utils"

export function Badge({
  className,
  variant = "default",
  ...p
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "outline" | "good" | "warn" | "bad" | "primary"
}) {
  const variants: Record<string, string> = {
    default: "bg-muted text-fg",
    outline: "border border-border text-muted-fg",
    good: "bg-good-soft text-good",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    primary: "bg-primary-soft text-primary",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        variants[variant],
        className,
      )}
      {...p}
    />
  )
}

export function Progress({ value, className, color }: { value: number; className?: string; color?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${v}%`, background: color ?? "var(--primary)" }}
      />
    </div>
  )
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px bg-border w-full", className)} />
}
