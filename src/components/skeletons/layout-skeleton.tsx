import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LayoutSkeletonProps {
  children?: React.ReactNode;
  collapsed?: boolean;
}

export function LayoutSkeleton({ children, collapsed = false }: LayoutSkeletonProps) {
  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Sidebar */}
      <aside className={cn(
        "bg-background border-r transition-all z-50 sticky top-0 h-screen",
        collapsed ? "w-[70px]" : "w-64",
        "hidden md:flex"
      )}>
        <div className={cn(
          "p-4 flex-1 h-full flex flex-col",
          collapsed ? "items-center" : ""
        )}>
          {/* Logo */}
          <div className="flex items-center h-12 mb-6">
            {collapsed ? (
              <Skeleton className="h-8 w-8 rounded-md" />
            ) : (
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-5 w-[140px]" />
              </div>
            )}
          </div>

          {/* Nav items */}
          <div className="space-y-2 w-full">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={cn(
                "flex items-center rounded-md h-10 px-2",
                collapsed ? "justify-center" : "space-x-2"
              )}>
                <Skeleton className="h-5 w-5 rounded-md" />
                {!collapsed && <Skeleton className="h-4 w-[120px]" />}
              </div>
            ))}
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <div className="md:hidden flex items-center gap-2">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-4 w-[120px]" />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        
        <main className={cn(
          "flex-1 overflow-y-auto transition-all",
          collapsed ? "md:pl-[70px]" : "md:pl-64",
          "p-4 md:p-6"
        )}>
          <div className="max-w-6xl mx-auto">
            {children || <Skeleton className="h-[600px] w-full" />}
          </div>
        </main>
      </div>
    </div>
  );
} 