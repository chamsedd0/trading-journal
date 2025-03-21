'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ReactNode } from "react";

interface StepContainerProps {
  title: string;
  description: string;
  children: ReactNode;
  step: number;
  totalSteps: number;
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  isLastStep?: boolean;
  isDisabled?: boolean;
}

export function StepContainer({
  title,
  description,
  children,
  step,
  totalSteps,
  onNext,
  onBack,
  isSubmitting = false,
  submitLabel = "Next",
  isLastStep = false,
  isDisabled = false
}: StepContainerProps) {
  const { user } = useAuth();

  return (
    <Card className="w-full max-w-3xl shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <div className="flex items-center justify-center bg-primary/10 rounded-full h-10 w-10 text-primary font-medium text-sm">
            {step}/{totalSteps}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-secondary h-1 rounded-full mt-6">
          <div 
            className="bg-primary h-1 rounded-full transition-all duration-300" 
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 pb-6">
        {children}
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2">
        {onBack ? (
          <Button 
            variant="outline" 
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </Button>
        ) : (
          <div></div>
        )}
        
        <Button 
          onClick={onNext}
          disabled={isDisabled || isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isLastStep ? "Completing..." : "Saving..."}
            </span>
          ) : (
            submitLabel
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 