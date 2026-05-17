import { Skeleton, CardSkeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <CardSkeleton title="Rust tijden" rows={3} />
      <CardSkeleton title="Apple Health API key" rows={1} />
      <CardSkeleton title="Notion" rows={2} />
      <CardSkeleton title="Google Calendar" rows={1} />
    </div>
  )
}
