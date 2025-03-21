'use client';

import { useOnboarding } from "@/lib/onboarding-context";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

export function TradingPlanStep() {
  const { state, updateTradingPlan } = useOnboarding();
  const [newConcept, setNewConcept] = useState("");

  const handleAddConcept = () => {
    if (!newConcept.trim()) return;
    
    const concepts = [...(state.tradingPlan.concepts || []), newConcept.trim()];
    updateTradingPlan({ concepts });
    setNewConcept("");
  };

  const handleRemoveConcept = (index: number) => {
    const concepts = [...(state.tradingPlan.concepts || [])];
    concepts.splice(index, 1);
    updateTradingPlan({ concepts });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddConcept();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Trading Concepts</h3>
        <p className="text-sm text-muted-foreground">
          Add the trading concepts you use in your strategy (e.g., "62% Fib Level", "Fair Value Gap", "Order Block").
        </p>
      </div>
      
      <div className="flex gap-2">
        <Input
          placeholder="Add a trading concept..."
          value={newConcept}
          onChange={(e) => setNewConcept(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button 
          onClick={handleAddConcept}
          type="button"
          variant="outline"
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {state.tradingPlan.concepts && state.tradingPlan.concepts.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-4 bg-secondary/20 rounded-md">
          {state.tradingPlan.concepts.map((concept, index) => (
            <Badge 
              key={index} 
              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1"
            >
              {concept}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => handleRemoveConcept(index)}
              />
            </Badge>
          ))}
        </div>
      ) : (
        <div className="p-4 text-center text-sm text-muted-foreground bg-secondary/20 rounded-md">
          No concepts added yet. Add some concepts to improve your trading plan.
        </div>
      )}
      
      <div className="pt-2 text-sm text-muted-foreground">
        <p>Examples of trading concepts:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Fibonacci Retracement (62%, 78.6%)</li>
          <li>Fair Value Gap (FVG)</li>
          <li>Order Blocks</li>
          <li>Supply and Demand Zones</li>
          <li>Liquidity Sweeps</li>
        </ul>
      </div>
    </div>
  );
} 