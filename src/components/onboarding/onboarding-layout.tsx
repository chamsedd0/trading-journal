'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboarding } from "@/lib/onboarding-context";
import { ReactNode } from "react";

interface OnboardingLayoutProps {
  children: ReactNode;
  title: string;
  canProceed?: boolean;
  hideNavigation?: boolean;
}

export function OnboardingLayout({ 
  children, 
  title,
  canProceed = true,
  hideNavigation = false 
}: OnboardingLayoutProps) {
  const { state, setStep, isStepValid } = useOnboarding();
  
  const handleNext = () => {
    if (isStepValid(state.step)) {
      if (state.step < 6) {
        setStep(state.step + 1);
      } else if (state.step === 6) {
        // If we're on the final step, do nothing - FinalReviewStep handles submission
        // The Complete button in FinalReviewStep will handle saving and redirecting
      }
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      setStep(state.step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <div className="text-sm text-muted-foreground">
              Step {state.step} of 6
            </div>
          </div>
          <div className="w-full bg-secondary h-1 mt-4 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300 ease-in-out"
              style={{ width: `${(state.step / 6) * 100}%` }}
            />
          </div>
        </CardHeader>
        
        <CardContent>
          {children}
        </CardContent>

        {!hideNavigation && (
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={state.step === 1}
            >
              Back
            </Button>
            {state.step < 6 && (
              <Button
                onClick={handleNext}
                disabled={!canProceed || !isStepValid(state.step)}
              >
                Next
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 