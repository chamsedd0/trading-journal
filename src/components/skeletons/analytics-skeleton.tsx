import { Skeleton } from "@/components/ui/skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-[160px]" />
          <Skeleton className="h-4 w-[280px] mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-[120px] rounded-md" />
        </div>
      </div>

      {/* Key metrics cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-[80px] mt-4" />
            <div className="flex items-center pt-4">
              <Skeleton className={`h-3 w-[60px] ${i % 2 === 0 ? 'bg-green-200' : 'bg-red-200'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Pie chart */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[200px] mt-1" />
          </div>
          <div className="p-6 pt-0 flex justify-center items-center">
            <Skeleton className="h-[250px] w-[250px] rounded-full" />
          </div>
          <div className="p-6 pt-0">
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className={`h-3 w-3 rounded-full ${['bg-blue-200', 'bg-green-200', 'bg-yellow-200', 'bg-red-200'][i-1]}`} />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <Skeleton className="h-6 w-[180px]" />
            <Skeleton className="h-4 w-[240px] mt-1" />
          </div>
          <div className="p-6 pt-0 h-[300px] flex items-end justify-between">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className={`w-8 ${['h-20', 'h-24', 'h-16', 'h-32', 'h-28', 'h-12', 'h-20', 'h-24'][i-1]}`} />
                <Skeleton className="h-4 w-[30px]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Line chart */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[240px] mt-1" />
        </div>
        <div className="p-6 pt-0">
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>

      {/* Stats Table */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <Skeleton className="h-6 w-[150px]" />
        </div>
        <div className="p-6 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-6 w-[80px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 