'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ProfilePageSkeleton } from '@/components/skeletons';
import { cn } from '@/lib/utils';

interface UserProfile {
  displayName: string;
  email: string;
  bio: string;
  location: string;
  experience: string;
  website: string;
  tradingStyle: string;
  riskTolerance: string;
  timeZone: string;
  preferredMarkets: string[];
  isPublicProfile: boolean;
  showPnL: boolean;
  showTradingStats: boolean;
  receiveWeeklySummary: boolean;
  dailyTradeReminders: boolean;
  marketAlerts: boolean;
  totalTrades?: number;
  totalAccounts?: number;
  setupComplete?: boolean;
  photoURL?: string;
  
  // Social features
  followers?: string[];
  following?: string[];
  connectionRequests?: string[];
  pendingRequests?: string[];
  
  // Social media links
  twitterHandle?: string;
  instagramHandle?: string;
  discordHandle?: string;
  tradingViewUsername?: string;
  allowMessagesFromNonConnections?: boolean;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    email: '',
    bio: '',
    location: '',
    experience: '',
    website: '',
    tradingStyle: '',
    riskTolerance: '',
    timeZone: '',
    preferredMarkets: [],
    isPublicProfile: false,
    showPnL: true,
    showTradingStats: true,
    receiveWeeklySummary: true,
    dailyTradeReminders: false,
    marketAlerts: true,
    
    // Social features
    twitterHandle: '',
    instagramHandle: '',
    discordHandle: '',
    tradingViewUsername: '',
    allowMessagesFromNonConnections: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Extract accounts info for stats
          const accountsCount = userData.accounts?.length || 0;
          const tradeCount = userData.accounts?.reduce((total: number, account: any) => {
            return total + (account.trades?.length || 0);
          }, 0) || 0;
          
          // Combine the data from the database with the user object
          setProfile({
            displayName: userData.displayName || user.displayName || '',
            email: userData.email || user.email || '',
            photoURL: userData.photoURL || user.photoURL || '',
            bio: userData.bio || '',
            location: userData.location || '',
            experience: userData.experience || '',
            website: userData.website || '',
            tradingStyle: userData.tradingStyle || '',
            riskTolerance: userData.riskTolerance || '',
            timeZone: userData.timeZone || '',
            preferredMarkets: userData.preferredMarkets || [],
            isPublicProfile: userData.isPublicProfile || false,
            showPnL: userData.showPnL !== false, // default true
            showTradingStats: userData.showTradingStats !== false, // default true
            receiveWeeklySummary: userData.receiveWeeklySummary !== false, // default true
            dailyTradeReminders: userData.dailyTradeReminders || false,
            marketAlerts: userData.marketAlerts !== false, // default true
            totalTrades: tradeCount,
            totalAccounts: accountsCount,
            setupComplete: userData.setupComplete,
            
            // Social features
            followers: userData.followers || [],
            following: userData.following || [],
            connectionRequests: userData.connectionRequests || [],
            pendingRequests: userData.pendingRequests || [],
            twitterHandle: userData.twitterHandle || '',
            instagramHandle: userData.instagramHandle || '',
            discordHandle: userData.discordHandle || '',
            tradingViewUsername: userData.tradingViewUsername || '',
            allowMessagesFromNonConnections: userData.allowMessagesFromNonConnections || false,
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };
  
  const handleToggle = (key: keyof UserProfile) => {
    setProfile((prev) => ({ ...prev, [key]: !prev[key as keyof UserProfile] }));
    setHasChanges(true);
  };
  
  const saveProfile = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      
      // Only save specific fields to the database
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: profile.displayName,
        bio: profile.bio,
        location: profile.location,
        experience: profile.experience,
        website: profile.website,
        tradingStyle: profile.tradingStyle,
        riskTolerance: profile.riskTolerance,
        timeZone: profile.timeZone,
        preferredMarkets: profile.preferredMarkets,
        isPublicProfile: profile.isPublicProfile,
        showPnL: profile.showPnL,
        showTradingStats: profile.showTradingStats,
        receiveWeeklySummary: profile.receiveWeeklySummary,
        dailyTradeReminders: profile.dailyTradeReminders,
        marketAlerts: profile.marketAlerts,
        
        // Social features
        twitterHandle: profile.twitterHandle,
        instagramHandle: profile.instagramHandle,
        discordHandle: profile.discordHandle,
        tradingViewUsername: profile.tradingViewUsername,
        allowMessagesFromNonConnections: profile.allowMessagesFromNonConnections,
      });
      
      toast.success('Profile updated successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <ProfilePageSkeleton />;
  }
  
  return (
    <div className="space-y-8">
      {/* Page header with title and save button */}
      <div className="flex justify-between items-center bg-muted/20 p-6 rounded-lg shadow-sm mb-8">
        <h1 className="text-3xl font-bold text-foreground/90">Your Profile</h1>
        <Button
          onClick={saveProfile}
          disabled={saving || !hasChanges}
          variant="default"
          className="px-6"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      
      {/* User Info Card */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-primary/5 to-muted/20 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Profile picture */}
              <div className="relative">
                <div className={cn(
                  "h-28 w-28 rounded-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-3xl overflow-hidden ring-4 ring-background shadow-md",
                  profile.photoURL && "border-2 border-primary/30"
                )}>
                  {profile.photoURL ? (
                    <img 
                      src={profile.photoURL} 
                      alt={profile.displayName} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    profile.displayName ? profile.displayName[0].toUpperCase() : "U"
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2">
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 rounded-full shadow-md"
                    // This is just a placeholder - would need to implement actual image upload
                    onClick={() => toast.info("Photo upload not implemented in this demo")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="13" height="13" rx="2" ry="2"></rect>
                    </svg>
                  </Button>
                </div>
              </div>
              
              {/* User details */}
              <div className="space-y-2 flex-1">
                <h2 className="text-2xl font-semibold">
                  {profile.displayName || "Trader"}
                </h2>
                <div className="text-muted-foreground flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  {profile.email}
                </div>
                {profile.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {profile.location}
                  </div>
                )}
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 gap-8 mt-4 sm:mt-0 sm:border-l sm:pl-6 sm:border-muted">
                <div className="bg-muted/20 p-3 rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Total Trades</div>
                  <div className="text-2xl font-semibold text-primary">{profile.totalTrades || 0}</div>
                </div>
                <div className="bg-muted/20 p-3 rounded-lg text-center">
                  <div className="text-sm text-muted-foreground">Accounts</div>
                  <div className="text-2xl font-semibold text-primary">{profile.totalAccounts || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Profile Information */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/20 pb-4">
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information and how others see you
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* First column */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="font-medium">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={profile.displayName}
                  onChange={handleInputChange}
                  className="border-muted-foreground/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location" className="font-medium">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={profile.location}
                  onChange={handleInputChange}
                  placeholder="City, Country"
                  className="border-muted-foreground/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website" className="font-medium">Website</Label>
                <Input
                  id="website"
                  name="website"
                  value={profile.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                  className="border-muted-foreground/20"
                />
              </div>
            </div>
            
            {/* Second column */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="bio" className="font-medium">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={profile.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself and your trading journey"
                  className="min-h-[120px] border-muted-foreground/20 resize-none"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="experience" className="font-medium">Trading Experience</Label>
                <Input
                  id="experience"
                  name="experience"
                  value={profile.experience}
                  onChange={handleInputChange}
                  placeholder="e.g. 3 years"
                  className="border-muted-foreground/20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Trading Preferences */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/20 pb-4">
          <CardTitle>Trading Preferences</CardTitle>
          <CardDescription>
            Customize your trading style and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* First column */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="tradingStyle" className="font-medium">Trading Style</Label>
                <Input
                  id="tradingStyle"
                  name="tradingStyle"
                  value={profile.tradingStyle}
                  onChange={handleInputChange}
                  placeholder="e.g. Swing Trading, Day Trading"
                  className="border-muted-foreground/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="riskTolerance" className="font-medium">Risk Tolerance</Label>
                <Input
                  id="riskTolerance"
                  name="riskTolerance"
                  value={profile.riskTolerance}
                  onChange={handleInputChange}
                  placeholder="e.g. Conservative, Moderate, Aggressive"
                  className="border-muted-foreground/20"
                />
              </div>
            </div>
            
            {/* Second column */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="timeZone" className="font-medium">Time Zone</Label>
                <Input
                  id="timeZone"
                  name="timeZone"
                  value={profile.timeZone}
                  onChange={handleInputChange}
                  placeholder="e.g. EST, GMT+1"
                  className="border-muted-foreground/20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Social Media Section - Add after "Trading Preferences" */}
      <Card className="md:col-span-7 overflow-hidden shadow-sm">
        <CardHeader className="bg-muted/20">
          <CardTitle>Social Connections</CardTitle>
          <CardDescription>
            Connect your social profiles and manage your trader network settings
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Social Media Links</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twitterHandle">Twitter</Label>
                <div className="flex">
                  <span className="bg-muted rounded-l-md px-3 py-2 text-muted-foreground">@</span>
                  <Input
                    id="twitterHandle"
                    name="twitterHandle"
                    value={profile.twitterHandle}
                    onChange={handleInputChange}
                    placeholder="twitterhandle"
                    className="rounded-l-none flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instagramHandle">Instagram</Label>
                <div className="flex">
                  <span className="bg-muted rounded-l-md px-3 py-2 text-muted-foreground">@</span>
                  <Input
                    id="instagramHandle"
                    name="instagramHandle"
                    value={profile.instagramHandle}
                    onChange={handleInputChange}
                    placeholder="instagramhandle"
                    className="rounded-l-none flex-1"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="discordHandle">Discord</Label>
                <Input
                  id="discordHandle"
                  name="discordHandle"
                  value={profile.discordHandle}
                  onChange={handleInputChange}
                  placeholder="username#0000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tradingViewUsername">TradingView</Label>
                <Input
                  id="tradingViewUsername"
                  name="tradingViewUsername"
                  value={profile.tradingViewUsername}
                  onChange={handleInputChange}
                  placeholder="tradingview_username"
                />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Network Settings</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublicProfile">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow other traders to find and connect with you
                  </p>
                </div>
                <Switch
                  id="isPublicProfile"
                  checked={profile.isPublicProfile}
                  onCheckedChange={() => handleToggle('isPublicProfile')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowMessagesFromNonConnections">Open Messaging</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow messages from traders you haven't connected with
                  </p>
                </div>
                <Switch
                  id="allowMessagesFromNonConnections"
                  checked={profile.allowMessagesFromNonConnections}
                  onCheckedChange={() => handleToggle('allowMessagesFromNonConnections')}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="showTradingStats">Share Trading Stats</Label>
                  <p className="text-sm text-muted-foreground">
                    Show your trading statistics on your public profile
                  </p>
                </div>
                <Switch
                  id="showTradingStats"
                  checked={profile.showTradingStats}
                  onCheckedChange={() => handleToggle('showTradingStats')}
                />
              </div>
              
              <div className="pt-4">
                <div className="p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <h4 className="font-medium">Network Stats</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-background rounded flex justify-between items-center">
                      <span className="text-muted-foreground">Followers</span>
                      <span className="font-medium">{profile.followers?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-background rounded flex justify-between items-center">
                      <span className="text-muted-foreground">Following</span>
                      <span className="font-medium">{profile.following?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-background rounded flex justify-between items-center">
                      <span className="text-muted-foreground">Pending Requests</span>
                      <span className="font-medium">{profile.pendingRequests?.length || 0}</span>
                    </div>
                    <div className="p-2 bg-background rounded flex justify-between items-center">
                      <span className="text-muted-foreground">Connection Requests</span>
                      <span className="font-medium">{profile.connectionRequests?.length || 0}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-end">
                    <Button variant="link" className="h-8 px-0" asChild>
                      <a href="/dashboard/traders">Manage Connections</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Privacy & Notifications */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/20 pb-4">
          <CardTitle>Privacy & Notifications</CardTitle>
          <CardDescription>
            Manage your privacy settings and notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Privacy Settings Group */}
          <div className="p-6 border-b border-border/10">
            <h3 className="text-md font-medium mb-4">Privacy Settings</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-5">
              <div className="flex items-center justify-between gap-3 bg-muted/10 p-3 rounded-lg">
                <div>
                  <Label htmlFor="publicProfile" className="font-medium">Public Profile</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Make your profile visible to others
                  </p>
                </div>
                <Switch
                  id="publicProfile"
                  checked={profile.isPublicProfile}
                  onCheckedChange={() => handleToggle('isPublicProfile')}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              <div className="flex items-center justify-between gap-3 bg-muted/10 p-3 rounded-lg">
                <div>
                  <Label htmlFor="showPnL" className="font-medium">Show P&L</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Show your profit and loss
                  </p>
                </div>
                <Switch
                  id="showPnL"
                  checked={profile.showPnL}
                  onCheckedChange={() => handleToggle('showPnL')}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              <div className="flex items-center justify-between gap-3 bg-muted/10 p-3 rounded-lg">
                <div>
                  <Label htmlFor="showStats" className="font-medium">Show Trading Stats</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Show your trading statistics
                  </p>
                </div>
                <Switch
                  id="showStats"
                  checked={profile.showTradingStats}
                  onCheckedChange={() => handleToggle('showTradingStats')}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>
          
          {/* Notification Settings Group */}
          <div className="p-6">
            <h3 className="text-md font-medium mb-4">Notification Preferences</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-5">
              <div className="flex items-center justify-between gap-3 bg-muted/10 p-3 rounded-lg">
                <div>
                  <Label htmlFor="weeklySummary" className="font-medium">Weekly Summary</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive weekly trading summary
                  </p>
                </div>
                <Switch
                  id="weeklySummary"
                  checked={profile.receiveWeeklySummary}
                  onCheckedChange={() => handleToggle('receiveWeeklySummary')}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              <div className="flex items-center justify-between gap-3 bg-muted/10 p-3 rounded-lg">
                <div>
                  <Label htmlFor="tradeReminders" className="font-medium">Trade Reminders</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get daily trade journal reminders
                  </p>
                </div>
                <Switch
                  id="tradeReminders"
                  checked={profile.dailyTradeReminders}
                  onCheckedChange={() => handleToggle('dailyTradeReminders')}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              <div className="flex items-center justify-between gap-3 bg-muted/10 p-3 rounded-lg">
                <div>
                  <Label htmlFor="marketAlerts" className="font-medium">Market Alerts</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Receive market movement alerts
                  </p>
                </div>
                <Switch
                  id="marketAlerts"
                  checked={profile.marketAlerts}
                  onCheckedChange={() => handleToggle('marketAlerts')}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Bottom save button */}
      <div className="flex justify-end mt-8">
        <Button
          onClick={saveProfile}
          disabled={saving || !hasChanges}
          className="px-8"
          size="lg"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
} 