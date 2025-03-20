'use client';

import { AuthProvider } from "@/lib/auth-context";
import { AuthGuard } from "@/app/auth-guard";
import { Toaster } from "@/components/ui/sonner-toast";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
      <Toaster />
    </>
  );
} 