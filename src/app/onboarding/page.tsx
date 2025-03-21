'use client';

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { OnboardingProvider, useOnboarding } from "@/lib/onboarding-context";
import { OnboardingLayout } from "@/components/onboarding/onboarding-layout";
import { PersonalInfoStep } from "@/components/onboarding/steps/personal-info";
import { TradingPlanStep } from "@/components/onboarding/steps/trading-plan";
import { EntryChecklistStep } from "@/components/onboarding/steps/entry-checklist";
import { RiskManagementStep } from "@/components/onboarding/steps/risk-management";
import { FinalReviewStep } from "@/components/onboarding/steps/final-review";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { OnboardingSkeleton } from "@/components/skeletons/onboarding-skeleton";
import { LoginSkeleton } from "@/components/skeletons/login-skeleton";

function OnboardingSteps() {
  const { state } = useOnboarding();

  const getCurrentStep = () => {
    switch (state.step) {
      case 1:
        return {
          title: "Personal Information",
          description: "Tell us about yourself and your trading preferences.",
          component: <PersonalInfoStep />,
        };
      case 2:
        return {
          title: "Trading Plan Concepts",
          description: "Define the key concepts that guide your trading decisions.",
          component: <TradingPlanStep />,
        };
      case 3:
        return {
          title: "Entry Checklist & Protocol",
          description: "Create rules for when and why you enter trades.",
          component: <EntryChecklistStep />,
        };
      case 4:
        return {
          title: "Risk Management Plan",
          description: "Set up your risk management strategy to protect your capital.",
          component: <RiskManagementStep />,
        };
      case 5:
        return {
          title: "Final Review",
          description: "Review your trading profile and complete the setup.",
          component: <FinalReviewStep />,
        };
      default:
        throw new Error(`Invalid step: ${state.step}`);
    }
  };

  const currentStep = getCurrentStep();

  return (
    <OnboardingLayout 
      title={currentStep.title}
      description={currentStep.description}
    >
      {currentStep.component}
    </OnboardingLayout>
  );
}

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <LoginSkeleton />;
  }

  return (
    <div className="min-h-screen w-full">
      <OnboardingProvider>
        <OnboardingSteps />
      </OnboardingProvider>
    </div>
  );
} 