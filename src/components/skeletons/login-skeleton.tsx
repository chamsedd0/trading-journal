import { Skeleton } from "@/components/ui/skeleton";

export function LoginSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md border rounded-lg bg-card shadow-sm p-6">
        {/* Header */}
        <div className="space-y-1 text-center mb-6">
          <Skeleton className="h-8 w-[120px] mx-auto" />
          <Skeleton className="h-4 w-[220px] mx-auto mt-2" />
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-[60px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Skeleton className="w-full h-[1px]" />
            </div>
            <div className="relative flex justify-center">
              <Skeleton className="h-4 w-[140px] mx-auto" />
            </div>
          </div>

          {/* Google button */}
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Footer */}
        <div className="mt-6 space-y-4">
          <Skeleton className="h-4 w-[200px] mx-auto" />
          <Skeleton className="h-4 w-[100px] mx-auto" />
        </div>
      </div>
    </div>
  );
} 