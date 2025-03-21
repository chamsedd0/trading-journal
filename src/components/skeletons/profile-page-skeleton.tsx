import { Skeleton } from "@/components/ui/skeleton";

export function ProfilePageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-[180px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
      
      {/* User info section */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Profile picture */}
          <Skeleton className="h-24 w-24 rounded-full" />
          
          {/* User details */}
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-[220px]" />
            <Skeleton className="h-4 w-[180px]" />
            <div className="flex items-center gap-2 mt-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-[140px]" />
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-4 sm:mt-0 sm:border-l sm:pl-6 sm:border-muted">
            <div className="space-y-1">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-7 w-[60px]" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-7 w-[60px]" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Profile details */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 border-b">
          <Skeleton className="h-6 w-[160px]" />
          <Skeleton className="h-4 w-[280px] mt-2" />
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            {/* Second column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Trading preferences */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[260px] mt-2" />
        </div>
        
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-3 w-[180px]" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Save button */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-[120px]" />
      </div>
    </div>
  );
} 