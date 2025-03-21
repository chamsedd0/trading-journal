'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboarding } from "@/lib/onboarding-context";
import { ReactNode } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

interface OnboardingLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  canProceed?: boolean;
  hideNavigation?: boolean;
}

export function OnboardingLayout({ 
  children, 
  title,
  description,
  canProceed = true,
  hideNavigation = false 
}: OnboardingLayoutProps) {
  const { state, setStep, isStepValid } = useOnboarding();
  
  const handleNext = () => {
    if (isStepValid(state.step)) {
      if (state.step < 5) {
        setStep(state.step + 1);
      } else if (state.step === 5) {
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

  const steps = [
    { number: 1, title: "Personal Information" },
    { number: 2, title: "Trading Plan" },
    { number: 3, title: "Entry Checklist" },
    { number: 4, title: "Risk Management" },
    { number: 5, title: "Final Review" },
  ];

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background p-4 sm:p-6 md:p-8">
      {/* Logo at the top */}
      <div className="flex justify-center mb-6">
        <div className="bg-primary/10 p-2 sm:p-3 rounded-xl">
          <span className="text-primary text-2xl sm:text-3xl font-bold">TJ</span>
        </div>
      </div>
      
      {/* Step indicators */}
      <div className="max-w-4xl mx-auto mb-12 hidden md:flex justify-between">
        {steps.map((step) => (
          <div 
            key={step.number}
            className="flex flex-col items-center"
          >
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all ${
                state.step === step.number 
                  ? 'bg-primary text-primary-foreground'
                  : state.step > step.number
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {state.step > step.number ? <CheckCircle2 className="w-5 h-5" /> : step.number}
            </div>
            <span className={`text-xs mt-2 ${state.step === step.number ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{step.title}</span>
          </div>
        ))}
      </div>

      {/* Mobile step indicator */}
      <div className="mb-8 md:hidden">
        <div className="text-center text-sm font-medium mb-4">
          Step {state.step} of 5: {steps.find(s => s.number === state.step)?.title}
        </div>
        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
          <div 
            className="bg-primary h-full transition-all duration-300 ease-in-out"
            style={{ width: `${(state.step / 5) * 100}%` }}
          />
        </div>
      </div>

      <Card className="w-full max-w-3xl mx-auto border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
        <CardHeader className="space-y-2 px-6 sm:px-8">
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">{title}</CardTitle>
          {description && (
            <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6 px-6 sm:px-8">
          {children}
        </CardContent>

        {!hideNavigation && (
          <CardFooter className="flex justify-between p-6 sm:p-8 border-t border-border/10">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={state.step === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            {state.step < 5 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed || !isStepValid(state.step)}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              // The final step has its own complete button in the FinalReviewStep component
              null
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 