import { Skeleton, CardSkeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="rounded-xl bg-muted/40 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-6 rounded" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-16 w-full rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <CardSkeleton title="Recente entries" rows={3} />
    </div>
  )
}
