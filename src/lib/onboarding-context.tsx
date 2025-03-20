'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AccountType = 'real' | 'demo' | 'prop-firm-challenge' | 'prop-firm-real';
export type RiskPlanType = 'dynamic' | 'fixed' | 'custom';

interface TradingAccount {
  initialBalance: number;
  currentBalance: number;
  accountType: AccountType;
  // Prop firm specific fields
  maxLimitLoss?: number;
  maxDailyLoss?: number;
  personalDailyProfitTarget?: number;
  profitTargetToPass?: number;
  monthlyPersonalProfitTarget?: number;
  firmName?: string;
}

interface TradingPlan {
  concepts: string[];
  entryRules: string[];
  riskManagement: {
    planType: RiskPlanType;
    customRules?: string[];
  };
}

interface OnboardingState {
  step: number;
  personalInfo: {
    fullName: string;
  };
  accounts: TradingAccount[];
  tradingPlan: TradingPlan;
}

interface OnboardingContextType {
  state: OnboardingState;
  setStep: (step: number) => void;
  updatePersonalInfo: (info: Partial<OnboardingState['personalInfo']>) => void;
  addAccount: (account: TradingAccount) => void;
  updateAccount: (index: number, account: Partial<TradingAccount>) => void;
  removeAccount: (index: number) => void;
  updateTradingPlan: (plan: Partial<TradingPlan>) => void;
  isStepValid: (step: number) => boolean;
}

const initialState: OnboardingState = {
  step: 1,
  personalInfo: {
    fullName: '',
  },
  accounts: [],
  tradingPlan: {
    concepts: [],
    entryRules: [],
    riskManagement: {
      planType: 'fixed',
    },
  },
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState);

  const setStep = (step: number) => {
    setState(prev => ({ ...prev, step }));
  };

  const updatePersonalInfo = (info: Partial<OnboardingState['personalInfo']>) => {
    setState(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, ...info },
    }));
  };

  const addAccount = (account: TradingAccount) => {
    setState(prev => ({
      ...prev,
      accounts: [...prev.accounts, account],
    }));
  };

  const updateAccount = (index: number, account: Partial<TradingAccount>) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map((acc, i) =>
        i === index ? { ...acc, ...account } : acc
      ),
    }));
  };

  const removeAccount = (index: number) => {
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.filter((_, i) => i !== index),
    }));
  };

  const updateTradingPlan = (plan: Partial<TradingPlan>) => {
    setState(prev => ({
      ...prev,
      tradingPlan: { ...prev.tradingPlan, ...plan },
    }));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1: // Personal Information
        return !!state.personalInfo.fullName;
      case 2: // Trading Account Information
        return state.accounts.length > 0;
      case 3: // Trading Plan Concepts - skippable
        return true;
      case 4: // Entry Rules - skippable
        return true;
      case 5: // Risk Management - skippable
        return true;
      case 6: // Final Review
        return true;
      default:
        return true;
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        state,
        setStep,
        updatePersonalInfo,
        addAccount,
        updateAccount,
        removeAccount,
        updateTradingPlan,
        isStepValid,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
} 