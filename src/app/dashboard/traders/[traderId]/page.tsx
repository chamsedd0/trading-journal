'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, addDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, TrendingUp, TrendingDown, BarChart, Clock, Award, UserPlus, MessageSquare, Check } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TraderProfile {
  uid: string;
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
  photoURL: string;
  isPublicProfile: boolean;
  showPnL: boolean;
  showTradingStats: boolean;
}

interface TradeStats {
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  netPnL: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  winningStreak: number;
  losingStreak: number;
}

interface Trade {
  id: string;
  date: {
    seconds: number;
    nanoseconds: number;
  };
  symbol: string;
  type: 'long' | 'short';
  entry: number;
  exit: number;
  size: number;
  pnl: number;
}

export default function TraderProfilePage() {
  const { traderId } = useParams();
  const router = useRouter();
  const { user, updateConnectionState } = useAuth();
  const [trader, setTrader] = useState<TraderProfile | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Check connection status
  const isConnected = user?.profile?.connections?.includes(traderId as string);
  const hasPendingRequest = user?.profile?.outgoingRequests?.includes(traderId as string);
  
  useEffect(() => {
    const fetchTraderProfile = async () => {
      if (!traderId) return;
      
      try {
        setLoading(true);
        
        // Get trader profile
        const traderDoc = await getDoc(doc(db, 'users', traderId as string));
        
        if (!traderDoc.exists()) {
          toast.error('Trader not found');
          router.push('/dashboard/traders/find');
          return;
        }
        
        const traderData = traderDoc.data();
        
        // Check if profile is public
        if (!traderData.isPublicProfile) {
          toast.error('This trader profile is private');
          router.push('/dashboard/traders/find');
          return;
        }
        
        // Set trader profile
        setTrader({
          uid: traderDoc.id,
          displayName: traderData.displayName || 'Unnamed Trader',
          email: traderData.email || '',
          bio: traderData.bio || '',
          location: traderData.location || '',
          experience: traderData.experience || '',
          website: traderData.website || '',
          tradingStyle: traderData.tradingStyle || '',
          riskTolerance: traderData.riskTolerance || '',
          timeZone: traderData.timeZone || '',
          preferredMarkets: traderData.preferredMarkets || [],
          photoURL: traderData.photoURL || '',
          isPublicProfile: traderData.isPublicProfile || false,
          showPnL: traderData.showPnL !== false, // default true
          showTradingStats: traderData.showTradingStats !== false, // default true
        });
        
        // Only proceed to fetch trades/stats if allowed by user's privacy settings
        if (traderData.showTradingStats) {
          await fetchTradeHistory(traderId as string);
        }
      } catch (error) {
        console.error('Error fetching trader profile:', error);
        toast.error('Failed to load trader profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTraderProfile();
  }, [traderId, router]);
  
  const fetchTradeHistory = async (traderId: string) => {
    try {
      // Get all accounts for this trader
      const userDoc = await getDoc(doc(db, 'users', traderId));
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data();
      const userAccounts = userData.accounts || [];
      
      // Collect all trades from all accounts
      const allTrades: Trade[] = [];
      
      if (userAccounts.length > 0) {
        for (const account of userAccounts) {
          if (account.trades && Array.isArray(account.trades)) {
            const accountTrades = account.trades.map((trade: any) => ({
              ...trade,
              accountName: account.name
            }));
            allTrades.push(...accountTrades);
          }
        }
        
        // Sort by date (newest first)
        allTrades.sort((a, b) => {
          return (b.date?.seconds || 0) - (a.date?.seconds || 0);
        });
        
        setTrades(allTrades);
        
        // Calculate statistics if we have trades
        if (allTrades.length > 0) {
          calculateTradeStats(allTrades);
        }
      }
    } catch (error) {
      console.error('Error fetching trade history:', error);
    }
  };
  
  const calculateTradeStats = (trades: Trade[]) => {
    const totalTrades = trades.length;
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    const losingTrades = trades.filter(trade => trade.pnl < 0);
    
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    
    const totalWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnl, 0));
    
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
    const netPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    
    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;
    
    // Calculate streaks
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let currentLoseStreak = 0;
    let maxLoseStreak = 0;
    
    // Sort by date ascending for streak calculation
    const chronologicalTrades = [...trades].sort((a, b) => 
      (a.date?.seconds || 0) - (b.date?.seconds || 0)
    );
    
    chronologicalTrades.forEach(trade => {
      if (trade.pnl > 0) {
        // Winning trade
        currentWinStreak++;
        currentLoseStreak = 0;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else if (trade.pnl < 0) {
        // Losing trade
        currentLoseStreak++;
        currentWinStreak = 0;
        maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak);
      } else {
        // Break even trade, doesn't affect streaks
        currentWinStreak = 0;
        currentLoseStreak = 0;
      }
    });
    
    setStats({
      winRate,
      profitFactor,
      totalTrades,
      netPnL,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss: Math.abs(largestLoss),
      winningStreak: maxWinStreak,
      losingStreak: maxLoseStreak
    });
  };
  
  const sendConnectionRequest = async () => {
    if (!user || !trader) return;
    
    try {
      setProcessing(true);
      
      // Get current connection state
      const currentOutgoingRequests = user.profile?.outgoingRequests || [];
      
      // Add to outgoing requests for current user
      await updateDoc(doc(db, 'users', user.uid), {
        outgoingRequests: arrayUnion(trader.uid)
      });
      
      // Add to pending connections for other user
      await updateDoc(doc(db, 'users', trader.uid), {
        pendingConnections: arrayUnion(user.uid),
        hasUnreadNotifications: true
      });
      
      // Create notification for the recipient
      const notificationRef = collection(db, 'users', trader.uid, 'notifications');
      await addDoc(notificationRef, {
        type: 'connection_request',
        fromUserId: user.uid,
        fromUserName: user.profile?.fullName || user.displayName || 'A trader',
        fromUserPhoto: user.photoURL || '',
        read: false,
        createdAt: Timestamp.now()
      });
      
      // Update auth context
      updateConnectionState({
        outgoingRequests: [...currentOutgoingRequests, trader.uid]
      });
      
      toast.success('Connection request sent');
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    } finally {
      setProcessing(false);
    }
  };
  
  if (loading) {
    return <div className="p-6 text-center">Loading trader profile...</div>;
  }
  
  if (!trader) {
    return <div className="p-6 text-center">Trader not found</div>;
  }
  
  return (
    <div className="space-y-8">
      {/* Header with back button */}
      <div className="flex items-center gap-3 pb-2 border-b">
        <Button variant="ghost" size="icon" asChild className="hover:bg-primary/10">
          <Link href="/dashboard/traders/find">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Trader Profile</h1>
      </div>
      
      {/* Trader info card */}
      <Card className="overflow-hidden border-none shadow-md">
        <CardContent className="p-0">
          {/* Banner area with gradient background */}
          <div className="py-4 px-8">
            <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
              {/* Avatar */}
              <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                <AvatarImage src={trader.photoURL} alt={trader.displayName} />
                <AvatarFallback className="text-2xl font-bold bg-primary/20">
                  {trader.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              {/* Trader details */}
              <div className="space-y-3 flex-1">
                <h2 className="text-2xl font-bold flex flex-wrap items-center gap-2">
                  {trader.displayName}
                  {trader.tradingStyle && (
                    <Badge variant="outline" className="ml-2 font-medium">
                      {trader.tradingStyle}
                    </Badge>
                  )}
                </h2>
                
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {trader.location && (
                    <div className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-full shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {trader.location}
                    </div>
                  )}
                  
                  {trader.experience && (
                    <div className="flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-full shadow-sm">
                      <Clock className="h-3.5 w-3.5" />
                      {trader.experience} Experience
                    </div>
                  )}
                </div>
                
                {/* Markets */}
                {trader.preferredMarkets && trader.preferredMarkets.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {trader.preferredMarkets.map(market => (
                      <Badge key={market} variant="secondary" className="text-xs font-medium px-2.5 py-1 shadow-sm">
                        {market}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Bio */}
                {trader.bio && (
                  <p className="text-sm text-muted-foreground mt-3 max-w-2xl bg-background/50 p-3 rounded-lg">
                    {trader.bio}
                  </p>
                )}
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3 mt-4 sm:mt-0">
                {isConnected ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="shadow-md hover:shadow-lg transition-all rounded-md h-9 w-9"
                          onClick={async () => {
                            if (!user) return;
                            
                            try {
                              // Check if thread already exists
                              const threadQuery = query(
                                collection(db, 'messageThreads'),
                                where('participants', 'array-contains', user.uid)
                              );
                              
                              const snapshot = await getDocs(threadQuery);
                              let existingThreadId: string | null = null;
                              
                              snapshot.forEach(doc => {
                                const data = doc.data();
                                if (data.participants.includes(trader.uid)) {
                                  existingThreadId = doc.id;
                                }
                              });
                              
                              if (existingThreadId) {
                                router.push(`/dashboard/messages/${existingThreadId}`);
                                return;
                              }
                              
                              // Create a new message thread
                              const threadRef = await addDoc(collection(db, 'messageThreads'), {
                                participants: [user.uid, trader.uid],
                                createdAt: Timestamp.now(),
                                updatedAt: Timestamp.now(),
                                lastMessage: 'No messages yet',
                              });
                              
                              // Navigate to the new chat
                              router.push(`/dashboard/messages/${threadRef.id}`);
                            } catch (error) {
                              console.error('Error starting chat:', error);
                              toast.error('Failed to start conversation');
                            }
                          }}
                        >
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Send a message</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : hasPendingRequest ? (
                  <Button size="icon" variant="outline" className="shadow-md hover:shadow-lg transition-all rounded-md h-9 w-9" disabled>
                    <Check className="h-4 w-4 text-primary" />
                  </Button>
                ) : (
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={sendConnectionRequest}
                    disabled={processing}
                    className="shadow-md hover:shadow-lg transition-all rounded-md h-9 w-9"
                  >
                    <UserPlus className="h-4 w-4 text-primary" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs for Statistics and Trade History */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-background/90 p-1 w-full sm:w-auto">
          <TabsTrigger value="overview" className="text-sm font-medium px-5">Overview</TabsTrigger>
          <TabsTrigger value="trades" className="text-sm font-medium px-5">Trade History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {trader.showTradingStats && stats ? (
            <>
              {/* Performance metrics grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Win Rate */}
                <Card className="border-none shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                        <h3 className="text-2xl font-semibold">
                          {stats.winRate.toFixed(1)}%
                        </h3>
                      </div>
                      <div className="bg-primary/15 p-2.5 rounded-full shadow-sm">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    
                    <div className="w-full bg-muted/50 rounded-full h-1.5 mt-3">
                      <div 
                        className="bg-primary h-1.5 rounded-full" 
                        style={{ width: `${Math.min(stats.winRate, 100)}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Total Trades */}
                <Card className="border-none shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Total Trades</p>
                        <h3 className="text-2xl font-semibold">
                          {stats.totalTrades}
                        </h3>
                      </div>
                      <div className="bg-primary/15 p-2.5 rounded-full shadow-sm">
                        <BarChart className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Profit Factor */}
                <Card className="border-none shadow-md hover:shadow-lg transition-all">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Profit Factor</p>
                        <h3 className="text-2xl font-semibold">
                          {isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          (Winners ÷ Losers)
                        </p>
                      </div>
                      <div className="bg-primary/15 p-2.5 rounded-full shadow-sm">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Net P/L */}
                {trader.showPnL && (
                  <Card className="border-none shadow-md hover:shadow-lg transition-all">
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Net P/L</p>
                          <h3 className={`text-2xl font-semibold ${stats.netPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stats.netPnL >= 0 ? '+' : ''}{stats.netPnL.toFixed(2)}
                          </h3>
                        </div>
                        <div className={`p-2.5 rounded-full shadow-sm ${stats.netPnL >= 0 ? 'bg-green-500/15' : 'bg-red-500/15'}`}>
                          {stats.netPnL >= 0 ? 
                            <TrendingUp className="h-5 w-5 text-green-500" /> : 
                            <TrendingDown className="h-5 w-5 text-red-500" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Additional stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Winning Trades Card */}
                <Card className="border-none shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                      Winning Trades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2 bg-green-500/5 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Average Win</p>
                      <p className="text-sm font-medium text-green-500">
                        +{stats.averageWin.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-2 bg-green-500/5 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Largest Win</p>
                      <p className="text-sm font-medium text-green-500">
                        +{stats.largestWin.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-2 bg-green-500/5 p-3 rounded-lg col-span-2 md:col-span-1">
                      <p className="text-xs text-muted-foreground">Winning Streak</p>
                      <p className="text-sm font-medium flex items-center">
                        <Award className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                        {stats.winningStreak}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Losing Trades Card */}
                <Card className="border-none shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                      Losing Trades
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-6 pt-2">
                    <div className="space-y-2 bg-red-500/5 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Average Loss</p>
                      <p className="text-sm font-medium text-red-500">
                        -{stats.averageLoss.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-2 bg-red-500/5 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Largest Loss</p>
                      <p className="text-sm font-medium text-red-500">
                        -{stats.largestLoss.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-2 bg-red-500/5 p-3 rounded-lg col-span-2 md:col-span-1">
                      <p className="text-xs text-muted-foreground">Losing Streak</p>
                      <p className="text-sm font-medium flex items-center">
                        <TrendingDown className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                        {stats.losingStreak}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card className="border-none shadow-md">
              <CardContent className="p-8 text-center">
                <div className="rounded-full bg-muted/50 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <BarChart className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {trader.showTradingStats 
                    ? "No trading statistics available for this trader."
                    : "This trader has chosen to keep their trading statistics private."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="trades" className="space-y-4">
          {trader.showTradingStats && trades.length > 0 ? (
            <Card className="border-none shadow-md">
              <CardHeader className="pb-3 border-b">
                <CardTitle>Recent Trades</CardTitle>
                <CardDescription>
                  Showing the {Math.min(trades.length, 25)} most recent trades
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3">
                <div className="overflow-x-auto rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="text-left bg-muted/20">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Symbol</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Entry</th>
                        <th className="px-4 py-3 font-medium">Exit</th>
                        <th className="px-4 py-3 font-medium">Size</th>
                        {trader.showPnL && (
                          <th className="px-4 py-3 font-medium text-right">P/L</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, 25).map((trade, index) => (
                        <tr 
                          key={trade.id} 
                          className="border-b border-border hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(trade.date.seconds * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              trade.type === 'long' 
                                ? 'bg-[#089981]/15 text-[#089981]' 
                                : 'bg-[#f23645]/15 text-[#f23645]'
                            }`}>
                              {trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">${Number(trade.entry).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          <td className="px-4 py-3">${Number(trade.exit).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                          <td className="px-4 py-3">{Number(trade.size).toLocaleString('en-US')}</td>
                          {trader.showPnL && (
                            <td className={`px-4 py-3 text-right font-medium ${trade.pnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                              {trade.pnl >= 0 ? '+' : ''}{Number(trade.pnl).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-md">
              <CardContent className="p-8 text-center">
                <div className="rounded-full bg-muted/50 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  {trader.showTradingStats 
                    ? "No trade history available for this trader."
                    : "This trader has chosen to keep their trade history private."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
