'use client';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboarding } from "@/lib/onboarding-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const TRADING_EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner (< 1 year)" },
  { value: "intermediate", label: "Intermediate (1-3 years)" },
  { value: "advanced", label: "Advanced (3-5 years)" },
  { value: "expert", label: "Expert (5+ years)" },
];

const TRADING_STYLE_OPTIONS = [
  { value: "day", label: "Day Trading" },
  { value: "swing", label: "Swing Trading" },
  { value: "position", label: "Position Trading" },
  { value: "scalping", label: "Scalping" },
];

const TIMEZONE_OPTIONS = [
  { value: "UTC-12:00", label: "(GMT-12:00) International Date Line West" },
  { value: "UTC-11:00", label: "(GMT-11:00) Midway Island, Samoa" },
  { value: "UTC-10:00", label: "(GMT-10:00) Hawaii" },
  { value: "UTC-09:00", label: "(GMT-09:00) Alaska" },
  { value: "UTC-08:00", label: "(GMT-08:00) Pacific Time (US & Canada)" },
  { value: "UTC-07:00", label: "(GMT-07:00) Mountain Time (US & Canada)" },
  { value: "UTC-06:00", label: "(GMT-06:00) Central Time (US & Canada), Mexico City" },
  { value: "UTC-05:00", label: "(GMT-05:00) Eastern Time (US & Canada)" },
  { value: "UTC-04:00", label: "(GMT-04:00) Atlantic Time (Canada), Caracas" },
  { value: "UTC-03:00", label: "(GMT-03:00) Brazil, Buenos Aires" },
  { value: "UTC-02:00", label: "(GMT-02:00) Mid-Atlantic" },
  { value: "UTC-01:00", label: "(GMT-01:00) Azores" },
  { value: "UTC+00:00", label: "(GMT+00:00) London, Dublin, Edinburgh" },
  { value: "UTC+01:00", label: "(GMT+01:00) Paris, Berlin, Rome, Madrid" },
  { value: "UTC+02:00", label: "(GMT+02:00) Athens, Istanbul, Helsinki" },
  { value: "UTC+03:00", label: "(GMT+03:00) Moscow, St. Petersburg" },
  { value: "UTC+04:00", label: "(GMT+04:00) Dubai, Abu Dhabi" },
  { value: "UTC+05:00", label: "(GMT+05:00) Mumbai, New Delhi" },
  { value: "UTC+06:00", label: "(GMT+06:00) Dhaka" },
  { value: "UTC+07:00", label: "(GMT+07:00) Bangkok, Jakarta" },
  { value: "UTC+08:00", label: "(GMT+08:00) Hong Kong, Singapore, Beijing" },
  { value: "UTC+09:00", label: "(GMT+09:00) Tokyo, Seoul" },
  { value: "UTC+10:00", label: "(GMT+10:00) Sydney, Melbourne" },
  { value: "UTC+11:00", label: "(GMT+11:00) Solomon Islands" },
  { value: "UTC+12:00", label: "(GMT+12:00) Auckland, Wellington" },
];

export function PersonalInfoStep() {
  const { state, updatePersonalInfo } = useOnboarding();
  const [tradingStyles, setTradingStyles] = useState<string[]>(state.personalInfo.tradingStyles || []);

  const handleTradingStyleToggle = (style: string) => {
    if (tradingStyles.includes(style)) {
      const updatedStyles = tradingStyles.filter(s => s !== style);
      setTradingStyles(updatedStyles);
      updatePersonalInfo({ tradingStyles: updatedStyles });
    } else {
      const updatedStyles = [...tradingStyles, style];
      setTradingStyles(updatedStyles);
      updatePersonalInfo({ tradingStyles: updatedStyles });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            placeholder="Enter your full name"
            value={state.personalInfo.fullName}
            onChange={(e) => updatePersonalInfo({ fullName: e.target.value })}
            className="h-10 sm:h-11"
          />
        </div>
        

      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Your Timezone</Label>
        <Select
          value={state.personalInfo.timezone || ""}
          onValueChange={(value) => updatePersonalInfo({ timezone: value })}
        >
          <SelectTrigger id="timezone" className="h-10 sm:h-11">
            <SelectValue placeholder="Select your timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience">Trading Experience</Label>
        <Select
          value={state.personalInfo.tradingExperience || ""}
          onValueChange={(value) => updatePersonalInfo({ tradingExperience: value })}
        >
          <SelectTrigger id="experience" className="h-10 sm:h-11">
            <SelectValue placeholder="Select your experience level" />
          </SelectTrigger>
          <SelectContent>
            {TRADING_EXPERIENCE_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Trading Styles</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {TRADING_STYLE_OPTIONS.map(style => (
            <Badge
              key={style.value}
              variant={tradingStyles.includes(style.value) ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/90 transition-colors"
              onClick={() => handleTradingStyleToggle(style.value)}
            >
              {style.label}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Click to select multiple trading styles that apply to you</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Brief Bio (Optional)</Label>
        <Textarea
          id="bio"
          placeholder="A brief description about yourself as a trader"
          value={state.personalInfo.bio || ""}
          onChange={(e) => updatePersonalInfo({ bio: e.target.value })}
          className="resize-none h-24"
        />
      </div>

      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-medium">Notification Preferences</h3>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="emailNotifications" className="text-sm">Email Notifications</Label>
            <p className="text-xs text-muted-foreground">Receive updates about your trading activity</p>
          </div>
          <Switch
            id="emailNotifications"
            checked={state.personalInfo.emailNotifications !== false}
            onCheckedChange={(checked) => updatePersonalInfo({ emailNotifications: checked })}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="marketAlerts" className="text-sm">Market Alerts</Label>
            <p className="text-xs text-muted-foreground">Get notified about market conditions and opportunities</p>
          </div>
          <Switch
            id="marketAlerts"
            checked={state.personalInfo.marketAlerts === true}
            onCheckedChange={(checked) => updatePersonalInfo({ marketAlerts: checked })}
          />
        </div>
      </div>
    </div>
  );
} 