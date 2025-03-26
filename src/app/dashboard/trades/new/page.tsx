'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckIcon, PlusIcon, TrendingUpIcon, TrendingDownIcon, Clock, Loader2, XIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Interface for trade visualizer component
interface TradeVisualizerProps {
  tradeData: {
    symbol: string;
    type: string;
    entry: string;
    exit: string;
    exitTime: string;
    tp: string;
    sl: string;
    size: string;
    pnl: string;
    date: string;
    time: string;
    marketType: string;
    tickValue: string;
    pipValue: string;
    commission: string;
  };
  isComplete: boolean;
}

// Interface for trading plan
interface TradingPlan {
  concepts: string[];
  entryRules: string[];
  riskManagement: {
    planType: string;
    riskPercentage: number;
    reduceRiskAfterLoss: boolean;
    targetRiskRewardRatio: number;
    customRules?: string[];
  };
}

// Interface for trade evaluation
interface TradeEvaluationProps {
  tradingPlan: TradingPlan | null;
  selectedRules: string[];
  onSelectRule: (rule: string) => void;
  riskRewardRatio: string | null;
  targetRatio: number | null;
  isComplete: boolean;
  tradeData: {
    entry: string;
    sl: string;
    size: string;
    type: string;
    marketType: string;
    tickValue: string;
    pipValue: string;
    symbol: string;
  };
  account?: Account | null;
}

// Trade evaluator component
function TradeEvaluation({ 
  tradingPlan, 
  selectedRules, 
  onSelectRule, 
  riskRewardRatio, 
  targetRatio,
  isComplete,
  tradeData,
  account
}: TradeEvaluationProps) {
  const hasRules = tradingPlan && ((tradingPlan.entryRules && tradingPlan.entryRules.length > 0) || 
                                  (tradingPlan.concepts && tradingPlan.concepts.length > 0));
  
  // Calculate risk percentage based on stop loss
  const riskPercentage = useMemo(() => {
    if (!tradeData.entry || !tradeData.sl || !tradeData.size || !account?.balance) return null;
    
    const entry = parseFloat(tradeData.entry);
    const sl = parseFloat(tradeData.sl);
    const size = parseFloat(tradeData.size);
    
    if (isNaN(entry) || isNaN(sl) || isNaN(size) || sl === 0) return null;
    
    // Calculate potential loss amount
    const isLong = tradeData.type === 'long';
    const pointsRisked = isLong ? Math.abs(entry - sl) : Math.abs(sl - entry);
    
    // Calculate dollar risk based on market type
    let dollarRisk = 0;
    
    if (tradeData.marketType === 'futures' || tradeData.marketType === 'stocks') {
      // For futures and stocks, use tick value
      const tickValue = parseFloat(tradeData.tickValue);
      if (isNaN(tickValue)) return null;
      
      dollarRisk = pointsRisked * tickValue * size;
    } 
    else if (tradeData.marketType === 'forex' || tradeData.marketType === 'crypto') {
      // For forex and crypto, use pip value
      const pipValue = parseFloat(tradeData.pipValue);
      if (isNaN(pipValue)) return null;
      
      // Determine pip size based on whether it's a JPY pair
      const isPipDecimal = !tradeData.symbol.includes('JPY');
      const pipSize = isPipDecimal ? 0.0001 : 0.01;
      const pips = pointsRisked / pipSize;
      
      dollarRisk = pips * pipValue * size;
    } 
    else {
      // For other market types, direct calculation
      dollarRisk = pointsRisked * size;
    }
    
    // Calculate risk as percentage of account balance
    return (dollarRisk / account.balance) * 100;
  }, [
    tradeData.entry,
    tradeData.sl,
    tradeData.size,
    tradeData.type,
    tradeData.marketType,
    tradeData.tickValue,
    tradeData.pipValue,
    tradeData.symbol,
    account?.balance
  ]);
  
  // Check if risk exceeds tolerance
  const riskToleranceExceeded = useMemo(() => {
    if (!riskPercentage || !tradingPlan?.riskManagement?.riskPercentage) return false;
    return riskPercentage > tradingPlan.riskManagement.riskPercentage;
  }, [
    riskPercentage, 
    tradingPlan?.riskManagement?.riskPercentage
  ]);
  
  if (!tradingPlan) {
    return (
      <div className="border rounded-lg p-5 bg-card h-full">
        <div className="text-lg font-semibold mb-4">Trading Plan Evaluation</div>
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <PlusIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">No trading plan found</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create a trading plan in the Journal section to evaluate your trades
          </p>
          <Link href="/dashboard/journal">
            <Button variant="outline" size="sm">Go to Journal</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Calculate if the current trade meets risk-reward target
  const meetsRiskReward = riskRewardRatio && targetRatio ? 
    parseFloat(riskRewardRatio) >= targetRatio : 
    false;

  return (
    <div className="border rounded-lg p-5 bg-card h-full">
      <div className="text-lg font-semibold mb-4">Trading Plan Evaluation</div>
      
      {!isComplete ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Fill in trade details to evaluate against your trading plan
          </p>
        </div>
      ) : !hasRules ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <PlusIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">Your trading plan has no rules yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Add trading concepts and entry rules to your plan
          </p>
          <Link href="/dashboard/journal">
            <Button variant="outline" size="sm">Update Plan</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4 h-full overflow-y-auto">
          {/* Risk-Reward Evaluation */}
          <div className="mb-4 p-4 border rounded-md">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Risk:Reward Target</span>
              <span className={`text-sm font-semibold ${meetsRiskReward ? 'text-[#089981]' : 'text-muted-foreground'}`}>
                1:{tradingPlan.riskManagement.targetRiskRewardRatio}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">This Trade</span>
              <span className={`text-sm font-semibold ${meetsRiskReward ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                {riskRewardRatio ? `1:${riskRewardRatio}` : 'N/A'}
              </span>
            </div>
            
            {riskRewardRatio && (
              <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                {meetsRiskReward ? (
                  <div className="flex items-center text-[#089981]">
                    <CheckIcon className="h-4 w-4 mr-1" />
                    <span>Meets target risk:reward ratio</span>
                  </div>
                ) : (
                  <div className="flex items-center text-[#f23645]">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Below target risk:reward ratio</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Risk Management Evaluation */}
          {tradingPlan.riskManagement && tradingPlan.riskManagement.riskPercentage > 0 && (
            <div className="mb-4 p-4 border rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Risk Tolerance</span>
                <span className="text-sm font-semibold">
                  {tradingPlan.riskManagement.riskPercentage}% per trade
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Current Risk</span>
                <span className={`text-sm font-semibold ${!riskToleranceExceeded ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  {riskPercentage ? `${riskPercentage.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
              
              {riskPercentage && (
                <div className="mt-2 pt-2 border-t text-sm text-muted-foreground">
                  {!riskToleranceExceeded ? (
                    <div className="flex items-center text-[#089981]">
                      <CheckIcon className="h-4 w-4 mr-1" />
                      <span>Within risk tolerance limits</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-[#f23645]">
                      <XIcon className="h-4 w-4 mr-1" />
                      <span>Exceeds risk tolerance of {tradingPlan.riskManagement.riskPercentage}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Trading Concepts */}
          {tradingPlan.concepts && tradingPlan.concepts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Trading Concepts Used</h4>
              <div className="space-y-2">
                {tradingPlan.concepts.map((concept, index) => (
                  <div 
                    key={`concept-${index}`}
                    className={`p-3 rounded-md border flex items-center gap-2 cursor-pointer ${
                      selectedRules.includes(concept) ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onSelectRule(concept)}
                  >
                    <div className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                      selectedRules.includes(concept) ? 'bg-primary border-primary' : 'border-input'
                    }`}>
                      {selectedRules.includes(concept) && <CheckIcon className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm">{concept}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Entry Rules */}
          {tradingPlan.entryRules && tradingPlan.entryRules.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Entry Rules Followed</h4>
              <div className="space-y-2">
                {tradingPlan.entryRules.map((rule, index) => (
                  <div 
                    key={`rule-${index}`}
                    className={`p-3 rounded-md border flex items-center gap-2 cursor-pointer ${
                      selectedRules.includes(rule) ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onSelectRule(rule)}
                  >
                    <div className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                      selectedRules.includes(rule) ? 'bg-primary border-primary' : 'border-input'
                    }`}>
                      {selectedRules.includes(rule) && <CheckIcon className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm">{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Interface for candle data
interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  time: number;
  color: string;
}

function TradeVisualizer({ tradeData, isComplete }: TradeVisualizerProps) {
  const entry = parseFloat(tradeData.entry);
  const exit = parseFloat(tradeData.exit);
  const tp = parseFloat(tradeData.tp);
  const sl = parseFloat(tradeData.sl);
  const isLong = tradeData.type === 'long';
  const isProfitable = parseFloat(tradeData.pnl) > 0;
  const isValidTrade = !isNaN(entry) && !isNaN(exit) && tradeData.symbol;
  const hasTP = !isNaN(tp) && tp > 0;
  const hasSL = !isNaN(sl) && sl > 0;
  
  // Calculate risk-reward ratio if SL is provided
  const riskRewardRatio = useMemo(() => {
    if (!hasSL) return null;
    
    let reward: number, risk: number;
    
    if (isLong) {
      reward = Math.abs(exit - entry);
      risk = Math.abs(entry - sl);
    } else {
      reward = Math.abs(entry - exit);
      risk = Math.abs(sl - entry);
    }
    
    if (risk === 0) return null; // Avoid division by zero
    
    return (reward / risk).toFixed(2);
  }, [
    entry,
    exit,
    sl,
    hasSL,
    isLong
  ]);

  // Calculate price range for chart visualization
  const priceRange = useMemo(() => {
    if (!isValidTrade) return { min: 0, max: 100, range: 100 };
    
    // Find the min and max considering all price points (entry, exit, tp, sl)
    const prices = [entry, exit];
    if (hasTP) prices.push(tp);
    if (hasSL) prices.push(sl);
    
    const minPrice = Math.min(...prices) * 0.995; // 0.5% lower than the lowest price
    const maxPrice = Math.max(...prices) * 1.005; // 0.5% higher than the highest price
    
    return {
      min: minPrice,
      max: maxPrice,
      range: maxPrice - minPrice
    };
  }, [
    entry, 
    exit, 
    tp, 
    sl, 
    hasTP, 
    hasSL, 
    isValidTrade
  ]);

  // Calculate position of price points in the chart (percentage of height)
  const entryPosition = isValidTrade 
    ? 100 - ((entry - priceRange.min) / priceRange.range * 100)
    : 50;
  
  const exitPosition = isValidTrade 
    ? 100 - ((exit - priceRange.min) / priceRange.range * 100)
    : 30;
    
  const tpPosition = hasTP
    ? 100 - ((tp - priceRange.min) / priceRange.range * 100)
    : null;
    
  const slPosition = hasSL
    ? 100 - ((sl - priceRange.min) / priceRange.range * 100)
    : null;
  
  // Calculate grid step size (we'll create 5 horizontal steps)
  const priceStep = priceRange.range / 5;
  
  // Generate step line positions
  const horizontalSteps = useMemo(() => {
    return Array.from({length: 6}, (_, i) => {
      const price = priceRange.min + (priceStep * i);
      const position = 100 - (i * 20); // 5 steps = 20% each
      return { price, position };
    });
  }, [
    priceRange.min, 
    priceStep
  ]);

  // Generate candlestick data for visualization
  // Simple direct function instead of useMemo to fix rendering issues
  const generateCandles = () => {
    if (!isValidTrade) return [];
    
    // Increased number of candles for better visualization of market movement
    const numCandles = 12;
    const candles = [];
    
    // Create a more nuanced path from entry to exit price
    const priceDiff = exit - entry;
    const isBullishTrend = exit > entry;
    
    // Fair value parameters
    const fairValuePercent = 0.4; // Position of fair value between entry and exit (0.4 = 40% from entry)
    const fairValue = entry + (priceDiff * fairValuePercent);
    
    // Volatility parameters - higher for more realistic movements
    const volatilityBase = priceRange.range * 0.015; // Base volatility as percentage of price range
    
    // Market movement simulation:
    // 1. Initial move (momentum in direction of trade)
    // 2. First retracement to fair value
    // 3. Second expansion (stronger move)
    // 4. Final movement to exit
    
    // Define phase lengths (in candles)
    const phase1Length = Math.floor(numCandles * 0.25); // Initial expansion
    const phase2Length = Math.floor(numCandles * 0.3); // Retracement
    const phase3Length = Math.floor(numCandles * 0.3); // Second expansion
    const phase4Length = numCandles - phase1Length - phase2Length - phase3Length; // Final move to exit
    
    // Calculate target prices for each phase
    // Phase 1: Initial move (30% of total move)
    const phase1Target = entry + (priceDiff * 0.3);
    
    // Phase 2: Retracement (back to 50-60% of the move)
    const phase2Target = entry + (priceDiff * (isBullishTrend ? 0.15 : 0.6));
    
    // Phase 3: Second expansion (80% of the move)
    const phase3Target = entry + (priceDiff * 0.8);
    
    // Phase 4: Final move to exit price
    const phase4Target = exit;
    
    // Generate candles for each phase
    let currentPrice = entry;
    let currentPhase = 1;
    let phaseProgress = 0;
    let phaseLength = phase1Length;
    let phaseTarget = phase1Target;
    let prevTarget = entry;
    
    for (let i = 0; i < numCandles; i++) {
      const isFirstCandle = i === 0;
      const isLastCandle = i === numCandles - 1;
      
      // Determine current phase and targets
      if (i >= phase1Length && currentPhase === 1) {
        currentPhase = 2;
        phaseProgress = 0;
        phaseLength = phase2Length;
        prevTarget = phase1Target;
        phaseTarget = phase2Target;
      } else if (i >= phase1Length + phase2Length && currentPhase === 2) {
        currentPhase = 3;
        phaseProgress = 0;
        phaseLength = phase3Length;
        prevTarget = phase2Target;
        phaseTarget = phase3Target;
      } else if (i >= phase1Length + phase2Length + phase3Length && currentPhase === 3) {
        currentPhase = 4;
        phaseProgress = 0;
        phaseLength = phase4Length;
        prevTarget = phase3Target;
        phaseTarget = phase4Target;
      }
      
      // Update phase progress
      phaseProgress++;
      
      // Calculate progress within current phase (0 to 1)
      const progressInPhase = phaseProgress / phaseLength;
      
      // For first candle, open is always entry price
      const open: number = isFirstCandle ? entry : candles[i-1].close;
      
      // Expected price based on phase progression with easing function
      // Using easeInOutCubic for more natural price movement
      const easeInOutCubic = (t: number) => {
        return t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
      };
      
      const easedProgress = easeInOutCubic(progressInPhase);
      const expectedMove = prevTarget + ((phaseTarget - prevTarget) * easedProgress);
      
      // Add randomness based on the phase
      // More volatile during expansion phases, less during retracements
      let volatilityMultiplier = 1.0;
      if (currentPhase === 1) volatilityMultiplier = 1.2; // Initial momentum
      if (currentPhase === 2) volatilityMultiplier = 0.7; // Retracement (less volatile)
      if (currentPhase === 3) volatilityMultiplier = 1.5; // Second expansion (more volatile)
      if (currentPhase === 4) volatilityMultiplier = 0.8; // Final move (more controlled)
      
      // More randomness in the middle of each phase
      const phasePositionFactor = Math.sin(progressInPhase * Math.PI);
      const appliedVolatility = volatilityBase * volatilityMultiplier * phasePositionFactor;
      
      // Generate random component for this candle
      const randomFactor = (!isFirstCandle && !isLastCandle) 
        ? (Math.random() * 2 - 1) * appliedVolatility 
        : 0;
      
      // Calculate close price
      let close = isLastCandle ? exit : expectedMove + randomFactor;
      
      // Enforce constraints: make sure candles don't cross TP or SL before exit
      if (!isLastCandle && hasTP) {
        // For long trades, price shouldn't go above TP
        if (isLong && close > tp) {
          close = tp * 0.995; // Stay 0.5% below TP
        }
        // For short trades, price shouldn't go below TP
        else if (!isLong && close < tp) {
          close = tp * 1.005; // Stay 0.5% above TP
        }
      }
      
      if (!isLastCandle && hasSL) {
        // For long trades, price shouldn't go below SL
        if (isLong && close < sl) {
          close = sl * 1.005; // Stay 0.5% above SL
        }
        // For short trades, price shouldn't go above SL
        else if (!isLong && close > sl) {
          close = sl * 0.995; // Stay 0.5% below SL
        }
      }
      
      // Determine candle type and adjust volatility accordingly
      const isBullish = close >= open;
      
      // Generate high and low with realistic wick sizes
      // More exaggerated wicks in the direction of the overall trend
      const wickSizeMultiplier = isBullishTrend === isBullish ? 1.2 : 0.8;
      
      // Larger wicks during expansion phases (phases 1 and 3)
      const phaseWickMultiplier = 
        (currentPhase === 1 || currentPhase === 3) ? 1.3 : 0.9;
      
      // Calculate wick sizes
      const wickSizeBase = volatilityBase * wickSizeMultiplier * phaseWickMultiplier;
      const upWickSize = (isBullish ? 1.3 : 0.8) * wickSizeBase * (Math.random() + 0.5);
      const downWickSize = (!isBullish ? 1.3 : 0.8) * wickSizeBase * (Math.random() + 0.5);
      
      // Apply wick sizes
      let high = Math.max(open, close) + upWickSize;
      let low = Math.min(open, close) - downWickSize;
      
      // Apply the same constraints to high and low
      if (!isLastCandle && hasTP) {
        if (isLong && high > tp) {
          high = tp * 0.998; // Stay below TP
        } else if (!isLong && low < tp) {
          low = tp * 1.002; // Stay above TP
        }
      }
      
      if (!isLastCandle && hasSL) {
        if (isLong && low < sl) {
          low = sl * 1.002; // Stay above SL
        } else if (!isLong && high > sl) {
          high = sl * 0.998; // Stay below SL
        }
      }
      
      // Set the color based on close vs open
      const color = close >= open ? '#089981' : '#f23645';
      
      candles.push({
        open,
        high,
        low,
        close,
        time: i,
        color
      });
    }
    
    return candles;
  };

  // Calculate position of a price on the chart
  const calculatePricePosition = (price: number) => {
    if (!isValidTrade || isNaN(price)) return 50;
    return 100 - ((price - priceRange.min) / priceRange.range * 100);
  };

  return (
    <div className="border rounded-lg h-full bg-card/50 p-5 flex flex-col min-h-[500px]">
      <div className="text-lg font-semibold mb-2">Trade Preview</div>
      
      {!isComplete ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-3 opacity-80">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">
            Fill in trade details to see visualization
          </p>
        </div>
      ) : !isValidTrade ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            Enter valid price and symbol information
          </p>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Trade header info */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isLong ? 'bg-[#089981]/20' : 'bg-[#f23645]/20'}`}>
                {isLong 
                  ? <TrendingUpIcon className="h-4 w-4 text-[#089981]" /> 
                  : <TrendingDownIcon className="h-4 w-4 text-[#f23645]" />
                }
              </div>
              <div>
                <div className="flex items-center">
                  <span className="font-bold">{tradeData.symbol}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${isLong ? 'bg-[#089981]/10 text-[#089981]' : 'bg-[#f23645]/10 text-[#f23645]'}`}>
                    {isLong ? 'LONG' : 'SHORT'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {tradeData.date} {tradeData.time}
                </div>
              </div>
            </div>
            <div className={`text-base font-semibold ${hasTP && hasSL ? 'text-primary' : 'text-muted-foreground'}`}>
              {hasTP && hasSL ? (
                <span className={`${parseFloat(riskRewardRatio!) >= 1 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  1:{parseFloat(riskRewardRatio!).toFixed(1).endsWith('.0') ? parseFloat(riskRewardRatio!).toFixed(0) : parseFloat(riskRewardRatio!).toFixed(1)}
                </span>
              ) : (
                <>Set TP/SL for R:R</>
              )}
            </div>
          </div>
          
          {/* Chart visualization */}
          <div className="flex-1 relative bg-muted/30 rounded-lg p-4 border mb-4 min-h-[350px]">
            <div className="h-full w-full relative min-h-[350px]">
              {/* Grid lines - horizontal */}
              {horizontalSteps.map((step, index) => (
                <div 
                  key={`h-line-${index}`}
                  className="absolute left-0 right-0 border-t border-muted-foreground/20"
                  style={{ top: `${step.position}%` }}
                />
              ))}
              
              {/* Grid lines - vertical (time-based, just visual for now) */}
              <div className="absolute top-0 bottom-0 border-l border-gray-500/50" style={{ left: '25%' }} />
              <div className="absolute top-0 bottom-0 border-l border-gray-500/50" style={{ left: '50%' }} />
              <div className="absolute top-0 bottom-0 border-l border-gray-500/50" style={{ left: '75%' }} />
              
              {/* Price axis */}
              <div className="absolute top-0 right-0 bottom-0 w-16 flex flex-col justify-between text-[10px] text-gray-400">
                {horizontalSteps.map((step, index) => (
                  <div 
                    key={`price-${index}`}
                    style={{ top: `${step.position}%` }}
                    className="absolute right-0 transform -translate-y-1/2"
                  >
                    ${step.price.toFixed(2)}
                  </div>
                ))}
              </div>
              
              {/* Trade visualization area */}
              <div className="absolute top-0 left-0 right-16 bottom-0">
                {/* Profit/Loss Rectangle Areas */}
                {isLong ? (
                  <>
                    {/* For long trades: green between entry and TP */}
                    {hasTP && (
                      <div 
                        className="absolute left-0 right-0 bg-[#089981]/10 border-y border-[#089981]/30"
                        style={{ 
                          top: `${Math.min(entryPosition, tpPosition!)}%`,
                          height: `${Math.abs(entryPosition - tpPosition!)}%`
                        }}
                      ></div>
                    )}
                    {/* Red between entry and SL */}
                    {hasSL && (
                      <div 
                        className="absolute left-0 right-0 bg-[#f23645]/10 border-y border-[#f23645]/30"
                        style={{ 
                          top: `${Math.min(entryPosition, slPosition!)}%`,
                          height: `${Math.abs(entryPosition - slPosition!)}%`
                        }}
                      ></div>
                    )}
                  </>
                ) : (
                  <>
                    {/* For short trades: green between entry and TP */}
                    {hasTP && (
                      <div 
                        className="absolute left-0 right-0 bg-[#089981]/10 border-y border-[#089981]/30"
                        style={{ 
                          top: `${Math.min(entryPosition, tpPosition!)}%`,
                          height: `${Math.abs(entryPosition - tpPosition!)}%`
                        }}
                      ></div>
                    )}
                    {/* Red between entry and SL */}
                    {hasSL && (
                      <div 
                        className="absolute left-0 right-0 bg-[#f23645]/10 border-y border-[#f23645]/30"
                        style={{ 
                          top: `${Math.min(entryPosition, slPosition!)}%`,
                          height: `${Math.abs(entryPosition - slPosition!)}%`
                        }}
                      ></div>
                    )}
                  </>
                )}
                
                {/* Candlesticks */}
                <div className="absolute top-0 bottom-0 left-0 right-0 overflow-hidden" style={{ padding: '0 5%', minHeight: '300px' }}>
                  {generateCandles().map((candle, index) => {
                    // Calculate positions
                    const candleWidth = 100 / generateCandles().length;
                    const left = (index * candleWidth) + '%';
                    const candleWidthStyle = (candleWidth * 0.7) + '%';
                    
                    const openPos = calculatePricePosition(candle.open);
                    const closePos = calculatePricePosition(candle.close);
                    const highPos = calculatePricePosition(candle.high);
                    const lowPos = calculatePricePosition(candle.low);
                    
                    const candleHeight = Math.abs(closePos - openPos);
                    const candleTop = Math.min(closePos, openPos);
                    
                    // Calculate wick heights
                    const upperWickHeight = candleTop - highPos;
                    const lowerWickHeight = lowPos - (candleTop + candleHeight);
                    
                    return (
                      <div key={`candle-${index}`} className="absolute h-full" style={{ left, width: candleWidthStyle }}>
                        {/* Candle body */}
                        <div 
                          className="absolute w-full"
                          style={{ 
                            top: `${candleTop}%`,
                            height: `${Math.max(candleHeight, 0.5)}%`,
                            backgroundColor: candle.color,
                          }}
                        ></div>
                        
                        {/* Candle wicks */}
                        <div
                          className="absolute"
                          style={{
                            top: `${highPos}%`,
                            height: `${upperWickHeight}%`,
                            width: '1px',
                            left: '50%',
                            backgroundColor: candle.color
                          }}
                        ></div>
                        <div
                          className="absolute"
                          style={{
                            top: `${candleTop + candleHeight}%`,
                            height: `${lowerWickHeight}%`,
                            width: '1px',
                            left: '50%',
                            backgroundColor: candle.color
                          }}
                        ></div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Entry price line */}
                <div 
                  className="absolute left-0 right-0 border-dashed border-t border-green-500 z-10"
                  style={{ top: `${entryPosition}%` }}
                >
                  <div className="absolute -top-5 left-1 bg-green-500/20 px-2 py-0.5 rounded-sm text-[11px] text-white/90 border border-green-500/30">
                    Entry: ${entry.toFixed(2)}
                  </div>
                </div>
                
                {/* Exit price line */}
                <div 
                  className="absolute left-0 right-0 border-solid border-t border-white/40 z-10"
                  style={{ top: `${exitPosition}%` }}
                >
                  <div className="absolute -top-5 left-1 bg-[#131722]/90 px-2 py-0.5 rounded-sm text-[11px] text-white/90 border border-white/20">
                    Exit: ${exit.toFixed(2)}
                  </div>
                </div>
                
                {/* TP line if exists and is not the same as exit */}
                {hasTP && tp !== exit && (
                  <div 
                    className="absolute left-0 right-0 border-dashed border-t border-[#089981] z-10"
                    style={{ top: `${tpPosition}%` }}
                  >
                    <div className="absolute -top-5 left-1 bg-[#089981]/20 px-2 py-0.5 rounded-sm text-[11px] text-white/90 border border-[#089981]/40">
                      TP: ${tp.toFixed(2)}
                    </div>
                  </div>
                )}
                
                {/* SL line if exists and is not the same as exit */}
                {hasSL && sl !== exit && (
                  <div 
                    className="absolute left-0 right-0 border-dashed border-t border-[#f23645] z-10"
                    style={{ top: `${slPosition}%` }}
                  >
                    <div className="absolute -top-5 left-1 bg-[#f23645]/20 px-2 py-0.5 rounded-sm text-[11px] text-white/90 border border-[#f23645]/40">
                      SL: ${sl.toFixed(2)}
                    </div>
                  </div>
                )}
                
                {/* Time markers at bottom */}
                <div className="absolute bottom-0 left-0 right-0 text-[10px] text-gray-400 font-mono flex justify-between px-2">
                  <div className="text-green-500/80">{tradeData.time}</div>
                  <div className="text-center">5m timeframe</div>
                  <div className="text-red-500/80">{tradeData.exitTime}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Account {
  id: string;
  broker: string;
  accountType: string;
  type: 'real' | 'demo' | 'prop';
  balance: number;
}

export default function NewTradePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("details");
  const [tradeData, setTradeData] = useState({
    symbol: '',
    date: new Date().toISOString().slice(0, 10), // Today's date in YYYY-MM-DD format
    time: new Date().toTimeString().slice(0, 8), // Current time in HH:MM:SS format
    type: 'long',
    marketType: 'futures', // Default market type
    entry: '',
    exit: '',
    exitTime: new Date().toTimeString().slice(0, 8), // Time of exit
    tp: '', // Take Profit
    sl: '', // Stop Loss
    size: '',
    tickValue: '5', // Default $5 per tick for futures
    pipValue: '10', // Default $10 per pip for forex
    commission: '2.5', // Default commission per contract/lot
    pnl: '',
    notes: '',
    tags: []
  });
  const [tradingPlan, setTradingPlan] = useState<TradingPlan | null>(null);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Check if the trade data is complete enough to show a visualization
  const isTradeComplete = useMemo(() => {
    return Boolean(
      tradeData.symbol && 
      tradeData.entry && 
      tradeData.exit && 
      tradeData.size &&
      !isNaN(parseFloat(tradeData.entry)) && 
      !isNaN(parseFloat(tradeData.exit))
    );
  }, [
    tradeData.symbol, 
    tradeData.entry, 
    tradeData.exit, 
    tradeData.size
  ]);

  // Calculate risk-reward ratio
  const riskRewardRatio = useMemo(() => {
    if (!tradeData.sl || !tradeData.entry || !tradeData.exit) return null;
    
    const entry = parseFloat(tradeData.entry);
    const exit = parseFloat(tradeData.exit);
    const sl = parseFloat(tradeData.sl);
    const isLong = tradeData.type === 'long';
    
    if (isNaN(entry) || isNaN(exit) || isNaN(sl)) return null;
    
    let reward: number, risk: number;
    
    if (isLong) {
      reward = Math.abs(exit - entry);
      risk = Math.abs(entry - sl);
    } else {
      reward = Math.abs(entry - exit);
      risk = Math.abs(sl - entry);
    }
    
    if (risk === 0) return null; // Avoid division by zero
    
    return (reward / risk).toFixed(2);
  }, [
    tradeData.entry,
    tradeData.exit,
    tradeData.sl,
    tradeData.type
  ]);

  // Toggle rule selection
  const toggleRuleSelection = (rule: string) => {
    setSelectedRules(prev => {
      if (prev.includes(rule)) {
        return prev.filter(r => r !== rule);
      } else {
        return [...prev, rule];
      }
    });
  };

  // Fetch user accounts
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Get trading accounts
          if (userData.accounts && userData.accounts.length > 0) {
            setAccounts(userData.accounts);
            // Set default selection to first account
            setSelectedAccounts([userData.accounts[0].id]);
          } else {
            toast.error("No trading accounts found", {
              description: "Please add a trading account before adding trades",
              action: {
                label: "Add Account",
                onClick: () => router.push("/dashboard/accounts/new")
              }
            });
          }
          
          // Get trading plan if it exists
          if (userData.tradingPlan) {
            setTradingPlan(userData.tradingPlan);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data");
      }
    };
    
    fetchUserData();
  }, [user, router]);

  // Add a separated useEffect for calculating P&L
  useEffect(() => {
    // Skip calculation if any required value is missing
    if (!tradeData.entry || !tradeData.exit || !tradeData.size) {
      return;
    }

    const entry = parseFloat(tradeData.entry);
    const exit = parseFloat(tradeData.exit);
    const size = parseFloat(tradeData.size);
    const commission = parseFloat(tradeData.commission);

    // Skip calculation if any parsed value is invalid
    if (isNaN(entry) || isNaN(exit) || isNaN(size) || isNaN(commission)) {
      return;
    }

    let pnl;
    const totalCommission = commission * size;
    
    // Calculate PNL based on market type
    if (tradeData.marketType === 'futures' || tradeData.marketType === 'stocks') {
      // Calculate ticks
      const tickValue = parseFloat(tradeData.tickValue);
      if (isNaN(tickValue)) return;
      
      const tickSize = 1; // Default tick size of 1 point
      const ticks = Math.abs(exit - entry) / tickSize;
      
    if (tradeData.type === 'long') {
        pnl = ((exit - entry) * tickValue * size) - totalCommission;
    } else {
        pnl = ((entry - exit) * tickValue * size) - totalCommission;
      }
    } else if (tradeData.marketType === 'forex' || tradeData.marketType === 'crypto') {
      // Calculate pips
      const pipValue = parseFloat(tradeData.pipValue);
      if (isNaN(pipValue)) return;
      
      // For forex, we calculate in pips (0.0001 for most pairs, 0.01 for JPY pairs)
      const isPipDecimal = !tradeData.symbol.includes('JPY');
      const pipSize = isPipDecimal ? 0.0001 : 0.01;
      const pips = Math.abs(exit - entry) / pipSize;
      
      if (tradeData.type === 'long') {
        pnl = ((exit - entry) / pipSize * pipValue * size) - totalCommission;
      } else {
        pnl = ((entry - exit) / pipSize * pipValue * size) - totalCommission;
      }
    } else {
      // Default calculation for other markets (direct price difference)
      if (tradeData.type === 'long') {
        pnl = ((exit - entry) * size) - totalCommission;
      } else {
        pnl = ((entry - exit) * size) - totalCommission;
      }
    }
    
    const newPnl = pnl.toFixed(2);
    
    // Only update if the calculated value is different to avoid unnecessary re-renders
    if (newPnl !== tradeData.pnl) {
      setTradeData(prev => ({
        ...prev,
        pnl: newPnl
      }));
    }
  }, [
    tradeData.entry,
    tradeData.exit,
    tradeData.size,
    tradeData.type,
    tradeData.pnl,
    tradeData.marketType,
    tradeData.tickValue,
    tradeData.pipValue,
    tradeData.commission,
    tradeData.symbol
  ]);

  // Update selectedAccount when selectedAccounts changes
  useEffect(() => {
    if (selectedAccounts.length === 1) {
      const account = accounts.find(acc => acc.id === selectedAccounts[0]) || null;
      setSelectedAccount(account);
    } else {
      setSelectedAccount(null);
    }
  }, [selectedAccounts, accounts]);

  // Check risk tolerance when SL or selected account changes
  useEffect(() => {
    // Create a debounced version to avoid multiple warnings
    const checkRiskTolerance = () => {
      if (!tradeData.sl || !tradeData.entry || !tradeData.size || !selectedAccount || !tradingPlan?.riskManagement?.riskPercentage) {
        return;
      }

      const entry = parseFloat(tradeData.entry);
      const sl = parseFloat(tradeData.sl);
      const size = parseFloat(tradeData.size);
      
      if (isNaN(entry) || isNaN(sl) || isNaN(size) || sl === 0 || !selectedAccount.balance) {
        return;
      }
      
      // Calculate potential loss amount
      const isLong = tradeData.type === 'long';
      const pointsRisked = isLong ? Math.abs(entry - sl) : Math.abs(sl - entry);
      
      // Calculate dollar risk based on market type
      let dollarRisk = 0;
      
      if (tradeData.marketType === 'futures' || tradeData.marketType === 'stocks') {
        // For futures and stocks, use tick value
        const tickValue = parseFloat(tradeData.tickValue);
        if (isNaN(tickValue)) return;
        
        dollarRisk = pointsRisked * tickValue * size;
      } 
      else if (tradeData.marketType === 'forex' || tradeData.marketType === 'crypto') {
        // For forex and crypto, use pip value
        const pipValue = parseFloat(tradeData.pipValue);
        if (isNaN(pipValue)) return;
        
        // Determine pip size based on whether it's a JPY pair
        const isPipDecimal = !tradeData.symbol.includes('JPY');
        const pipSize = isPipDecimal ? 0.0001 : 0.01;
        const pips = pointsRisked / pipSize;
        
        dollarRisk = pips * pipValue * size;
      } 
      else {
        // For other market types, direct calculation
        dollarRisk = pointsRisked * size;
      }
      
      // Calculate risk as percentage of account balance
      const riskPercentage = (dollarRisk / selectedAccount.balance) * 100;
      
      // Check if risk exceeds tolerance
      if (riskPercentage > tradingPlan.riskManagement.riskPercentage) {
        toast.warning(
          `Risk Warning: Stop Loss exceeds your risk tolerance`, 
          {
            description: `Current risk: ${riskPercentage.toFixed(2)}% exceeds your limit of ${tradingPlan.riskManagement.riskPercentage}%`,
            duration: 5000,
            position: 'top-center'
          }
        );
      }
    };

    // Execute the check
    checkRiskTolerance();

  // Ensure the dependency array has a consistent format with initialized values
  }, [
    tradeData.sl, 
    tradeData.entry, 
    tradeData.size, 
    tradeData.type, 
    tradeData.marketType, 
    tradeData.tickValue, 
    tradeData.pipValue, 
    tradeData.symbol, 
    selectedAccount, 
    tradingPlan?.riskManagement?.riskPercentage
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTradeData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setTradeData(prev => ({ ...prev, [name]: value }));
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to add a trade");
      return;
    }
    
    if (selectedAccounts.length === 0) {
      toast.error("Please select at least one account for this trade");
      return;
    }
    
    try {
      setIsSaving(true);
      
      const [year, month, day] = tradeData.date.split('-').map(Number);
      const [hours, minutes, seconds] = tradeData.time.split(':').map(Number);
      
      const tradeDate = new Date(year, month - 1, day, hours, minutes, seconds);
      
      // Reference to the user document
      const userRef = doc(db, "users", user.uid);
      
      // Get current user data
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        toast.error("User profile not found");
        return;
      }
      
      const userData = userDoc.data();
      const existingAccounts = userData.accounts || [];
      
      // Make a copy of the accounts array to modify
      const updatedAccounts = [...existingAccounts];
      
      // Track which accounts were updated
      const updatedAccountsList: string[] = [];
      
      // Apply the trade to each selected account
      for (const accountId of selectedAccounts) {
        // Find the account to update
        const accountIndex = updatedAccounts.findIndex((acc: any) => acc.id === accountId);
        if (accountIndex === -1) continue;
        
        // Create the trade object with a unique ID for each account
        const trade = {
          id: crypto.randomUUID(),
          symbol: tradeData.symbol.toUpperCase(),
          date: {
            seconds: Math.floor(tradeDate.getTime() / 1000),
            nanoseconds: 0
          },
          type: tradeData.type,
          marketType: tradeData.marketType,
          entry: parseFloat(tradeData.entry),
          exit: parseFloat(tradeData.exit),
          exitTime: tradeData.exitTime,
          tp: tradeData.tp ? parseFloat(tradeData.tp) : null,
          sl: tradeData.sl ? parseFloat(tradeData.sl) : null,
          size: parseFloat(tradeData.size),
          tickValue: tradeData.marketType === 'futures' || tradeData.marketType === 'stocks' ? parseFloat(tradeData.tickValue) : null,
          pipValue: tradeData.marketType === 'forex' || tradeData.marketType === 'crypto' ? parseFloat(tradeData.pipValue) : null,
          commission: parseFloat(tradeData.commission),
          pnl: parseFloat(tradeData.pnl),
          notes: tradeData.notes,
          followedRules: selectedRules.length > 0 ? selectedRules : [],
          createdAt: new Date().getTime()
        };
        
        // Add trade to account
        if (!updatedAccounts[accountIndex].trades) {
          updatedAccounts[accountIndex].trades = [];
        }
        
        updatedAccounts[accountIndex].trades.push(trade);
        
        // Update account balance
        const currentBalance = updatedAccounts[accountIndex].balance || 
                               updatedAccounts[accountIndex].accountSize || 0;
        updatedAccounts[accountIndex].balance = currentBalance + parseFloat(tradeData.pnl);
        
        updatedAccountsList.push(updatedAccounts[accountIndex].broker);
      }
      
      // Update the user document with the updated accounts
      await updateDoc(userRef, {
        accounts: updatedAccounts
      });
      
      const accountString = updatedAccountsList.length > 1 
        ? `${updatedAccountsList.length} accounts (${updatedAccountsList.join(', ')})`
        : updatedAccountsList[0];
      
      toast.success("Trade added successfully", {
        description: `${tradeData.symbol} trade has been added to ${accountString}`
      });
      
      // Redirect to trades page
      router.push('/dashboard/trades');
    } catch (error) {
      console.error("Error adding trade:", error);
      toast.error("Error adding trade", {
        description: "There was a problem saving your trade"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Add New Trade</h1>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>No Trading Accounts</CardTitle>
            <CardDescription>
              You need to create a trading account before adding trades
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">You don't have any trading accounts set up yet.</p>
            <Link href="/dashboard/accounts/new">
              <Button>Create Trading Account</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add New Trade</h1>
      </div>
      
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1">
          <Tabs defaultValue="details" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Trade Details</TabsTrigger>
          <TabsTrigger value="accounts">Select Accounts</TabsTrigger>
          <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
        </TabsList>
        
        <Card className="border-t-0 rounded-tl-none rounded-tr-none">
          <form onSubmit={handleSubmit}>
            <TabsContent value="details" className="m-0">
              <CardHeader>
                <CardTitle>Trade Details</CardTitle>
                <CardDescription>
                  Enter the details of your trade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      name="symbol"
                      value={tradeData.symbol}
                      onChange={handleInputChange}
                      placeholder="e.g. AAPL"
                      required
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Trade Type</Label>
                    <Select 
                      value={tradeData.type} 
                      onValueChange={(value) => handleSelectChange('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trade type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-full bg-[#089981] mr-2" />
                            Long
                          </div>
                        </SelectItem>
                        <SelectItem value="short">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-full bg-[#f23645] mr-2" />
                            Short
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="marketType">Market Type</Label>
                  <Select 
                    value={tradeData.marketType} 
                    onValueChange={(value) => handleSelectChange('marketType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select market type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="futures">Futures</SelectItem>
                      <SelectItem value="forex">Forex</SelectItem>
                      <SelectItem value="stocks">Stocks</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="options">Options</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={tradeData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      name="time"
                      type="time"
                      step="1"
                      value={tradeData.time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="entry">Entry Price</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        id="entry"
                        name="entry"
                        type="number"
                        step="0.01"
                        value={tradeData.entry}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        required
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exit">Exit Price</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        id="exit"
                        name="exit"
                        type="number"
                        step="0.01"
                        value={tradeData.exit}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        required
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exitTime">Exit Time</Label>
                    <Input
                      id="exitTime"
                      name="exitTime"
                      type="time"
                      step="1"
                      value={tradeData.exitTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tp">Take Profit (TP)</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        id="tp"
                        name="tp"
                        type="number"
                        step="0.01"
                        value={tradeData.tp}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sl">Stop Loss (SL)</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        id="sl"
                        name="sl"
                        type="number"
                        step="0.01"
                        value={tradeData.sl}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="size">
                      {tradeData.marketType === 'futures' || tradeData.marketType === 'stocks' || tradeData.marketType === 'options'
                        ? 'Contracts'
                        : tradeData.marketType === 'forex' || tradeData.marketType === 'crypto'
                        ? 'Lots'
                        : 'Position Size'}
                    </Label>
                    <Input
                      id="size"
                      name="size"
                      type="number"
                      step="0.01"
                      value={tradeData.size}
                      onChange={handleInputChange}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>

                {/* Market specific fields */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor={tradeData.marketType === 'forex' || tradeData.marketType === 'crypto' ? 'pipValue' : 'tickValue'}>
                      {tradeData.marketType === 'forex' || tradeData.marketType === 'crypto'
                        ? 'Pip Value ($)'
                        : 'Tick Value ($)'}
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        id={tradeData.marketType === 'forex' || tradeData.marketType === 'crypto' ? 'pipValue' : 'tickValue'}
                        name={tradeData.marketType === 'forex' || tradeData.marketType === 'crypto' ? 'pipValue' : 'tickValue'}
                        type="number"
                        step="0.01"
                        value={tradeData.marketType === 'forex' || tradeData.marketType === 'crypto' ? tradeData.pipValue : tradeData.tickValue}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="pl-7"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commission">
                      Commission per {tradeData.marketType === 'futures' || tradeData.marketType === 'stocks' || tradeData.marketType === 'options'
                        ? 'Contract'
                        : 'Lot'} ($)
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        id="commission"
                        name="commission"
                        type="number"
                        step="0.01"
                        value={tradeData.commission}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="pl-7"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pnl">Profit/Loss</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <Input
                      id="pnl"
                      name="pnl"
                      type="number"
                      step="0.01"
                      value={tradeData.pnl}
                      onChange={handleInputChange}
                      className={`pl-7 font-medium ${
                        tradeData.pnl && !isNaN(Number(tradeData.pnl)) 
                          ? Number(tradeData.pnl) >= 0 
                            ? 'text-[#089981]' 
                            : 'text-[#f23645]'
                          : ''
                      }`}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedAccounts.length > 1 && tradeData.pnl && !isNaN(Number(tradeData.pnl)) && (
                      <p>Total P/L across all selected accounts: {' '}
                        <span className={`font-medium ${Number(tradeData.pnl) >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                          ${(Number(tradeData.pnl) * selectedAccounts.length).toFixed(2)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Trade Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={tradeData.notes}
                    onChange={handleInputChange}
                    placeholder="Add your trade notes, strategy, and observations here..."
                    className="min-h-[120px]"
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    This trade will be added to {selectedAccounts.length} {selectedAccounts.length === 1 ? 'account' : 'accounts'}
                  </span>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveTab("accounts")}
                    >
                      Change Accounts
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveTab("evaluation")}
                    >
                      Evaluate Trade
                    </Button>
                  </div>
                </div>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="accounts" className="m-0">
              <CardHeader>
                <CardTitle>Select Trading Accounts</CardTitle>
                <CardDescription>
                  Choose which accounts this trade was executed in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium">
                      Selected: {selectedAccounts.length} {selectedAccounts.length === 1 ? 'account' : 'accounts'}
                    </span>
                    <div className="space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedAccounts([])}
                        disabled={selectedAccounts.length === 0}
                      >
                        Clear All
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedAccounts(accounts.map(acc => acc.id))}
                        disabled={selectedAccounts.length === accounts.length}
                      >
                        Select All
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {accounts.map((account) => {
                      const isSelected = selectedAccounts.includes(account.id);
                      return (
                        <div
                          key={account.id}
                          className={`p-4 border rounded-lg flex items-center cursor-pointer transition-all hover:shadow-md ${
                            isSelected 
                              ? 'bg-primary/10 border-primary ring-1 ring-primary' 
                              : 'hover:bg-muted/50 border-border'
                          }`}
                          onClick={() => toggleAccountSelection(account.id)}
                        >
                          <div className="flex items-center w-full">
                            <div className={`w-3 h-10 rounded-sm mr-3 ${isSelected ? 'bg-primary' : 'bg-gray-200'}`} />
                            <div className="flex-1">
                              <div className="font-medium">{account.broker}</div>
                              <div className="text-sm text-muted-foreground flex items-center justify-between">
                                <span>{account.type.toUpperCase()}</span>
                                <span className="font-medium">${account.balance?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="evaluation" className="m-0">
              <CardHeader>
                <CardTitle>Trading Plan Evaluation</CardTitle>
                <CardDescription>
                  Evaluate this trade against your trading plan rules
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[400px]">
                <TradeEvaluation 
                  tradingPlan={tradingPlan}
                  selectedRules={selectedRules}
                  onSelectRule={toggleRuleSelection}
                  riskRewardRatio={riskRewardRatio}
                  targetRatio={tradingPlan?.riskManagement?.targetRiskRewardRatio || null}
                  isComplete={isTradeComplete}
                  tradeData={{
                    entry: tradeData.entry,
                    sl: tradeData.sl,
                    size: tradeData.size,
                    type: tradeData.type,
                    marketType: tradeData.marketType,
                    tickValue: tradeData.tickValue,
                    pipValue: tradeData.pipValue,
                    symbol: tradeData.symbol
                  }}
                  account={selectedAccount}
                />
              </CardContent>
            </TabsContent>
            
            <CardFooter className="flex justify-between p-6">
              <Link href="/dashboard/trades">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isSaving || selectedAccounts.length === 0}
                className="gap-2"
              >
                {isSaving ? "Saving..." : "Save Trade"}
                {!isSaving && <PlusIcon size={16} />}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </Tabs>
        </div>
        
        {/* Trade Visualization */}
        <div className="w-full xl:w-[380px] md:min-h-[550px]">
          <div className="grid grid-cols-1 gap-4">
            <TradeVisualizer 
              tradeData={tradeData} 
              isComplete={isTradeComplete}
            />

            {/* Mobile-only evaluation section */}
            <div className="xl:hidden">
              <TradeEvaluation 
                tradingPlan={tradingPlan}
                selectedRules={selectedRules}
                onSelectRule={toggleRuleSelection}
                riskRewardRatio={riskRewardRatio}
                targetRatio={tradingPlan?.riskManagement?.targetRiskRewardRatio || null}
                isComplete={isTradeComplete}
                tradeData={{
                  entry: tradeData.entry,
                  sl: tradeData.sl,
                  size: tradeData.size,
                  type: tradeData.type,
                  marketType: tradeData.marketType,
                  tickValue: tradeData.tickValue,
                  pipValue: tradeData.pipValue,
                  symbol: tradeData.symbol
                }}
                account={selectedAccount}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 