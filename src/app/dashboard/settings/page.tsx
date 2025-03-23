'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SettingsPageSkeleton } from "@/components/skeletons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Twitter, Linkedin, Github, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

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
  const [userData, setUserData] = useState<{
    isPublicProfile?: boolean;
    socialPrivacy?: {
      showWinRate?: boolean;
      showPnL?: boolean;
      showTradingPlan?: boolean;
    };
    socialLinks?: {
      twitter?: string;
      linkedin?: string;
      github?: string;
      website?: string;
    };
    darkMode?: boolean;
    emailNotifications?: boolean;
  } | null>(null);
  
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
          setUserData(userData);
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
  
  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Prepare data for update, ensuring socialLinks exists
      const updateData = {
        darkMode: settings.darkMode,
        emailNotifications: settings.emailNotifications,
        isPublicProfile: userData?.isPublicProfile ?? false
      };
      
      // Only add socialPrivacy if it exists
      if (userData?.socialPrivacy) {
        updateData.socialPrivacy = userData.socialPrivacy;
      }
      
      // Only add socialLinks if it exists
      if (userData?.socialLinks) {
        // Ensure all properties exist with default empty strings
        updateData.socialLinks = {
          twitter: userData.socialLinks.twitter || '',
          linkedin: userData.socialLinks.linkedin || '',
          github: userData.socialLinks.github || '',
          website: userData.socialLinks.website || ''
        };
      } else {
        // Initialize empty socialLinks if it doesn't exist
        updateData.socialLinks = {
          twitter: '',
          linkedin: '',
          github: '',
          website: ''
        };
      }
      
      await updateDoc(doc(db, "users", user.uid), updateData);
      
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
  
  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'account', label: 'Account' },
    { id: 'social', label: 'Social' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'appearance', label: 'Appearance' },
  ];
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="profile" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Profile Settings</h3>
            <p className="text-sm text-muted-foreground">
              Update your profile information and preferences.
            </p>
          </div>
          <Separator />
          <div className="grid gap-6">
            {/* Profile settings form would go here */}
          </div>
        </TabsContent>
        <TabsContent value="account" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Account Settings</h3>
            <p className="text-sm text-muted-foreground">
              Manage your account details and preferences.
            </p>
          </div>
          <Separator />
          <div className="grid gap-6">
            {/* Account settings form would go here */}
          </div>
        </TabsContent>
        <TabsContent value="social" className="space-y-6">
            <div>
            <h3 className="text-lg font-medium">Social Profile Settings</h3>
              <p className="text-sm text-muted-foreground">
              Configure how you connect with other traders and what information is visible to them.
            </p>
          </div>

          <Separator />

          <div className="space-y-6">
            <div className="grid gap-3">
              <h4 className="font-medium text-sm">Privacy Settings</h4>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="public-profile">Public Profile</Label>
                    <div className="text-sm text-muted-foreground">
                      Allow your profile to appear in trader search results
                    </div>
                  </div>
                  <Switch 
                    id="public-profile" 
                    checked={userData?.isPublicProfile || false}
                    onCheckedChange={(checked) => {
                      setUserData((prev) => ({
                        ...prev,
                        isPublicProfile: checked,
                      }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-win-rate">Show Win Rate</Label>
                    <div className="text-sm text-muted-foreground">
                      Display your win rate on your public profile
                    </div>
                  </div>
                  <Switch 
                    id="show-win-rate" 
                    checked={userData?.socialPrivacy?.showWinRate || false}
                    onCheckedChange={(checked) => {
                      setUserData((prev) => ({
                        ...prev,
                        socialPrivacy: {
                          ...(prev.socialPrivacy || {}),
                          showWinRate: checked,
                        },
                      }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-pnl">Show P&L</Label>
                    <div className="text-sm text-muted-foreground">
                      Display your profit and loss on your public profile
                    </div>
                  </div>
                  <Switch 
                    id="show-pnl" 
                    checked={userData?.socialPrivacy?.showPnL || false}
                    onCheckedChange={(checked) => {
                      setUserData((prev) => ({
                        ...prev,
                        socialPrivacy: {
                          ...(prev.socialPrivacy || {}),
                          showPnL: checked,
                        },
                      }));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-trading-plan">Show Trading Plan</Label>
                    <div className="text-sm text-muted-foreground">
                      Share your trading plan concepts and rules with other traders
                    </div>
                  </div>
                  <Switch 
                    id="show-trading-plan" 
                    checked={userData?.socialPrivacy?.showTradingPlan || false}
                    onCheckedChange={(checked) => {
                      setUserData((prev) => ({
                        ...prev,
                        socialPrivacy: {
                          ...(prev.socialPrivacy || {}),
                          showTradingPlan: checked,
                        },
                      }));
                    }}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3">
              <h4 className="font-medium text-sm">Social Media Links</h4>
              <div className="grid gap-3">
                <div className="grid grid-cols-[25px_1fr] items-start pb-4 gap-4 last:pb-0">
                  <Twitter className="h-5 w-5 mt-2 text-muted-foreground" />
                  <div className="space-y-1">
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input
                      id="twitter"
                      placeholder="https://twitter.com/yourusername"
                      value={userData?.socialLinks?.twitter || ''}
                      onChange={(e) => {
                        setUserData((prev) => ({
                          ...prev,
                          socialLinks: {
                            ...(prev.socialLinks || {}),
                            twitter: e.target.value,
                          },
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[25px_1fr] items-start pb-4 gap-4 last:pb-0">
                  <Linkedin className="h-5 w-5 mt-2 text-muted-foreground" />
                  <div className="space-y-1">
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      placeholder="https://linkedin.com/in/yourusername"
                      value={userData?.socialLinks?.linkedin || ''}
                      onChange={(e) => {
                        setUserData((prev) => ({
                          ...prev,
                          socialLinks: {
                            ...(prev.socialLinks || {}),
                            linkedin: e.target.value,
                          },
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[25px_1fr] items-start pb-4 gap-4 last:pb-0">
                  <Github className="h-5 w-5 mt-2 text-muted-foreground" />
                  <div className="space-y-1">
                    <Label htmlFor="github">GitHub</Label>
                    <Input
                      id="github"
                      placeholder="https://github.com/yourusername"
                      value={userData?.socialLinks?.github || ''}
                      onChange={(e) => {
                        setUserData((prev) => ({
                          ...prev,
                          socialLinks: {
                            ...(prev.socialLinks || {}),
                            github: e.target.value,
                          },
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[25px_1fr] items-start pb-4 gap-4 last:pb-0">
                  <Globe className="h-5 w-5 mt-2 text-muted-foreground" />
                  <div className="space-y-1">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      placeholder="https://yourwebsite.com"
                      value={userData?.socialLinks?.website || ''}
                      onChange={(e) => {
                        setUserData((prev) => ({
                          ...prev,
                          socialLinks: {
                            ...(prev.socialLinks || {}),
                            website: e.target.value,
                          },
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Notification Settings</h3>
            <p className="text-sm text-muted-foreground">
              Configure how you receive notifications and what you are notified about.
            </p>
          </div>
          <Separator />
          <div className="space-y-6">
          <div className="flex items-center justify-between">
              <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                  Receive email notifications for important events
              </p>
            </div>
            <Switch 
              id="email-notifications" 
              checked={settings.emailNotifications} 
                onCheckedChange={(checked) => {
                  setSettings((prev) => ({
                    ...prev,
                    emailNotifications: checked,
                  }));
                }}
              />
            </div>
            {/* Additional notification settings would go here */}
          </div>
        </TabsContent>
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle dark mode on or off
                  </p>
                </div>
                <Switch
                  id="dark-mode" 
                  checked={settings.darkMode}
                  onCheckedChange={(checked) => {
                    setSettings((prev) => ({
                      ...prev,
                      darkMode: checked,
                    }));
                    // Apply dark mode
                    if (checked) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  }}
            />
          </div>
        </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </CardFooter>
      </Card>
        </TabsContent>
      </Tabs>
      
      <Button 
        onClick={saveSettings}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
} 