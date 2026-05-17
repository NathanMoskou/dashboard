import { Skeleton, CardSkeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="-mx-4 bg-card rounded-t-3xl px-5 pt-7 pb-6 space-y-4 md:mx-0 md:bg-transparent md:rounded-none md:px-0 md:pt-0 md:space-y-6">
        <div className="mx-auto mb-1 h-1 w-10 rounded-full bg-border md:hidden" />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={1} />
        <CardSkeleton rows={3} />
      </div>
    </div>
  )
}
