import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[180px]" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      </div>
      
      {/* Performance Overview Card */}
      <div className="rounded-lg border bg-muted/40 shadow-md overflow-hidden">
        <div className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-6 w-[180px]" />
              </div>
              <Skeleton className="h-4 w-[280px] mt-1" />
            </div>
            <Skeleton className="h-8 w-[120px]" />
          </div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-[80px]" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 pt-0">
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
      
      {/* Trading Accounts Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-[180px]" />
          </div>
          <Skeleton className="h-9 w-[120px]" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <div className="p-5 flex justify-between items-center border-b">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div>
                    <Skeleton className="h-5 w-[120px]" />
                    <Skeleton className="h-4 w-[80px] mt-1" />
                  </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-6 w-[100px] mt-1" />
                </div>
                <div>
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-6 w-[100px] mt-1" />
                </div>
                <div>
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-6 w-[100px] mt-1" />
                </div>
                <div>
                  <Skeleton className="h-4 w-[80px]" />
                  <Skeleton className="h-6 w-[100px] mt-1" />
                </div>
              </div>
              
              <div className="px-5 pb-5">
                <Skeleton className="h-[100px] w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Challenge Accounts Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-6 w-[220px]" />
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <Skeleton className="h-5 w-[140px]" />
                  <Skeleton className="h-4 w-[100px] mt-1" />
                </div>
                <Skeleton className="h-6 w-[80px]" />
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-4 w-[60px]" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-4 w-[60px]" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-6 w-[70px] mt-1" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-[80px]" />
                    <Skeleton className="h-6 w-[70px] mt-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 