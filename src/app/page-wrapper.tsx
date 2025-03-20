'use client';

// No need for this component anymore as the Providers are now in the root layout
export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return children;
} 