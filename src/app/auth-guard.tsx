'use client';

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Public routes that don't require authentication
    const publicRoutes = [
      '/',
      '/auth/login',
      '/auth/signup',
    ];

    const isPublicRoute = publicRoutes.includes(pathname);
    const isAuthRoute = pathname.startsWith('/auth/');
    const isOnboardingRoute = pathname === '/onboarding';
    const isDashboardRoute = pathname.startsWith('/dashboard');
    
    // Not authenticated
    if (!user) {
      if (!isPublicRoute && !isAuthRoute) {
        // Redirect to login if trying to access protected routes
        toast.error("Authentication required", {
          description: "Please sign in to access this page"
        });
        router.push('/auth/login');
      }
      return;
    }

    // User is authenticated
    if (isAuthRoute) {
      // Redirect authenticated users away from auth pages
      router.push(user.profile?.setupComplete ? '/dashboard' : '/onboarding');
      return;
    }

    // If user hasn't completed setup and trying to access dashboard
    if (!user.profile?.setupComplete && isDashboardRoute) {
      toast.error("Setup required", {
        description: "Please complete your account setup first"
      });
      router.push('/onboarding');
      return;
    }

    // If user has completed setup and trying to access onboarding
    if (user.profile?.setupComplete && isOnboardingRoute) {
      router.push('/dashboard');
      return;
    }
  }, [user, loading, pathname, router]);

  // Show a simple loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
} 