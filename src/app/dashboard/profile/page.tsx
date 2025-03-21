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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <Button
          onClick={saveProfile}
          disabled={saving || !hasChanges}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      
      {/* User Info Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Profile picture */}
            <div className="relative">
              <div className={cn(
                "h-24 w-24 rounded-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-3xl overflow-hidden",
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
                  className="h-8 w-8 rounded-full shadow-sm"
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
              <div className="text-muted-foreground">
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
            <div className="grid grid-cols-2 gap-4 mt-4 sm:mt-0 sm:border-l sm:pl-6 sm:border-muted">
              <div>
                <div className="text-sm text-muted-foreground">Total Trades</div>
                <div className="text-2xl font-semibold">{profile.totalTrades || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Accounts</div>
                <div className="text-2xl font-semibold">{profile.totalAccounts || 0}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Profile Information */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information and how others see you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={profile.displayName}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={profile.location}
                  onChange={handleInputChange}
                  placeholder="City, Country"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  value={profile.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            
            {/* Second column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={profile.bio}
                  onChange={handleInputChange}
                  placeholder="Tell us about yourself and your trading journey"
                  className="min-h-[120px]"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="experience">Trading Experience</Label>
                <Input
                  id="experience"
                  name="experience"
                  value={profile.experience}
                  onChange={handleInputChange}
                  placeholder="e.g. 3 years"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Trading Preferences */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Trading Preferences</CardTitle>
          <CardDescription>
            Customize your trading style and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tradingStyle">Trading Style</Label>
                <Input
                  id="tradingStyle"
                  name="tradingStyle"
                  value={profile.tradingStyle}
                  onChange={handleInputChange}
                  placeholder="e.g. Swing Trading, Day Trading"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                <Input
                  id="riskTolerance"
                  name="riskTolerance"
                  value={profile.riskTolerance}
                  onChange={handleInputChange}
                  placeholder="e.g. Conservative, Moderate, Aggressive"
                />
              </div>
            </div>
            
            {/* Second column */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="timeZone">Time Zone</Label>
                <Input
                  id="timeZone"
                  name="timeZone"
                  value={profile.timeZone}
                  onChange={handleInputChange}
                  placeholder="e.g. EST, GMT+1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Privacy & Notifications */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Privacy & Notifications</CardTitle>
          <CardDescription>
            Manage your privacy settings and notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="publicProfile">Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Make your profile visible to others
                </p>
              </div>
              <Switch
                id="publicProfile"
                checked={profile.isPublicProfile}
                onCheckedChange={() => handleToggle('isPublicProfile')}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="showPnL">Show P&L</Label>
                <p className="text-sm text-muted-foreground">
                  Show your profit and loss
                </p>
              </div>
              <Switch
                id="showPnL"
                checked={profile.showPnL}
                onCheckedChange={() => handleToggle('showPnL')}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="showStats">Show Trading Stats</Label>
                <p className="text-sm text-muted-foreground">
                  Show your trading statistics
                </p>
              </div>
              <Switch
                id="showStats"
                checked={profile.showTradingStats}
                onCheckedChange={() => handleToggle('showTradingStats')}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="weeklySummary">Weekly Summary</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly trading summary
                </p>
              </div>
              <Switch
                id="weeklySummary"
                checked={profile.receiveWeeklySummary}
                onCheckedChange={() => handleToggle('receiveWeeklySummary')}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="tradeReminders">Trade Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get daily trade journal reminders
                </p>
              </div>
              <Switch
                id="tradeReminders"
                checked={profile.dailyTradeReminders}
                onCheckedChange={() => handleToggle('dailyTradeReminders')}
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="marketAlerts">Market Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive market movement alerts
                </p>
              </div>
              <Switch
                id="marketAlerts"
                checked={profile.marketAlerts}
                onCheckedChange={() => handleToggle('marketAlerts')}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button
          onClick={saveProfile}
          disabled={saving || !hasChanges}
          className="px-6"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
} 