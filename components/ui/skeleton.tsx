import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/60",
        className,
      )}
    />
  )
}

export function CardSkeleton({
  title,
  rows = 3,
}: {
  title?: string
  rows?: number
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {title ? (
        <div className="text-sm font-semibold text-muted-fg">{title}</div>
      ) : (
        <Skeleton className="h-4 w-32" />
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}
