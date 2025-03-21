import { Skeleton } from "@/components/ui/skeleton";

export function AccountFormSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div>
        <Skeleton className="h-8 w-[220px]" />
        <Skeleton className="h-4 w-[320px] mt-2" />
      </div>
      
      {/* Form Card */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[280px] mt-1" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Radio group section */}
          <div className="space-y-4">
            <Skeleton className="h-5 w-[180px]" />
            <div className="flex flex-col space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-5 w-[140px]" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Form fields - first column */}
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-5 w-[150px]" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            {/* Form fields - second column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-5 w-[140px]" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="space-y-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Card footer with buttons */}
        <div className="p-6 border-t flex justify-between">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
      </div>
    </div>
  );
} 