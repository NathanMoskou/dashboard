import { Skeleton, CardSkeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="flex gap-1.5">
        {[7, 30, 90, 180].map((d) => (
          <Skeleton key={d} className="h-7 w-10 rounded-full" />
        ))}
      </div>
      <CardSkeleton rows={3} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <CardSkeleton title="Trends" rows={2} />
    </div>
  )
}
