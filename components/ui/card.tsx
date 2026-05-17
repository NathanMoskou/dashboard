import * as React from "react"
import { cn } from "@/lib/utils"

export function Card({
  className,
  accent,
  style,
  ...p
}: React.HTMLAttributes<HTMLDivElement> & { accent?: string }) {
  const accentStyle: React.CSSProperties = accent
    ? { borderLeftWidth: "3px", borderLeftStyle: "solid", borderLeftColor: accent }
    : {}
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-fg shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-200",
        className,
      )}
      style={{ ...style, ...accentStyle }}
      {...p}
    />
  )
}

export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...p} />
}

export function CardTitle({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-base font-bold tracking-tight", className)} {...p} />
}

export function CardDescription({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm text-muted-fg", className)} {...p} />
}

export function CardContent({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...p} />
}

export function CardFooter({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-5 pt-0", className)} {...p} />
}
