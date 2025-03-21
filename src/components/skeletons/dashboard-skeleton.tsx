import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="w-full space-y-6">
      {/* Header section with stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[70px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-7 w-[120px] mt-4" />
            <div className="flex items-center pt-4">
              <Skeleton className="h-3 w-[60px]" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent trades section */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[250px] mt-1" />
        </div>
        <div className="p-6 pt-0">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="rounded-md border overflow-hidden">
                <div className="bg-accent/50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-[140px]" />
                    <Skeleton className="h-5 w-[80px]" />
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-[120px]" />
                        </div>
                        <Skeleton className="h-4 w-[60px]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart section */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <Skeleton className="h-6 w-[150px]" />
        </div>
        <div className="p-6 pt-0">
          {/* Chart skeleton */}
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    </div>
  );
} 