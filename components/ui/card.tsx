import * as React from "react"
import { cn } from "@/lib/utils"

export function Card({
  className,
  accent,
  hero,
  style,
  ...p
}: React.HTMLAttributes<HTMLDivElement> & { accent?: string; hero?: boolean }) {
  // Accent now renders as a soft left-edge tint instead of a hard top border.
  // Subtle section coloring without the loud "candy stripe" look.
  const accentStyle: React.CSSProperties = accent
    ? { boxShadow: `inset 3px 0 0 ${accent}, var(--shadow-card)` }
    : {}
  return (
    <div
      className={cn(
        hero ? "rounded-3xl" : "rounded-2xl",
        // Subtle hairline border so cards stay visible on mobile where the
        // scroll container is `bg-card` (white-on-white otherwise). Bevel
        // does this too — soft separation without the heavy navy shadow.
        "border border-border/70 bg-card text-card-fg shadow-[var(--shadow-card)]",
        "transition-shadow duration-300 ease-[var(--ease-out)]",
        "md:hover:shadow-[var(--shadow-card-hover)]",
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
