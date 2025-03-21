'use client';

import Link from "next/link";
import { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import { LayoutSkeleton } from "@/components/skeletons/layout-skeleton";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Check for saved sidebar state in localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === 'true');
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed.toString());
  }, [collapsed]);
  
  useEffect(() => {
    // Redirect if user is not logged in
    if (!loading && !user) {
      router.push('/auth/login');
    }
    
    // Redirect if user has not completed setup
    if (!loading && user && user.profile?.setupComplete === false) {
      router.push('/onboarding');
    }
    
    // Close mobile sidebar when pathname changes
    setMobileOpen(false);
  }, [user, loading, router, pathname]);
  
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };
  
  if (loading) {
    return <LayoutSkeleton />;
  }
  
  if (!user) {
    return null; // The useEffect will redirect
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-all duration-300 ease"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "bg-background border-r transition-all z-50 sticky top-0 h-screen",
        collapsed ? "w-[70px]" : "w-64",
        mobileOpen ? "fixed inset-y-0 left-0" : "hidden md:flex",
      )}>
        <div className={cn(
          "p-4 flex-1 h-full flex flex-col",
          collapsed ? "items-center" : ""
        )}>
          <DashboardNav collapsed={collapsed} setCollapsed={setCollapsed} />
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="md:hidden flex items-center gap-2">
              <span className="text-primary text-xl font-bold">TJ</span>
              <span className="font-medium">Trading Journal</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-muted-foreground relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/75 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
            </Button>
            <Link href="/dashboard/profile">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </Link>
          </div>
        </header>
        
        <main className={cn(
          "flex-1 overflow-y-auto transition-all",
          collapsed ? "md:pl-[70px]" : "md:pl-64",
          "p-4 md:p-6"
        )}>
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 