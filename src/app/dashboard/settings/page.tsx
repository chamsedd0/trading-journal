'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsPageSkeleton } from "@/components/skeletons";

interface Settings {
  darkMode: boolean;
  emailNotifications: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    darkMode: false,
    emailNotifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSettings({
            darkMode: userData.darkMode || false,
            emailNotifications: userData.emailNotifications !== false, // default to true
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast.error("Error", {
          description: "Failed to load settings"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [user]);
  
  const handleToggle = (key: keyof Settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };
  
  const saveSettings = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      await updateDoc(doc(db, "users", user.uid), {
        darkMode: settings.darkMode,
        emailNotifications: settings.emailNotifications,
      });
      
      // Apply dark mode
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      toast.success("Settings saved", {
        description: "Your settings have been updated successfully"
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error", {
        description: "Failed to save settings"
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <SettingsPageSkeleton />;
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the application looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enable dark mode for a better viewing experience at night
              </p>
            </div>
            <Switch 
              id="dark-mode" 
              checked={settings.darkMode} 
              onCheckedChange={() => handleToggle('darkMode')}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications about your account and activity
              </p>
            </div>
            <Switch 
              id="email-notifications" 
              checked={settings.emailNotifications} 
              onCheckedChange={() => handleToggle('emailNotifications')}
            />
          </div>
        </CardContent>
      </Card>
      
      <Button 
        onClick={saveSettings}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
} 