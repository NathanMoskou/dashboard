import { Skeleton, CardSkeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <CardSkeleton title="Vandaag" rows={1} />
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <CardSkeleton rows={3} />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <CardSkeleton rows={2} />
      </div>
    </div>
  )
}
