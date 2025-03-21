import { Skeleton } from "@/components/ui/skeleton";

export function OnboardingSkeleton() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-lg border bg-card shadow-lg">
        {/* Header */}
        <div className="p-6 pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-8 w-[180px]" />
              <Skeleton className="h-4 w-[220px] mt-2" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-1 bg-secondary rounded-full mt-6">
            <Skeleton className="h-1 w-[40%] rounded-full" />
          </div>
        </div>
        
        {/* Form content */}
        <div className="p-6 space-y-6">
          {/* Form fields - varies by step, but this is a typical layout */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-10 w-full" />
              {i === 1 && <Skeleton className="h-3 w-[150px] mt-1" />}
            </div>
          ))}
          
          {/* Radio or checkbox options */}
          <div className="space-y-3 mt-6">
            <Skeleton className="h-4 w-[160px]" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-[180px]" />
              </div>
            ))}
          </div>
          
          {/* Textarea field */}
          <div className="space-y-2 mt-4">
            <Skeleton className="h-4 w-[140px]" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
        
        {/* Footer with buttons */}
        <div className="flex justify-between p-6 pt-2 border-t">
          <Skeleton className="h-10 w-[80px]" />
          <Skeleton className="h-10 w-[80px]" />
        </div>
      </div>
    </div>
  );
} 