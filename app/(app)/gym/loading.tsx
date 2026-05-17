import { Skeleton, CardSkeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <CardSkeleton rows={2} />
      <CardSkeleton title="Start workout" rows={3} />
      <CardSkeleton title="Recente sessies" rows={4} />
    </div>
  )
}
