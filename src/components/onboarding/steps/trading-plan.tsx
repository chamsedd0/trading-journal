'use client';

import { useOnboarding } from "@/lib/onboarding-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export function TradingPlanStep() {
  const { state } = useOnboarding();

  return (
    <div className="space-y-6">
      <Alert variant="default" className="bg-blue-50 text-blue-800 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-800" />
        <AlertTitle>This step is currently skippable</AlertTitle>
        <AlertDescription>
          You can define your trading plan concepts later. Click "Next" to continue with the onboarding process.
        </AlertDescription>
      </Alert>
      
      <div className="bg-secondary/30 p-4 rounded-lg">
        <p className="text-center text-muted-foreground">
          This section will allow you to define trading concepts like Order Blocks, FVGs, Liquidity, etc.
        </p>
      </div>
    </div>
  );
} 