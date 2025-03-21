import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

export function AccountsPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px] mt-2" />
        </div>
        <Skeleton className="h-10 w-[140px]" />
      </div>
      
      {/* Account type cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-[120px]" />
              </div>
              <Skeleton className="h-4 w-[80px] mt-1" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-[140px]" />
              <Skeleton className="h-4 w-[100px] mt-1" />
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Skeleton className="h-8 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Tabs */}
      <div>
        <Skeleton className="h-10 w-[300px] mb-6 rounded-md" />
        
        {/* Account cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <Skeleton className="h-6 w-[120px]" />
                    <div className="flex items-center gap-1 mt-1">
                      <Skeleton className="h-4 w-[80px]" />
                      <Skeleton className="h-4 w-[60px] ml-2" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-[80px] rounded-md" />
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j}>
                      <Skeleton className="h-4 w-[60px]" />
                      <Skeleton className="h-5 w-[80px] mt-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
              
              <CardFooter className="border-t pt-4">
                <Skeleton className="h-4 w-[140px]" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 