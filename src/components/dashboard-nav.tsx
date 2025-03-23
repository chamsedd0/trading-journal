'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  LineChart, 
  BookOpen,
  Briefcase,
  UserCircle, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  Users
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavLink {
  title: string;
  href: string;
  icon: React.ReactNode;
}

export function DashboardNav({ collapsed, setCollapsed }: { 
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Hydration fix
  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks: NavLink[] = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />
    },
    {
      title: "Trades",
      href: "/dashboard/trades",
      icon: <LineChart className="h-4 w-4" />
    },
    {
      title: "Accounts",
      href: "/dashboard/accounts",
      icon: <Briefcase className="h-4 w-4" />
    },
    {
      title: "Journal",
      href: "/dashboard/journal",
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      title: "Traders",
      href: "/dashboard/traders",
      icon: <Users className="h-4 w-4" />
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: <Settings className="h-4 w-4" />
    }
  ];

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut(auth);
      // Redirect happens automatically due to auth context
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6 px-2">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <Home className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="font-semibold tracking-tight">Trading Journal</div>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "h-7 w-7 rounded-md",
            collapsed ? "mx-auto" : "ml-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <nav className={cn("grid gap-1", collapsed ? "px-2" : "px-1")}>
        <TooltipProvider>
          {navLinks.map((link) => (
            <Tooltip key={link.href} delayDuration={collapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-all",
                    collapsed ? "justify-center" : "",
                    (link.href === "/dashboard" ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`))
                      ? "bg-primary/10 text-primary dark:bg-primary/15"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  <div className={(link.href === "/dashboard" ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`)) ? "text-primary" : ""}>
                    {link.icon}
                  </div>
                  {!collapsed && (
                    <span className="truncate">{link.title}</span>
                  )}
                </Link>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="text-xs px-2 py-1">
                  {link.title}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      <div className="mt-5 pt-4 border-t border-border">
        <nav className={cn("grid gap-1", collapsed ? "px-2" : "px-1")}>
          <TooltipProvider>
            <Tooltip delayDuration={collapsed ? 100 : 1000}>
              <TooltipTrigger asChild>
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSignOut();
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-all",
                    collapsed ? "justify-center" : "",
                    "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  <div>
                    <LogOut className="h-4 w-4" />
                  </div>
                  {!collapsed && (
                    <span className="truncate">{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                  )}
                </Link>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="text-xs px-2 py-1">
                  {isSigningOut ? "Signing out..." : "Sign Out"}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </nav>
      </div>
    </div>
  );
} 