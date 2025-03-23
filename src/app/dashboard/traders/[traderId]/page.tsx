'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Clock,
  ExternalLink,
  Github,
  Twitter,
  Linkedin,
  Globe,
  Check,
  X,
  BookOpen,
  ArrowDownUp,
  ShieldAlert,
  Briefcase,
  DollarSign,
  Bitcoin,
  Timer,
  Layers,
  Trophy,
  Link,
  Youtube,
  Instagram,
  User,
  Mail,
  AtSign,
  LineChart as LineChartIcon,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { auth, firestore } from '@/lib/firebase';
import { useAuthContext, updateUserProfile } from '@/lib/auth-context';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/components/ui/toast";

interface TraderProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  email?: string;
  experience?: string;
  tradingStyle?: string;
  followers?: string[];
  following?: string[];
  isPublicProfile?: boolean;
  joinedAt?: Date;
  createdAt?: any;
  updatedAt?: any;
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    website?: string;
  }[];
  // Social media handles
  twitterHandle?: string;
  instagramHandle?: string;
  tradingViewUsername?: string;
  discordHandle?: string;
  website?: string;
  // Account information
  accounts?: {
    accountSize?: number;
    accountType?: string;
    balance?: number;
    broker?: string;
    category?: string;
    id?: string;
    maxLossLimit?: number;
    maxLossType?: string;
    type?: string;
    variant?: string;
    trades?: {
      createdAt?: number;
      date?: { seconds: number; nanoseconds: number };
      entry?: number;
      exit?: number;
      id?: string;
      notes?: string;
      pnl?: number;
      size?: number;
      symbol?: string;
      type?: string; // like "short" or "long"
    }[];
  }[];
  // Trading stats
  totalTrades?: number;
  winRate?: number;
  profitFactor?: number;
  averageWin?: number;
  averageLoss?: number;
  expectancy?: number;
  winningTrades?: number;
  losingTrades?: number;
  instruments?: {
    name: string;
    trades: number;
    winRate: number;
    pnl: number;
  }[];
  monthlyPerformance?: {
    month: string;
    pnl: number;
    trades: number;
    winRate: number;
  }[];
  tradeStats?: {
    winRate: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    expectancy: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
  };
  // Trading plan data
  tradingPlan?: {
    concepts?: string[];
    entryRules?: string[];
    riskManagement?: {
      planType?: string;
      riskPercentage?: number;
      reduceRiskAfterLoss?: boolean;
      targetRiskRewardRatio?: number;
      riskPerTrade?: number;
      maxDailyLoss?: number;
      maxWeeklyLoss?: number;
    };
  };
  // Onboarding data that may contain trading plan
  onboardingData?: {
    accounts?: any[];
    personalInfo?: any;
    tradingStyles?: string[];
    step?: number;
    tradingPlan?: {
      concepts?: string[];
      entryRules?: string[];
      riskManagement?: {
        planType?: string;
        riskPercentage?: number;
        reduceRiskAfterLoss?: boolean;
        targetRiskRewardRatio?: number;
      };
    };
  };
  tradingConcepts?: string[];
  tradingConcept?: string | string[];
  entryRules?: string[];
  entryRule?: string | string[];
  riskManagement?: string[];
  riskPerTrade?: number;
  maxDailyLoss?: number;
  maxWeeklyLoss?: number;
}

// Helper function to get icon for instrument type
const getInstrumentIcon = (name: string) => {
  const type = name.toLowerCase();
  
  if (type.includes('stock') || type.includes('share')) {
    return <BarChart3 className="h-4 w-4 text-blue-500" />;
  } else if (type.includes('forex') || type.includes('eur') || type.includes('usd') || type.includes('jpy') || type.includes('gbp')) {
    return <DollarSign className="h-4 w-4 text-green-500" />;
  } else if (type.includes('crypto') || type.includes('btc') || type.includes('eth') || type.includes('coin')) {
    return <Bitcoin className="h-4 w-4 text-orange-500" />;
  } else if (type.includes('future') || type.includes('es') || type.includes('nq') || type.includes('cl')) {
    return <Timer className="h-4 w-4 text-purple-500" />;
  } else if (type.includes('option')) {
    return <Layers className="h-4 w-4 text-indigo-500" />;
  } else {
    return <Globe className="h-4 w-4 text-gray-500" />;
  }
};

export default function TraderProfilePage() {
  const { traderId } = useParams();
  const router = useRouter();
  const { user, updateUserProfile, refreshAuthState } = useAuth();
  const { toast } = useToast();
  const [trader, setTrader] = useState<TraderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'request' | 'connected'>('none');
  const isCurrentUser = trader?.uid === user?.uid;
  
  useEffect(() => {
    const fetchTraderProfile = async () => {
      if (!traderId) return;
      
      try {
        const traderDoc = await getDoc(doc(db, 'users', traderId as string));
        
        if (!traderDoc.exists()) {
          setLoading(false);
          return;
        }
        
        const rawData = traderDoc.data();
        console.log("RAW USER DATA:", JSON.stringify(rawData, null, 2));
        
        // Create a deep copy to avoid direct mutations
        const traderData = JSON.parse(JSON.stringify(rawData)) as TraderProfile;
        traderData.uid = traderId as string;
        
        // Process trading plan data from the top-level tradingPlan or onboardingData.tradingPlan
        if (traderData.tradingPlan?.concepts && !traderData.tradingConcepts) {
          traderData.tradingConcepts = traderData.tradingPlan.concepts;
        } else if (traderData.onboardingData?.tradingPlan?.concepts && !traderData.tradingConcepts) {
          traderData.tradingConcepts = traderData.onboardingData.tradingPlan.concepts;
        }
        
        // Handle a single trading concept stored as a string
        if (typeof traderData.tradingConcept === 'string' && !traderData.tradingConcepts) {
          traderData.tradingConcepts = [traderData.tradingConcept];
        }
        
        if (traderData.tradingPlan?.entryRules && !traderData.entryRules) {
          traderData.entryRules = traderData.tradingPlan.entryRules;
        } else if (traderData.onboardingData?.tradingPlan?.entryRules && !traderData.entryRules) {
          traderData.entryRules = traderData.onboardingData.tradingPlan.entryRules;
        }
        
        // Handle a single entry rule stored as a string
        if (typeof traderData.entryRule === 'string' && !traderData.entryRules) {
          traderData.entryRules = [traderData.entryRule];
        }
        
        // Process risk management data
        if (!traderData.riskManagement) {
          traderData.riskManagement = [];
          
          // Check all possible paths for risk management data
          const riskMgmt = traderData.tradingPlan?.riskManagement || traderData.onboardingData?.tradingPlan?.riskManagement;
          
          if (riskMgmt) {
            if (riskMgmt.riskPercentage) {
              traderData.riskManagement.push(`Risk per trade: ${riskMgmt.riskPercentage}%`);
            }
            if (riskMgmt.targetRiskRewardRatio) {
              traderData.riskManagement.push(`Target R:R: ${riskMgmt.targetRiskRewardRatio}`);
            }
            if (riskMgmt.planType) {
              traderData.riskManagement.push(`Plan type: ${riskMgmt.planType}`);
            }
            if (riskMgmt.reduceRiskAfterLoss !== undefined) {
              traderData.riskManagement.push(`Reduce risk after loss: ${riskMgmt.reduceRiskAfterLoss ? 'Yes' : 'No'}`);
            }
          }
        }
        
        // Create or normalize tradeStats if they don't exist or are stored differently
        // Check if the statistics are at the top level instead of in a tradeStats object
        if (!traderData.tradeStats) {
          traderData.tradeStats = {
            winRate: traderData.winRate || 0,
            averageWin: traderData.averageWin || 0,
            averageLoss: traderData.averageLoss || 0,
            profitFactor: traderData.profitFactor || 0,
            expectancy: traderData.expectancy || 0,
            totalTrades: traderData.totalTrades || 0,
            winningTrades: traderData.winningTrades || 0,
            losingTrades: traderData.losingTrades || 0
          };
        }
        
        // Calculate trade statistics from accounts and trades
        if (traderData.accounts && traderData.accounts.length > 0) {
          // Aggregate all trades from all accounts
          let allTrades: any[] = [];
          traderData.accounts.forEach(account => {
            if (account.trades && account.trades.length > 0) {
              allTrades = [...allTrades, ...account.trades];
            }
          });
          
          if (allTrades.length > 0) {
            // Calculate trade stats
            const totalTrades = allTrades.length;
            const winningTrades = allTrades.filter(trade => trade.pnl > 0).length;
            const losingTrades = allTrades.filter(trade => trade.pnl < 0).length;
            const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
            
            const totalProfit = allTrades.filter(trade => trade.pnl > 0).reduce((sum, trade) => sum + trade.pnl, 0);
            const totalLoss = Math.abs(allTrades.filter(trade => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0));
            const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
            
            const averageWin = winningTrades > 0 ? totalProfit / winningTrades : 0;
            const averageLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
            const expectancy = (winRate / 100) * averageWin - ((100 - winRate) / 100) * averageLoss;
            
            // Create the trade stats object
            traderData.tradeStats = {
              totalTrades,
              winningTrades,
              losingTrades,
              winRate,
              profitFactor,
              averageWin,
              averageLoss,
              expectancy
            };
            
            // Create instruments data
            const instrumentMap = new Map();
            allTrades.forEach(trade => {
              if (!instrumentMap.has(trade.symbol)) {
                instrumentMap.set(trade.symbol, {
                  name: trade.symbol,
                  trades: 0,
                  winningTrades: 0,
                  pnl: 0
                });
              }
              
              const instrument = instrumentMap.get(trade.symbol);
              instrument.trades += 1;
              instrument.pnl += trade.pnl;
              if (trade.pnl > 0) instrument.winningTrades += 1;
            });
            
            traderData.instruments = Array.from(instrumentMap.values()).map(instrument => ({
              name: instrument.name,
              trades: instrument.trades,
              winRate: instrument.trades > 0 ? (instrument.winningTrades / instrument.trades) * 100 : 0,
              pnl: instrument.pnl
            }));
          }
        }
        
        console.log("NORMALIZED TRADER DATA:", JSON.stringify({
          displayName: traderData.displayName,
          tradingConcepts: traderData.tradingConcepts,
          entryRules: traderData.entryRules,
          riskManagement: traderData.riskManagement,
          tradingStyle: traderData.tradingStyle,
          tradeStats: traderData.tradeStats,
          instruments: traderData.instruments?.slice(0, 2) // Just log first two for brevity
        }, null, 2));
        
        setTrader(traderData);
        
        // Check connection status if logged in and not viewing own profile
        if (user && user.uid !== traderId) {
          await checkConnectionStatus(user.uid, traderId as string);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching trader profile:', error);
        setLoading(false);
      }
    };
    
    fetchTraderProfile();
  }, [traderId, user]);
  
  const checkConnectionStatus = async (currentUserId: string, traderId: string) => {
    try {
      // Check if users are connected by querying the connections collection
      const connectionsRef = collection(db, "connections");
      const connectionQuery = query(
        connectionsRef,
        where("userId", "==", currentUserId),
        where("connectedUserId", "==", traderId)
      );
      
      const connectionSnapshot = await getDocs(connectionQuery);
      
      if (!connectionSnapshot.empty) {
        setConnectionStatus("connected");
        return;
      }
      
      // Check for pending requests from current user to trader
      const sentRequestsRef = collection(db, "connectionRequests");
      const sentRequestQuery = query(
        sentRequestsRef,
        where("fromUid", "==", currentUserId),
        where("toUid", "==", traderId),
        where("status", "==", "pending")
      );
      
      const sentRequestSnapshot = await getDocs(sentRequestQuery);
      
      if (!sentRequestSnapshot.empty) {
        setConnectionStatus("pending");
        return;
      }
      
      // Check for requests from trader to current user
      const receivedRequestsRef = collection(db, "connectionRequests");
      const receivedRequestQuery = query(
        receivedRequestsRef,
        where("fromUid", "==", traderId),
        where("toUid", "==", currentUserId),
        where("status", "==", "pending")
      );
      
      const receivedRequestSnapshot = await getDocs(receivedRequestQuery);
      
      if (!receivedRequestSnapshot.empty) {
        setConnectionStatus("request");
        return;
      }
      
      // Default to no connection
      setConnectionStatus("none");
    } catch (error) {
      console.error("Error checking connection status:", error);
      setConnectionStatus("none");
    }
  };
  
  const handleConnect = async () => {
    if (!user || !trader) return;
    
    try {
      // Create a connection request
      await addDoc(collection(db, "connectionRequests"), {
        fromUid: user.uid,
        toUid: trader.uid,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      
      setConnectionStatus("pending");
      toast({
        title: "Request sent",
        description: "Your connection request has been sent.",
      });
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast({
        title: "Error",
        description: "Failed to send connection request. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleAcceptRequest = async () => {
    if (!user || !trader) return;
    
    try {
      // Find the connection request
      const requestsRef = collection(db, "connectionRequests");
      const q = query(
        requestsRef, 
        where("fromUid", "==", trader.uid),
        where("toUid", "==", user.uid),
        where("status", "==", "pending")
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast({
          title: "Error",
          description: "Connection request not found.",
          variant: "destructive",
        });
        return;
      }
      
      // Update the status to accepted
      await updateDoc(doc(db, "connectionRequests", querySnapshot.docs[0].id), {
        status: "accepted",
        updatedAt: serverTimestamp(),
      });
      
      // Create connections for both users
      await Promise.all([
        // Add trader to user's connections
        addDoc(collection(db, "connections"), {
          userId: user.uid,
          connectedUserId: trader.uid,
          createdAt: serverTimestamp(),
        }),
        // Add user to trader's connections
        addDoc(collection(db, "connections"), {
          userId: trader.uid,
          connectedUserId: user.uid,
          createdAt: serverTimestamp(),
        }),
      ]);
      
      setConnectionStatus("connected");
      toast({
        title: "Connection accepted",
        description: `You are now connected with ${trader.displayName}.`,
      });
      
      // Refresh user data in context after accepting connection
      await refreshAuthState();
    } catch (error) {
      console.error("Error accepting connection request:", error);
      toast({
        title: "Error",
        description: "Failed to accept connection request. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleDisconnect = async () => {
    if (!user || !trader) return;
    
    try {
      // Find and delete connections between the users
      const userConnectionsRef = collection(db, "connections");
      
      const userConnectionQuery = query(
        userConnectionsRef,
        where("userId", "==", user.uid),
        where("connectedUserId", "==", trader.uid)
      );
      
      const traderConnectionQuery = query(
        userConnectionsRef,
        where("userId", "==", trader.uid),
        where("connectedUserId", "==", user.uid)
      );
      
      const [userConnectionSnapshot, traderConnectionSnapshot] = await Promise.all([
        getDocs(userConnectionQuery),
        getDocs(traderConnectionQuery)
      ]);
      
      // Delete all matching connections
      const deletePromises = [
        ...userConnectionSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        ),
        ...traderConnectionSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        )
      ];
      
      await Promise.all(deletePromises);
      
      setConnectionStatus("none");
      toast({
        title: "Disconnected",
        description: `You have disconnected from ${trader.displayName}.`,
      });
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleToggleConnection = () => {
    if (!trader) return;
    
    switch (connectionStatus) {
      case 'connected':
        handleDisconnect();
        break;
      case 'pending':
        // Can't do anything when pending
        break;
      case 'request':
        handleAcceptRequest();
        break;
      case 'none':
        handleConnect();
        break;
    }
  };
  
  const connectionButtonContent = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <>
            <UserCheck className="h-4 w-4" />
            Connected
          </>
        );
      case 'pending':
        return (
          <>
            <Clock className="h-4 w-4" />
            Request Pending
          </>
        );
      case 'request':
        return (
          <>
            <UserPlus className="h-4 w-4" />
            Accept Request
          </>
        );
      default:
        return (
          <>
            <UserPlus className="h-4 w-4" />
            Connect
          </>
        );
    }
  };
  
  // Function to handle navigating back to the traders search page
  const handleGoBack = () => {
    router.push('/dashboard/traders');
  };
  
  if (loading) {
    return (
      <div className="container max-w-screen-xl py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 md:col-span-2" />
        </div>
      </div>
    );
  }
  
  if (!trader) {
    return (
      <div className="container max-w-screen-xl py-6">
        <Card>
          <CardHeader>
            <CardTitle>Trader not found</CardTitle>
            <CardDescription>
              The trader profile you're looking for doesn't exist or is private.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/dashboard/traders')}>
              Back to Traders
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-screen-xl py-6 space-y-6">
      {/* Back button */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center text-muted-foreground hover:text-foreground"
          onClick={handleGoBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Traders
        </Button>
      </div>

      {/* Profile Header */}
      <Card className="border-none shadow-md overflow-hidden">
        <CardHeader className="relative pb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={trader.photoURL} alt={trader.displayName} />
                <AvatarFallback className="text-2xl bg-primary/20">{trader.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-3xl flex items-center gap-2">
                  {trader.displayName}
                  {trader.followers?.length > 50 && (
                    <Badge className="ml-2 bg-blue-500 hover:bg-blue-600">Popular Trader</Badge>
                  )}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="font-normal">
                    {trader.tradingStyle || 'Trader'}
                  </Badge>
                  <Badge variant="outline" className="font-normal">
                    {trader.experience || 'Experience not specified'}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">Joined {trader.joinedAt ? new Date(trader.joinedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{trader.followers?.length || 0} followers</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    <span className="text-sm">{trader.tradeStats?.totalTrades || 0} trades</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <div className="px-6 py-4 bg-muted/30 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="font-bold text-xl text-green-600">{Number(trader.tradeStats?.winRate || 0).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Profit Factor</div>
              <div className="font-bold text-xl">{Number(trader.tradeStats?.profitFactor || 0).toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Trades</div>
              <div className="font-bold text-xl">{trader.tradeStats?.totalTrades || 0}</div>
            </div>
          </div>
          
          {isCurrentUser ? null : (
            <div className="w-full sm:w-auto mt-4 sm:mt-0 flex gap-2">
              <Button 
                className="flex-1 sm:flex-initial items-center justify-center gap-2"
                onClick={handleToggleConnection}
                disabled={connectionStatus === 'pending' || isCurrentUser}
              >
                {connectionButtonContent()}
              </Button>
              
              {connectionStatus === 'connected' && (
                <Button 
                  variant="outline" 
                  className="flex-1 sm:flex-initial items-center justify-center gap-2"
                  onClick={() => router.push(`/dashboard/messages?contact=${traderId}`)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Trader Info Card */}
      <Card className="border-none shadow-md">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-3 gap-0 md:gap-6">
            {/* Trader's About Section - Left sidebar */}
            <div className="border-b md:border-b-0 md:border-r border-border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                About
              </h3>
              <p className="text-muted-foreground mb-6">{trader.bio || 'No bio available'}</p>
              
              {/* Trading Concepts */}
              {((trader.tradingPlan?.concepts && trader.tradingPlan.concepts.length > 0) || 
                (trader.tradingConcepts && trader.tradingConcepts.length > 0) ||
                typeof trader.tradingConcept === 'string') && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-sm uppercase tracking-wider text-muted-foreground">Trading Concepts</h4>
                  <div className="flex flex-wrap gap-2">
                    {trader.tradingConcepts?.map((concept, i) => (
                      <Badge key={`concept-${i}`} variant="secondary" className="px-3 py-1">
                        {concept}
                      </Badge>
                    ))}
                    {!trader.tradingConcepts && trader.tradingPlan?.concepts?.map((concept, i) => (
                      <Badge key={`plan-${i}`} variant="secondary" className="px-3 py-1">
                        {concept}
                      </Badge>
                    ))}
                    {!trader.tradingConcepts && typeof trader.tradingConcept === 'string' && (
                      <Badge key="single-concept" variant="secondary" className="px-3 py-1">
                        {trader.tradingConcept}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Entry Rules */}
              {(trader.tradingPlan?.entryRules?.length > 0 || trader.entryRules?.length > 0 || typeof trader.entryRule === 'string') && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <ArrowDownUp className="h-4 w-4" />
                    Entry Rules
                  </h4>
                  <ul className="space-y-2">
                    {trader.entryRules?.map((rule, i) => (
                      <li key={`rule-${i}`} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                        <span className="text-sm">{rule}</span>
                      </li>
                    ))}
                    {!trader.entryRules && trader.tradingPlan?.entryRules?.map((rule, i) => (
                      <li key={`plan-${i}`} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                        <span className="text-sm">{rule}</span>
                      </li>
                    ))}
                    {!trader.entryRules && typeof trader.entryRule === 'string' && (
                      <li key="single-rule" className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                        <span className="text-sm">{trader.entryRule}</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              {/* Risk Management */}
              <div className="mb-2">
                <h4 className="font-medium mb-3 text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Risk Management
                </h4>
                {trader.tradingPlan?.riskManagement ? (
                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Risk per trade</span>
                      <Badge variant="outline">{trader.tradingPlan.riskManagement.riskPerTrade || trader.tradingPlan.riskManagement.riskPercentage || trader.riskPerTrade || 0}%</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Max daily loss</span>
                      <Badge variant="outline">{trader.tradingPlan.riskManagement.maxDailyLoss || trader.maxDailyLoss || 0}%</Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Max weekly loss</span>
                      <Badge variant="outline">{trader.tradingPlan.riskManagement.maxWeeklyLoss || trader.maxWeeklyLoss || 0}%</Badge>
                    </div>
                  </div>
                ) : trader.riskManagement && trader.riskManagement.length > 0 ? (
                  <ul className="space-y-2">
                    {trader.riskManagement.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-500 mt-1 shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Risk per trade</span>
                      <Badge variant="outline">{trader.riskPerTrade || 0}%</Badge>
                    </div>
                    {trader.maxDailyLoss && (
                      <>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Max daily loss</span>
                          <Badge variant="outline">{trader.maxDailyLoss}%</Badge>
                        </div>
                      </>
                    )}
                    {trader.maxWeeklyLoss && (
                      <>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Max weekly loss</span>
                          <Badge variant="outline">{trader.maxWeeklyLoss}%</Badge>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Main Content - Tabs */}
            <div className="md:col-span-2 pb-4 md:pb-0">
              <Tabs defaultValue="posts" className="w-full">
                <div className="px-4 pt-4 pb-2 md:px-6">
                  <TabsList className="grid w-full grid-cols-5 h-auto">
                    <TabsTrigger value="posts" className="text-xs sm:text-sm py-2">Overview</TabsTrigger>
                    <TabsTrigger value="stats" className="text-xs sm:text-sm py-2">Trading Stats</TabsTrigger>
                    <TabsTrigger value="instruments" className="text-xs sm:text-sm py-2">Instruments</TabsTrigger>
                    <TabsTrigger value="experience" className="text-xs sm:text-sm py-2">Experience</TabsTrigger>
                    <TabsTrigger value="performance" className="text-xs sm:text-sm py-2">Performance</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="posts" className="px-4 md:px-6 space-y-6 mt-2">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                    
                      {/* Quick Stats for Overview */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 flex flex-col justify-center items-center text-center">
                          <span className="text-xs text-muted-foreground mb-1">Win Rate</span>
                          <span className="text-lg font-bold text-green-600">
                            {!isNaN(Number(trader.tradeStats?.winRate)) ? Number(trader.tradeStats?.winRate).toFixed(1) : '0.0'}%
                          </span>
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 flex flex-col justify-center items-center text-center">
                          <span className="text-xs text-muted-foreground mb-1">P&L</span>
                          <span className="text-lg font-bold text-blue-600">
                            ${trader.tradeStats ? ((trader.tradeStats.expectancy || 0) * (trader.tradeStats.totalTrades || 0)).toFixed(2) : '0.00'}
                          </span>
                        </div>
                        
                        <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 flex flex-col justify-center items-center text-center">
                          <span className="text-xs text-muted-foreground mb-1">Instruments</span>
                          <span className="text-lg font-bold text-purple-600">
                            {trader.instruments?.length || 0}
                          </span>
                        </div>
                      </div>
                      
                      {trader.instruments && trader.instruments.length > 0 && (
                        <Card className="border-none shadow-sm">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-primary/60" /> 
                              Top Instruments
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {trader.instruments.slice(0, 3).map((instrument, i) => (
                                <div key={i} className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 p-2 rounded-full">
                                      {getInstrumentIcon(instrument.name)}
                                    </div>
                                    <div>
                                      <div className="font-medium">{instrument.name}</div>
                                      <div className="text-xs text-muted-foreground">{instrument.trades} trades · {instrument.winRate.toFixed(1)}% win rate</div>
                                    </div>
                                  </div>
                                  <div className={instrument.pnl >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                    ${instrument.pnl.toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    
                    <div>
                      <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Link className="h-5 w-5 text-primary/60" /> 
                            Connect
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {!isCurrentUser && (
                              <Button 
                                className="w-full flex items-center justify-center gap-2"
                                onClick={handleToggleConnection}
                                disabled={connectionStatus === 'pending' || isCurrentUser}
                              >
                                {connectionButtonContent()}
                              </Button>
                            )}
                            
                            {connectionStatus === 'connected' && (
                              <Button 
                                variant="outline" 
                                className="w-full flex items-center justify-center gap-2"
                                onClick={() => router.push(`/dashboard/messages?contact=${traderId}`)}
                              >
                                <MessageSquare className="h-4 w-4" />
                                Message
                              </Button>
                            )}
                            
                            {(trader.socialLinks && Object.values(trader.socialLinks).some(link => !!link)) || 
                              trader.twitterHandle || trader.instagramHandle || trader.tradingViewUsername || 
                              trader.discordHandle || trader.website ? (
                              <div className="pt-3 border-t">
                                <h4 className="text-sm font-medium mb-2">Social Links</h4>
                                <div className="flex flex-wrap gap-2">
                                  {(trader.socialLinks && trader.socialLinks.twitter) && (
                                    <a href={trader.socialLinks.twitter.startsWith('http') ? trader.socialLinks.twitter : `https://${trader.socialLinks.twitter}`} 
                                       target="_blank" rel="noopener noreferrer" 
                                       className="p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                      <Twitter className="h-5 w-5 text-blue-400" />
                                    </a>
                                  )}
                                  {trader.twitterHandle && !trader.socialLinks?.twitter && (
                                    <a href={trader.twitterHandle.startsWith('http') ? trader.twitterHandle : `https://twitter.com/${trader.twitterHandle}`} 
                                       target="_blank" rel="noopener noreferrer" 
                                       className="p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                      <Twitter className="h-5 w-5 text-blue-400" />
                                    </a>
                                  )}
                                  
                                  {(trader.socialLinks && trader.socialLinks.linkedin) && (
                                    <a href={trader.socialLinks.linkedin.startsWith('http') ? trader.socialLinks.linkedin : `https://${trader.socialLinks.linkedin}`} 
                                       target="_blank" rel="noopener noreferrer" 
                                       className="p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                      <Linkedin className="h-5 w-5 text-blue-600" />
                                    </a>
                                  )}
                                  
                                  {(trader.socialLinks && trader.socialLinks.github) && (
                                    <a href={trader.socialLinks.github.startsWith('http') ? trader.socialLinks.github : `https://${trader.socialLinks.github}`} 
                                       target="_blank" rel="noopener noreferrer" 
                                       className="p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                      <Github className="h-5 w-5" />
                                    </a>
                                  )}
                                  
                                  {trader.tradingViewUsername && (
                                    <a href={`https://www.tradingview.com/u/${trader.tradingViewUsername}/`} 
                                       target="_blank" rel="noopener noreferrer" 
                                       className="p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                      <LineChart className="h-5 w-5 text-blue-500" />
                                    </a>
                                  )}
                                  
                                  {(trader.socialLinks && trader.socialLinks.website) && (
                                    <a href={trader.socialLinks.website.startsWith('http') ? trader.socialLinks.website : `https://${trader.socialLinks.website}`} 
                                       target="_blank" rel="noopener noreferrer" 
                                       className="p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                      <Globe className="h-5 w-5 text-green-500" />
                                    </a>
                                  )}
                                  {trader.website && !trader.socialLinks?.website && (
                                    <a href={trader.website.startsWith('http') ? trader.website : `https://${trader.website}`} 
                                       target="_blank" rel="noopener noreferrer" 
                                       className="p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                      <Globe className="h-5 w-5 text-green-500" />
                                    </a>
                                  )}
                                  
                                  {trader.instagramHandle && (
                                    <a href={trader.instagramHandle.startsWith('http') ? trader.instagramHandle : `https://instagram.com/${trader.instagramHandle}`} 
                                       target="_blank" rel="noopener noreferrer" 
                                       className="p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                      <Instagram className="h-5 w-5 text-pink-500" />
                                    </a>
                                  )}
                                  
                                  {trader.discordHandle && (
                                    <a href="#" onClick={(e) => {
                                      e.preventDefault();
                                      navigator.clipboard.writeText(trader.discordHandle as string);
                                      toast({
                                        title: "Discord handle copied",
                                        description: `${trader.discordHandle} copied to clipboard`
                                      });
                                    }}
                                       className="p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                                      <MessageSquare className="h-5 w-5 text-indigo-500" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="pt-3 border-t">
                                <p className="text-sm text-muted-foreground text-center">No social links available</p>
                              </div>
                            )}
                            
                            <div className="pt-3 border-t">
                              <div className="text-xs text-muted-foreground flex justify-between">
                                <span>Member since</span>
                                <span>{trader.joinedAt ? formatDistanceToNow(new Date(trader.joinedAt), { addSuffix: true }) : 'Unknown'}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="stats" className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="overflow-hidden border-none shadow-sm">
                      <CardHeader className="bg-green-50 dark:bg-green-950/30 p-4 pb-2">
                        <CardDescription>Win Rate</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="text-2xl font-bold text-green-600">
                          {!isNaN(Number(trader.tradeStats?.winRate)) ? Number(trader.tradeStats?.winRate).toFixed(1) : '0.0'}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {!isNaN(Number(trader.tradeStats?.winningTrades)) ? trader.tradeStats?.winningTrades : 0} of {!isNaN(Number(trader.tradeStats?.totalTrades)) ? trader.tradeStats?.totalTrades : 0} trades
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="overflow-hidden border-none shadow-sm">
                      <CardHeader className="bg-blue-50 dark:bg-blue-950/30 p-4 pb-2">
                        <CardDescription>Profit Factor</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="text-2xl font-bold text-blue-600">
                          {!isNaN(Number(trader.tradeStats?.profitFactor)) ? Number(trader.tradeStats?.profitFactor).toFixed(2) : '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ratio of profits to losses
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="overflow-hidden border-none shadow-sm">
                      <CardHeader className="bg-emerald-50 dark:bg-emerald-950/30 p-4 pb-2">
                        <CardDescription>Avg Win</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="text-2xl font-bold text-emerald-600">
                          ${!isNaN(Number(trader.tradeStats?.averageWin)) ? Number(trader.tradeStats?.averageWin).toFixed(2) : '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Average winning trade
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="overflow-hidden border-none shadow-sm">
                      <CardHeader className="bg-red-50 dark:bg-red-950/30 p-4 pb-2">
                        <CardDescription>Avg Loss</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <div className="text-2xl font-bold text-red-600">
                          ${!isNaN(Number(trader.tradeStats?.averageLoss)) ? Number(trader.tradeStats?.averageLoss).toFixed(2) : '0.00'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Average losing trade
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary/60" /> 
                          Trade Metrics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Total Trades</span>
                            <span className="font-medium">{!isNaN(Number(trader.tradeStats?.totalTrades)) ? trader.tradeStats?.totalTrades : 0}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Winning Trades</span>
                            <span className="font-medium text-green-600">{!isNaN(Number(trader.tradeStats?.winningTrades)) ? trader.tradeStats?.winningTrades : 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Losing Trades</span>
                            <span className="font-medium text-red-600">{!isNaN(Number(trader.tradeStats?.losingTrades)) ? trader.tradeStats?.losingTrades : 0}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Expectancy</span>
                            <span className="font-medium">${!isNaN(Number(trader.tradeStats?.expectancy)) ? Number(trader.tradeStats?.expectancy).toFixed(2) : '0.00'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Risk/Reward Ratio</span>
                            <span className="font-medium">
                              {trader.tradeStats?.averageLoss && !isNaN(Number(trader.tradeStats?.averageLoss)) && Number(trader.tradeStats?.averageLoss) !== 0
                                ? (Number(trader.tradeStats?.averageWin) / Math.abs(Number(trader.tradeStats?.averageLoss))).toFixed(2) 
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-none shadow-sm overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary/60" /> 
                          Win/Loss Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 h-[250px] flex items-center justify-center">
                        <div className="text-center">
                          {trader.tradeStats && !isNaN(Number(trader.tradeStats?.totalTrades)) && trader.tradeStats?.totalTrades > 0 ? (
                            <div className="space-y-4">
                              <div className="flex justify-center gap-8">
                                <div>
                                  <h3 className="text-lg font-medium text-green-600">Winning Trades</h3>
                                  <p className="text-3xl">{trader.tradeStats.winningTrades || 0}</p>
                                </div>
                                <div>
                                  <h3 className="text-lg font-medium text-red-600">Losing Trades</h3>
                                  <p className="text-3xl">{trader.tradeStats.losingTrades || 0}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              <p>No trade data available</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="instruments" className="pt-4">
                  <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary/60" /> 
                        Trading Instruments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {trader.instruments && trader.instruments.length > 0 ? (
                        <div className="grid gap-3">
                          {trader.instruments.map((instrument, i) => (
                            <div key={i} className="p-3 bg-secondary/40 rounded-lg hover:bg-secondary/60 transition-colors">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium flex items-center">
                                    <span className="mr-2">{getInstrumentIcon(instrument.name)}</span>
                                    {instrument.name}
                                    <Badge variant="outline" className="ml-2 text-xs font-normal">
                                      {instrument.trades} trades
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    Win Rate: {Number(instrument.winRate).toFixed(1)}%
                                  </div>
                                </div>
                                <div className={`text-right font-medium ${Number(instrument.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ${Number(instrument.pnl).toFixed(2)}
                                </div>
                              </div>
                              
                              <div className="mt-2 w-full bg-muted/50 h-2 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${Number(instrument.pnl) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(Math.abs(Number(instrument.winRate)), 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-20" />
                          <p>No instruments shared by this trader</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {trader.instruments && trader.instruments.length > 0 && (
                    <Card className="border-none shadow-sm overflow-hidden mt-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-primary/60" />
                          Instrument Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <div className="flex h-full items-center justify-center">
                          {trader.instruments && trader.instruments.length > 0 ? (
                            <div className="w-full space-y-3">
                              {trader.instruments.slice(0, 8).map((instrument, i) => (
                                <div key={i} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                                  <span>{instrument.name}</span>
                                  <span className={Number(instrument.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    ${Number(instrument.pnl).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <p>No instrument performance data available</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="experience" className="pt-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-none shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-primary/60" /> 
                          Trading Approach
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {((trader.tradingConcepts && trader.tradingConcepts.length > 0) || typeof trader.tradingConcept === 'string') ? (
                            <div>
                              <h4 className="font-medium mb-2">Concepts</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {trader.tradingConcepts?.map((concept, index) => (
                                  <li key={index} className="text-muted-foreground">{concept}</li>
                                ))}
                                {typeof trader.tradingConcept === 'string' && !trader.tradingConcepts && (
                                  <li className="text-muted-foreground">{trader.tradingConcept}</li>
                                )}
                              </ul>
                            </div>
                          ) : (
                            <div className="text-muted-foreground italic">No trading concepts shared</div>
                          )}
                          
                          {trader.bio && (
                            <div>
                              <h4 className="font-medium mb-2">Biography</h4>
                              <p className="text-sm text-muted-foreground">{trader.bio}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="space-y-6">
                      <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <ArrowDownUp className="h-5 w-5 text-primary/60" /> 
                            Entry Rules
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {trader.entryRules && trader.entryRules.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {trader.entryRules.map((rule, index) => (
                                <li key={index} className="text-muted-foreground">{rule}</li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-muted-foreground italic">No entry rules shared</div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-primary/60" /> 
                            Risk Management
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {trader.riskManagement && trader.riskManagement.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1">
                              {trader.riskManagement.map((rule, index) => (
                                <li key={index} className="text-muted-foreground">{rule}</li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-muted-foreground italic">No risk management details shared</div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="performance" className="pt-4">
                  <div className="space-y-6">
                    <Card className="border-none shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <LineChartIcon className="h-5 w-5 text-primary/60" /> 
                          Monthly Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-80">
                        <div className="flex h-full items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <p className="mb-2 font-medium">Performance Summary</p>
                            {trader.tradeStats ? (
                              <div className="space-y-2">
                                <p>Total Profit/Loss: ${trader.tradeStats.expectancy > 0 ? '+' : ''}${(trader.tradeStats.expectancy * trader.tradeStats.totalTrades).toFixed(2)}</p>
                                <p>Trades: {trader.tradeStats.totalTrades || 0}</p>
                                <p>Win Rate: {trader.tradeStats?.winRate?.toFixed(1) || 0}%</p>
                              </div>
                            ) : (
                              <p>No performance data available</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary/60" /> 
                            Win Rate Over Time
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="h-60">
                          <div className="flex h-full items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <p>Monthly win rate displayed as text</p>
                              {trader.tradeStats ? (
                                <p className="text-xl mt-2">Current win rate: {trader.tradeStats.winRate?.toFixed(1) || 0}%</p>
                              ) : (
                                <p>No win rate data available</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary/60" /> 
                            Monthly Trade Volume
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="h-60">
                          <div className="flex h-full items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <p>Monthly trade volume displayed as text</p>
                              {trader.tradeStats ? (
                                <p className="text-xl mt-2">Total trades: {trader.tradeStats.totalTrades || 0}</p>
                              ) : (
                                <p>No trade volume data available</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 