'use client';

import { useOnboarding } from "@/lib/onboarding-context";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, X, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function EntryChecklistStep() {
  const { state, updateTradingPlan } = useOnboarding();
  const [newRule, setNewRule] = useState("");

  const handleAddRule = () => {
    if (!newRule.trim()) return;
    
    const entryRules = [...(state.tradingPlan.entryRules || []), newRule.trim()];
    updateTradingPlan({ entryRules });
    setNewRule("");
  };

  const handleRemoveRule = (index: number) => {
    const entryRules = [...(state.tradingPlan.entryRules || [])];
    entryRules.splice(index, 1);
    updateTradingPlan({ entryRules });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRule();
    }
  };

  const handleUseConceptAsRule = (concept: string) => {
    setNewRule(prev => prev ? `${prev} + ${concept}` : concept);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Entry Rules</h3>
        <p className="text-sm text-muted-foreground">
          Define the rules that must be met before you enter a trade. You can use your trading concepts as building blocks.
        </p>
      </div>
      
      {state.tradingPlan.concepts && state.tradingPlan.concepts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Your Trading Concepts:</p>
          <div className="flex flex-wrap gap-2">
            {state.tradingPlan.concepts.map((concept, index) => (
              <Badge 
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary/5"
                onClick={() => handleUseConceptAsRule(concept)}
              >
                {concept} <ArrowRight className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex gap-2">
        <Input
          placeholder="Add an entry rule..."
          value={newRule}
          onChange={(e) => setNewRule(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button 
          onClick={handleAddRule}
          type="button"
          variant="outline"
          size="icon"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm font-medium">Your Entry Checklist:</p>
        {state.tradingPlan.entryRules && state.tradingPlan.entryRules.length > 0 ? (
          <div className="space-y-2 p-4 bg-secondary/20 rounded-md">
            {state.tradingPlan.entryRules.map((rule, index) => (
              <div key={index} className="flex items-center gap-3">
                <Checkbox id={`rule-${index}`} />
                <Label htmlFor={`rule-${index}`} className="flex-1">{rule}</Label>
                <X 
                  className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive" 
                  onClick={() => handleRemoveRule(index)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground bg-secondary/20 rounded-md">
            No entry rules added yet. Add some rules to create your trading checklist.
          </div>
        )}
      </div>
      
      <div className="pt-2 text-sm text-muted-foreground">
        <p>Example entry rules:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Price is at a key support/resistance level</li>
          <li>At least 2 confluences from my trading concepts</li>
          <li>Trade is in the direction of the higher timeframe trend</li>
          <li>Risk to reward ratio is at least 1:2</li>
        </ul>
      </div>
    </div>
  );
} 