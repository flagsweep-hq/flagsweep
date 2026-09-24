import { Skeleton } from '@/components/ui/skeleton'

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="border-b px-6 py-3">
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="px-6">
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  )
}
