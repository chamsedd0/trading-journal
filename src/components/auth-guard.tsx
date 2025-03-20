'use client';

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireSetup?: boolean;
}

export default function AuthGuard({ 
  children, 
  requireAuth = true,
  requireSetup = true
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (requireAuth && !user) {
        // If authentication is required but user is not logged in
        router.push('/auth/login');
      } else if (requireAuth && user && requireSetup && user.profile?.setupComplete === false) {
        // If authentication and setup are required but setup is not complete
        router.push('/onboarding');
      }
    }
  }, [user, loading, requireAuth, requireSetup, router]);

  // Show nothing while loading or redirecting
  if (loading || (requireAuth && !user) || (requireAuth && user && requireSetup && user.profile?.setupComplete === false)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  // Show children if all conditions are met
  return <>{children}</>;
} 