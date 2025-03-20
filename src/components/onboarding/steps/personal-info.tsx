'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboarding } from "@/lib/onboarding-context";

export function PersonalInfoStep() {
  const { state, updatePersonalInfo } = useOnboarding();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          placeholder="Enter your full name"
          value={state.personalInfo.fullName}
          onChange={(e) => updatePersonalInfo({ fullName: e.target.value })}
        />
      </div>
    </div>
  );
} 