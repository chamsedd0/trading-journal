'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOnboarding } from "@/lib/onboarding-context";
import { useState } from "react";
import { AccountType } from "@/lib/onboarding-context";

const INITIAL_BALANCE_OPTIONS = [
  { value: "10000", label: "$10,000" },
  { value: "25000", label: "$25,000" },
  { value: "50000", label: "$50,000" },
  { value: "100000", label: "$100,000" },
  { value: "150000", label: "$150,000" },
  { value: "200000", label: "$200,000" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "real", label: "Real" },
  { value: "demo", label: "Demo" },
  { value: "prop-firm-challenge", label: "Prop Firm (Challenge)" },
  { value: "prop-firm-real", label: "Prop Firm (Real)" },
];

interface AccountFormState {
  initialBalance: string;
  currentBalance: string;
  accountType: AccountType;
}

export function TradingAccountStep() {
  const { state, addAccount } = useOnboarding();
  const [formState, setFormState] = useState<AccountFormState>({
    initialBalance: "",
    currentBalance: "",
    accountType: "real",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAccount({
      initialBalance: parseFloat(formState.initialBalance),
      currentBalance: parseFloat(formState.currentBalance) || parseFloat(formState.initialBalance),
      accountType: formState.accountType,
    });
    // Reset form
    setFormState({
      initialBalance: "",
      currentBalance: "",
      accountType: "real",
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {state.accounts.map((account, index) => (
          <div key={index} className="p-4 border rounded-lg bg-secondary/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{ACCOUNT_TYPE_OPTIONS.find(opt => opt.value === account.accountType)?.label}</p>
                <p className="text-sm text-muted-foreground">
                  Initial: ${account.initialBalance.toLocaleString()} | Current: ${account.currentBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Account Type</Label>
          <Select
            value={formState.accountType}
            onValueChange={(value) => setFormState(prev => ({ ...prev, accountType: value as AccountType }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account type" />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Initial Balance</Label>
          <Select
            value={formState.initialBalance}
            onValueChange={(value) => setFormState(prev => ({ ...prev, initialBalance: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select initial balance" />
            </SelectTrigger>
            <SelectContent>
              {INITIAL_BALANCE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Current Balance (Optional)</Label>
          <Input
            type="number"
            placeholder="Enter current balance"
            value={formState.currentBalance}
            onChange={(e) => setFormState(prev => ({ ...prev, currentBalance: e.target.value }))}
          />
        </div>

        <Button type="submit" className="w-full">
          Add Account
        </Button>
      </form>
    </div>
  );
} 