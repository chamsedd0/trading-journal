import { Skeleton } from "@/components/ui/skeleton";

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <Skeleton className="h-8 w-[140px]" />
      
      {/* Appearance Card */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 pb-3">
          <div className="space-y-1">
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[250px] mt-1" />
          </div>
        </div>
        <div className="p-6 pt-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-[100px]" />
              <Skeleton className="h-4 w-[280px]" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Notifications Card */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 pb-3">
          <div className="space-y-1">
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[280px] mt-1" />
          </div>
        </div>
        <div className="p-6 pt-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-[160px]" />
              <Skeleton className="h-4 w-[320px]" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Account Card */}
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="p-6 pb-3">
          <div className="space-y-1">
            <Skeleton className="h-6 w-[130px]" />
            <Skeleton className="h-4 w-[260px] mt-1" />
          </div>
        </div>
        <div className="p-6 pt-3 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-[100px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-[120px]" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
      
      {/* Save button */}
      <Skeleton className="h-10 w-[120px]" />
    </div>
  );
} 