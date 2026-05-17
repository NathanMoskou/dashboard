import { Skeleton, CardSkeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <CardSkeleton rows={1} />
      <CardSkeleton title="Binnenkort" rows={3} />
      <CardSkeleton title="Agenda" rows={4} />
      <CardSkeleton title="Taken" rows={5} />
    </div>
  )
}
