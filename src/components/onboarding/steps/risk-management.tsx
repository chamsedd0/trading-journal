'use client';

import { useOnboarding } from "@/lib/onboarding-context";
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RiskPlanType } from "@/lib/onboarding-context";

export function RiskManagementStep() {
  const { state, updateTradingPlan } = useOnboarding();
  
  const handleRiskPercentageChange = (values: number[]) => {
    updateTradingPlan({
      riskManagement: {
        ...state.tradingPlan.riskManagement,
        riskPercentage: values[0]
      }
    });
  };
  
  const handleRiskRewardRatioChange = (values: number[]) => {
    updateTradingPlan({
      riskManagement: {
        ...state.tradingPlan.riskManagement,
        targetRiskRewardRatio: values[0]
      }
    });
  };
  
  const handleRiskHalvingChange = (checked: boolean) => {
    updateTradingPlan({
      riskManagement: {
        ...state.tradingPlan.riskManagement,
        reduceRiskAfterLoss: checked
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Risk Management Plan</h3>
        <p className="text-sm text-muted-foreground">
          Define your risk parameters to protect your capital and maintain consistency.
        </p>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Risk Per Trade</CardTitle>
          <CardDescription>
            Set the percentage of your account you're willing to risk on each trade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="pb-4">
            <Slider 
              defaultValue={[state.tradingPlan.riskManagement.riskPercentage]} 
              min={0.1} 
              max={5} 
              step={0.1}
              onValueChange={handleRiskPercentageChange}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {state.tradingPlan.riskManagement.riskPercentage}% of account
            </span>
            <span className="text-muted-foreground">
              {state.tradingPlan.riskManagement.riskPercentage < 1 
                ? "Conservative" 
                : state.tradingPlan.riskManagement.riskPercentage < 2
                ? "Moderate"
                : "Aggressive"}
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Risk to Reward Ratio</CardTitle>
          <CardDescription>
            The minimum reward you aim for relative to your risk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="pb-4">
            <Slider 
              defaultValue={[state.tradingPlan.riskManagement.targetRiskRewardRatio]} 
              min={1} 
              max={5} 
              step={0.5}
              onValueChange={handleRiskRewardRatioChange}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              1:{state.tradingPlan.riskManagement.targetRiskRewardRatio}
            </span>
            <span className="text-muted-foreground">
              {state.tradingPlan.riskManagement.targetRiskRewardRatio < 1.5 
                ? "Low" 
                : state.tradingPlan.riskManagement.targetRiskRewardRatio < 3
                ? "Standard"
                : "High"}
            </span>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center space-x-2 py-4">
        <Switch 
          id="risk-halving" 
          checked={state.tradingPlan.riskManagement.reduceRiskAfterLoss}
          onCheckedChange={handleRiskHalvingChange}
        />
        <Label htmlFor="risk-halving" className="font-medium">
          Reduce risk after a loss
        </Label>
      </div>
      
      <div className="bg-muted/50 rounded-md p-4 text-sm">
        <p className="font-medium mb-2">Risk Management Tips:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>Most professional traders risk 1% to 2% per trade</li>
          <li>A risk-to-reward ratio of at least 1:2 improves your probability of long-term profitability</li>
          <li>Reducing risk after losses can help protect your account during drawdown periods</li>
        </ul>
      </div>
    </div>
  );
} 