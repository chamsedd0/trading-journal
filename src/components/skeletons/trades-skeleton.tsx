import { Skeleton } from "@/components/ui/skeleton";

export function TradesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-[180px]" />
          <Skeleton className="h-4 w-[240px] mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-[120px] rounded-md" />
        </div>
      </div>

      {/* Filters section */}
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
          <div className="ml-auto">
            <Skeleton className="h-10 w-[100px]" />
          </div>
        </div>
      </div>

      {/* Table header */}
      <div className="rounded-md border">
        <div className="border-b bg-muted/50">
          <div className="grid grid-cols-6 md:grid-cols-8 p-4 gap-4">
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-4 w-[80px] hidden md:block" />
            <Skeleton className="h-4 w-[40px] hidden md:block" />
          </div>
        </div>

        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="border-b last:border-0">
            <div className="grid grid-cols-6 md:grid-cols-8 p-4 gap-4 items-center">
              <div>
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-3 w-[50px] mt-1" />
              </div>
              <Skeleton className="h-4 w-[90px]" />
              <Skeleton className="h-4 w-[70px]" />
              <Skeleton className="h-4 w-[70px]" />
              <Skeleton className="h-4 w-[70px]" />
              <div>
                <Skeleton className={`h-4 w-[60px] ${i % 2 === 0 ? 'bg-green-200' : 'bg-red-200'}`} />
              </div>
              <Skeleton className="h-4 w-[60px] hidden md:block" />
              <div className="flex justify-end">
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-[120px]" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
} 