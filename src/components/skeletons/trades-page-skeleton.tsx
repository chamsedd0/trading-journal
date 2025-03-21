import { Skeleton } from "@/components/ui/skeleton";

export function TradesPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <Skeleton className="h-8 w-[180px]" />
        <Skeleton className="h-10 w-[150px] md:w-[150px]" />
      </div>

      {/* Filter section */}
      <div className="border rounded-lg p-4 bg-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        {/* Table header */}
        <div className="bg-muted/50 border-b">
          <div className="grid grid-cols-7 p-4 gap-3">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[70px]" />
            <Skeleton className="h-4 w-[70px]" />
            <Skeleton className="h-4 w-[70px]" />
            <Skeleton className="h-4 w-[70px]" />
            <Skeleton className="h-4 w-[40px]" />
          </div>
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b last:border-0">
            <div className="grid grid-cols-7 p-4 gap-3 items-center">
              <div className="space-y-1">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-3 w-[80px]" />
              </div>
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className="h-4 w-[60px]" />
              <Skeleton className={`h-4 w-[70px] ${i % 2 === 0 ? 'bg-green-200' : 'bg-red-200'}`} />
              <div className="flex justify-end">
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-[100px]" />
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8 rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
} 