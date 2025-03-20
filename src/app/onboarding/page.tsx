'use client';

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-context";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { PersonalInfoStep } from "@/components/onboarding/steps/personal-info";
import { TradingAccountStep } from "@/components/onboarding/steps/trading-account";
import { TradingPlanStep } from "@/components/onboarding/steps/trading-plan";
import { EntryChecklistStep } from "@/components/onboarding/steps/entry-checklist";
import { RiskManagementStep } from "@/components/onboarding/steps/risk-management";
import { FinalReviewStep } from "@/components/onboarding/steps/final-review";

function OnboardingSteps() {
  const { state } = useOnboarding();

  const getCurrentStep = () => {
    switch (state.step) {
      case 1:
        return {
          title: "Personal Information",
          component: <PersonalInfoStep />,
        };
      case 2:
        return {
          title: "Trading Account Information",
          component: <TradingAccountStep />,
        };
      case 3:
        return {
          title: "Trading Plan Concepts",
          component: <TradingPlanStep />,
        };
      case 4:
        return {
          title: "Entry Checklist & Protocol",
          component: <EntryChecklistStep />,
        };
      case 5:
        return {
          title: "Risk Management Plan",
          component: <RiskManagementStep />,
        };
      case 6:
        return {
          title: "Final Review",
          component: <FinalReviewStep />,
        };
      default:
        throw new Error(`Invalid step: ${state.step}`);
    }
  };

  const currentStep = getCurrentStep();

  return (
    <OnboardingLayout title={currentStep.title}>
      {currentStep.component}
    </OnboardingLayout>
  );
}

// Use a simpler approach that won't cause redirection loops
export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Skip immediate redirects on first render
    if (loading) return;
    
    // Handle the not logged in case
    if (!user) {
      // Detect if we're in a loop - multiple redirects in a short time period
      const lastRedirectTime = Number(sessionStorage.getItem('last_redirect_time') || '0');
      const currentTime = new Date().getTime();
      
      // If last redirect was less than 2 seconds ago, we might be in a loop
      if (currentTime - lastRedirectTime < 2000) {
        console.log("Potential redirect loop detected - not redirecting");
        return;
      }
      
      // Store the time and redirect
      sessionStorage.setItem('last_redirect_time', currentTime.toString());
      router.push('/auth/login');
      return;
    }
    
    // Check if we need to see onboarding or redirect to dashboard
    if (user.profile?.setupComplete === true) {
      // User already completed setup - redirect to dashboard
      
      // Check if we're in a redirect loop
      const redirectCount = Number(sessionStorage.getItem('dashboard_redirect_count') || '0');
      if (redirectCount > 3) {
        console.log("Too many dashboard redirects, showing onboarding as fallback");
        setShouldShowOnboarding(true);
        return;
      }
      
      // Increment the redirect count
      sessionStorage.setItem('dashboard_redirect_count', (redirectCount + 1).toString());
      
      // Use direct navigation to avoid React router issues
      window.location.href = '/dashboard';
    } else {
      // Normal case - user needs to complete setup
      setShouldShowOnboarding(true);
    }
  }, [user, loading, router]);
  
  // Clear the tracking when component unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('dashboard_redirect_count');
    };
  }, []);
  
  // Show loading while we determine what to do
  if (loading || shouldShowOnboarding === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    );
  }
  
  // Only show onboarding if explicitly set to true
  if (shouldShowOnboarding) {
    return (
      <OnboardingProvider>
        <OnboardingSteps />
      </OnboardingProvider>
    );
  }
  
  // Fallback loading state while redirection happens
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <p>Redirecting...</p>
    </div>
  );
} 