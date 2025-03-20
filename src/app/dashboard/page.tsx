'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserData {
  broker: string;
  accountType: string;
  accountSize: number;
  setupComplete: boolean;
  accounts?: {
    id?: string;
    broker: string;
    accountType: string;
    accountSize: number;
    balance?: number;
    type: 'real' | 'demo' | 'prop';
    variant?: 'challenge' | 'live' | string;
    category?: string;
    profitTarget?: number;
    maxLossLimit?: number;
    dailyLossLimit?: number;
    timeLimit?: number;
    startDate?: number;
    trades?: {
      id?: string;
      symbol: string;
      date: {
        seconds: number;
        nanoseconds: number;
      };
      type: 'long' | 'short';
      entry: number;
      exit: number;
      size: number;
      pnl: number;
    }[];
  }[];
}

interface Trade {
  id: string;
  symbol: string;
  date: {
    seconds: number;
    nanoseconds: number;
  };
  type: 'long' | 'short';
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  accountId: string;
  accountName?: string;
}

interface TradeStats {
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  netPnL: number;
  todayPnL: number;
  totalBalance: number;
}

interface AccountStats {
  id: string;
  broker: string;
  accountType: string;
  accountSize: number;
  balance: number;
  type: 'real' | 'demo' | 'prop';
  todayPnL: number;
  totalTrades: number;
  winRate: number;
}

interface ChallengeAccount extends AccountStats {
  variant: string;
  profitTarget?: number;
  dailyLossLimit?: number;
  maxLossLimit?: number;
  maxLossType?: string;
  startDate?: number;
  timeLimit?: number;
  pnlPercentage: number;
  maxDrawdown: number;
  daysRemaining: number | null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [accountStats, setAccountStats] = useState<AccountStats[]>([]);
  const [tradeStats, setTradeStats] = useState<TradeStats>({
    winRate: 0,
    profitFactor: 0,
    totalTrades: 0,
    netPnL: 0,
    todayPnL: 0,
    totalBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [challengeAccounts, setChallengeAccounts] = useState<ChallengeAccount[]>([]);

  // Define calculation helper functions
  const calculateWinRate = (trades: any[]) => {
    if (!trades.length) return 0;
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    return (winningTrades.length / trades.length) * 100;
  };

  const calculateProfitFactor = (trades: any[]) => {
    if (!trades.length) return 0;
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    const losingTrades = trades.filter(trade => trade.pnl <= 0);
    const totalWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    const totalLosses = losingTrades.reduce((sum, trade) => sum + Math.abs(trade.pnl), 0);
    return totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  };

  const calculateTodayPnL = (trades: any[]) => {
    if (!trades.length) return 0;
    const today = new Date();
    return trades
      .filter(trade => {
        const tradeDate = new Date(trade.date.seconds * 1000);
        return tradeDate.getDate() === today.getDate() &&
               tradeDate.getMonth() === today.getMonth() &&
               tradeDate.getFullYear() === today.getFullYear();
      })
      .reduce((sum, trade) => sum + trade.pnl, 0);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        console.log("Fetching data for user:", user.uid);
        
        // Fetch user account data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData;
          console.log("User data found:", userData);
          setUserData(userData);
          
          // Extract trades from user accounts
          if (userData.accounts && userData.accounts.length > 0) {
            // Collect all trades from all accounts
            let allTrades: Trade[] = [];
            let accountStatsArray: AccountStats[] = [];
            let totalRealBalance = 0;
            let todayTotalPnL = 0;
            
            userData.accounts.forEach(account => {
              // Skip challenge accounts for total balance and PnL calculations
              const isChallenge = account.type === 'prop' && account.variant === 'challenge';
              
              // Calculate per-account statistics
              let accountTodayPnL = 0;
              let accountTotalTrades = 0;
              let accountWinningTrades = 0;
              
              if (account.trades && account.trades.length > 0) {
                // Map account trades to the common Trade format
                const accountTrades = account.trades.map(trade => {
                  // Check if the trade was made today
                  const tradeDate = new Date(trade.date.seconds * 1000);
                  const today = new Date();
                  const isToday = tradeDate.getDate() === today.getDate() &&
                                 tradeDate.getMonth() === today.getMonth() &&
                                 tradeDate.getFullYear() === today.getFullYear();
                  
                  if (isToday) {
                    accountTodayPnL += trade.pnl;
                    // Add to total today PnL if this is a real or prop account (excluding challenges)
                    if ((account.type === 'real' || account.type === 'prop') && !isChallenge) {
                      todayTotalPnL += trade.pnl;
                    }
                  }
                  
                  accountTotalTrades++;
                  if (trade.pnl > 0) accountWinningTrades++;
                  
                  return {
                    id: trade.id || crypto.randomUUID(),
                    symbol: trade.symbol || "Unknown",
                    date: trade.date || { seconds: Date.now() / 1000, nanoseconds: 0 },
                    type: trade.type || "long",
                    entry: trade.entry || 0,
                    exit: trade.exit || 0,
                    size: trade.size || 0,
                    pnl: trade.pnl || 0,
                    accountId: account.id || 'unknown',
                    accountName: account.broker
                  };
                });
                
                allTrades = [...allTrades, ...accountTrades];
              }
              
              // Track real/prop account balances for the overall total (excluding challenges)
              if ((account.type === 'real' || account.type === 'prop') && !isChallenge) {
                const accountBalance = account.balance || account.accountSize || 0;
                console.log(`Adding account to total: ${account.broker} (${account.type}), balance: ${accountBalance}, variant: ${account.variant || 'none'}`);
                totalRealBalance += accountBalance;
              } else {
                console.log(`Skipping account from total: ${account.broker} (${account.type}), variant: ${account.variant || 'none'}, isChallenge: ${isChallenge}`);
              }
              
              // Add account statistics
              accountStatsArray.push({
                id: account.id || crypto.randomUUID(),
                broker: account.broker,
                accountType: account.accountType,
                accountSize: account.accountSize,
                balance: account.balance || account.accountSize,
                type: account.type || 'demo',
                todayPnL: accountTodayPnL,
                totalTrades: accountTotalTrades,
                winRate: accountTotalTrades > 0 ? (accountWinningTrades / accountTotalTrades) * 100 : 0
              });
            });
            
            console.log(`Final totalRealBalance: ${totalRealBalance}`);
            console.log(`Real accounts summary:`, userData.accounts
              .filter(acc => (acc.type === 'real' || (acc.type === 'prop' && acc.variant !== 'challenge')))
              .map(acc => ({ 
                broker: acc.broker, 
                type: acc.type, 
                balance: acc.balance || acc.accountSize || 0,
                variant: acc.variant
              }))
            );
            
            setAccountStats(accountStatsArray);
            
            // Sort by date (newest first) and take the 5 most recent trades
            allTrades.sort((a, b) => {
              const dateA = a.date?.seconds || 0;
              const dateB = b.date?.seconds || 0;
              return dateB - dateA;
            });
            
            const recentTradesList = allTrades.slice(0, 5);
            setRecentTrades(recentTradesList);
            
            // Calculate overall stats if we have trades
            if (allTrades.length > 0) {
              // Filter out trades from challenge accounts for the PnL calculation
              const nonChallengeTrades = allTrades.filter(trade => {
                const account = userData.accounts?.find(acc => acc.id === trade.accountId);
                return !(account?.type === 'prop' && account?.variant === 'challenge');
              });
          
          const totalTrades = allTrades.length;
              const winningTrades = allTrades.filter(trade => trade.pnl > 0);
              const losingTrades = allTrades.filter(trade => trade.pnl <= 0);
          
          const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
          
              // Calculate profit factor and net PnL using only non-challenge trades
              const nonChallengeWinningTrades = nonChallengeTrades.filter(trade => trade.pnl > 0);
              const nonChallengeLosingTrades = nonChallengeTrades.filter(trade => trade.pnl <= 0);
              const totalWins = nonChallengeWinningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
              const totalLosses = nonChallengeLosingTrades.reduce((sum, trade) => sum + Math.abs(trade.pnl), 0);
              const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
              const netPnL = nonChallengeTrades.reduce((sum, trade) => sum + trade.pnl, 0);
          
          setTradeStats({
            winRate,
            profitFactor,
            totalTrades,
                netPnL,
                todayPnL: todayTotalPnL,
                totalBalance: totalRealBalance
              });
            }
          } else {
            console.log("User has accounts but no trades yet");
          }
        } else {
          console.log("No user document found");
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Error", {
          description: "Failed to load dashboard data. Please try refreshing the page."
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  useEffect(() => {
    if (!userData || !userData.accounts) return;
    
    // Process challenge accounts
    const propFirmChallenges = userData.accounts
      .filter((acc: any) => acc.category === 'propfirm' && acc.variant === 'challenge')
      .map((account: any) => {
        // Calculate current P&L percentage
        const totalPnL = account.trades?.reduce((sum: number, trade: any) => sum + (trade.pnl || 0), 0) || 0;
        const pnlPercentage = (totalPnL / account.accountSize) * 100;
        const maxDrawdown = calculateMaxDrawdown(account.trades || []);
        
        // Calculate days remaining if time limit exists
        let daysRemaining = null;
        if (account.startDate && account.timeLimit) {
          const startDate = new Date(account.startDate * 1000);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + account.timeLimit);
          const today = new Date();
          const diffTime = endDate.getTime() - today.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
        
        // Use the existing trade calculation functions from elsewhere in the file
        const winRate = calculateWinRate(account.trades || []);
        const profitFactor = calculateProfitFactor(account.trades || []);
        const todayPnL = calculateTodayPnL(account.trades || []);
        
        return {
          id: account.id,
          broker: account.broker,
          type: account.type,
          accountType: account.accountType,
          accountSize: account.accountSize,
          balance: account.balance || account.accountSize,
          totalTrades: account.trades?.length || 0,
          winRate,
          profitFactor,
          todayPnL,
          variant: account.variant,
          profitTarget: account.profitTarget,
          dailyLossLimit: account.dailyLossLimit,
          maxLossLimit: account.maxLossLimit,
          maxLossType: account.maxLossType,
          pnlPercentage,
          maxDrawdown,
          daysRemaining
        } as ChallengeAccount;
      });
    
    setChallengeAccounts(propFirmChallenges);
  }, [userData]);

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!user || isDeleting) return;
    
    try {
      setIsDeleting(true);
      
      // Get the current user document
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        toast.error("User document not found");
        return;
      }
      
      const userData = userDoc.data();
      
      // Filter out the account to be deleted
      const updatedAccounts = userData.accounts.filter((acc: any) => acc.id !== accountId);
      
      // Update the user document with the filtered accounts array
      await updateDoc(userRef, {
        accounts: updatedAccounts
      });
      
      // Update local state
      setAccountStats(prevStats => prevStats.filter(acc => acc.id !== accountId));
      
      toast.success("Account deleted successfully");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
      setAccountToDelete(null);
    }
  };

  const handleDeleteTrade = async (trade: Trade) => {
    if (!user) return;
    
    try {
      // Get the current user document to get the latest data
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        toast.error("User document not found");
        return;
      }
      
      const userData = userDoc.data();
      
      // Find the account that contains this trade
      const accountIndex = userData.accounts.findIndex((acc: any) => acc.id === trade.accountId);
      
      if (accountIndex === -1) {
        toast.error("Account not found");
        return;
      }
      
      // Create a copy of the accounts array
      const updatedAccounts = [...userData.accounts];
      
      // Filter out the trade to delete
      updatedAccounts[accountIndex].trades = updatedAccounts[accountIndex].trades.filter(
        (t: any) => t.id !== trade.id
      );
      
      // Update the user document with the modified accounts array
      await updateDoc(userRef, {
        accounts: updatedAccounts
      });
      
      // Update local state
      setRecentTrades(prevTrades => prevTrades.filter(t => t.id !== trade.id));
      
      toast.success("Trade deleted successfully");
    } catch (error) {
      console.error("Error deleting trade:", error);
      toast.error("Failed to delete trade");
    }
  };

  // Helper function to calculate max drawdown
  const calculateMaxDrawdown = (trades: any[]) => {
    if (!trades.length) return 0;
    
    // Sort trades by date
    const sortedTrades = [...trades].sort((a, b) => a.date.seconds - b.date.seconds);
    
    let maxBalance = 0;
    let maxDrawdown = 0;
    let runningBalance = 0;
    
    sortedTrades.forEach(trade => {
      runningBalance += trade.pnl || 0;
      
      if (runningBalance > maxBalance) {
        maxBalance = runningBalance;
      }
      
      const currentDrawdown = ((maxBalance - runningBalance) / maxBalance) * 100;
      if (currentDrawdown > maxDrawdown && maxBalance > 0) {
        maxDrawdown = currentDrawdown;
      }
    });
    
    return maxDrawdown;
  };

  // Add function to handle account activation
  const handleActivateAccount = async (accountId: string) => {
    if (!user) return;
    
    try {
      // Get the current user document
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        toast.error("User document not found");
        return;
      }
      
      const userData = userDoc.data();
      
      // Find the account to update
      const accountIndex = userData.accounts.findIndex((acc: any) => acc.id === accountId);
      
      if (accountIndex === -1) {
        toast.error("Account not found");
        return;
      }
      
      // Save the original account size
      const originalAccountSize = userData.accounts[accountIndex].accountSize;
      
      // Create a copy of the accounts array
      const updatedAccounts = [...userData.accounts];
      
      // Update the account: change variant to 'live', reset balance to original size, and clear trades
      updatedAccounts[accountIndex] = {
        ...updatedAccounts[accountIndex],
        variant: 'live', // Change from challenge to live
        type: 'real',    // Change from prop to real
        balance: originalAccountSize, // Reset balance to original account size
        trades: [], // Clear all trades
      };
      
      // Update the user document with the modified accounts array
      await updateDoc(userRef, {
        accounts: updatedAccounts
      });
      
      // Update local state
      // Refresh the page to reflect the changes
      window.location.reload();
      
      toast.success("Challenge passed! Account activated as a real funded account with reset balance.");
    } catch (error) {
      console.error("Error activating account:", error);
      toast.error("Failed to activate account");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        <div className="flex gap-3">
          <Link href="/dashboard/accounts/new">
            <Button variant="outline" className="shadow-sm hover:text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M8 8h8" />
                <path d="M8 12h8" />
                <path d="M8 16h4" />
              </svg>
              New Account
            </Button>
          </Link>
        <Link href="/dashboard/trades/new">
            <Button className="shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Trade
            </Button>
        </Link>
        </div>
      </div>
      
      {/* Overall Performance (Real & Prop Accounts Only) */}
      <Card className="bg-gradient-to-br from-muted/40 to-muted/60 border-muted/60 shadow-md overflow-hidden">
        <CardHeader className="pb-2 relative z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              Performance Overview
            </CardTitle>
            <div className="text-3xl font-bold">
              ${Number(tradeStats.totalBalance).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
          </div>
          <CardDescription>Real-time statistics from your trading accounts</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-1 bg-background/40 p-3 rounded-lg shadow-sm">
              <p className="text-xs text-muted-foreground">Today's P/L</p>
              <div className="flex flex-wrap items-center gap-1">
                <p className={`text-2xl font-bold ${tradeStats.todayPnL >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  {tradeStats.todayPnL >= 0 ? '+' : ''}{Number(tradeStats.todayPnL).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
                {tradeStats.todayPnL !== 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${tradeStats.todayPnL >= 0 ? 'bg-[#089981]/10 text-[#089981]' : 'bg-[#f23645]/10 text-[#f23645]'}`}>
                    {tradeStats.totalBalance > 0 
                      ? `${((tradeStats.todayPnL / tradeStats.totalBalance) * 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%` 
                      : '0%'}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1 bg-background/40 p-3 rounded-lg shadow-sm">
              <p className="text-xs text-muted-foreground">All-time P/L</p>
              <div className="flex flex-wrap items-center gap-1">
                <p className={`text-2xl font-bold ${tradeStats.netPnL >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  {tradeStats.netPnL >= 0 ? '+' : ''}{Number(tradeStats.netPnL).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
                {tradeStats.netPnL !== 0 && tradeStats.totalBalance > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${tradeStats.netPnL >= 0 ? 'bg-[#089981]/10 text-[#089981]' : 'bg-[#f23645]/10 text-[#f23645]'}`}>
                    {((tradeStats.netPnL / (tradeStats.totalBalance - tradeStats.netPnL)) * 100).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1 bg-background/40 p-3 rounded-lg shadow-sm">
              <p className="text-xs text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold text-primary-foreground flex items-center">
                {tradeStats.totalTrades}
                <span className="text-xs ml-2 text-muted-foreground font-normal">trades</span>
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background/60 rounded-lg p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-muted/40 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20v-6M6 20V10M18 20V4"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium">Win Rate</p>
                </div>
                <p className="text-lg font-bold text-primary">
                  {Number(tradeStats.winRate).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%
                </p>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-primary rounded-r-full`} 
                  style={{ width: `${Math.min(tradeStats.winRate, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-background/60 rounded-lg p-4 shadow-sm flex flex-col justify-between ">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-muted/40 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium">Profit Factor</p>
                </div>
                <p className="text-lg font-bold text-primary">
                  {Number(tradeStats.profitFactor).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-primary rounded-r-full`} 
                  style={{ width: `${Math.min(tradeStats.profitFactor * 33.3, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-background/60 rounded-lg p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center justify-between flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-muted/40 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium">Average P/L</p>
                </div>
                <p className={`text-lg font-bold ${tradeStats.netPnL / Math.max(tradeStats.totalTrades, 1) >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  ${Number(tradeStats.netPnL / Math.max(tradeStats.totalTrades, 1)).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
              </div>
              
            </div>
          </div>
          </CardContent>
        </Card>
        
      {/* Trading Accounts */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Your Trading Accounts
          </h2>
          <Link href="/dashboard/accounts/new">
            <Button variant="outline" size="sm" className="shadow-sm hover:text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Add Account
            </Button>
          </Link>
        </div>
        
        {/* Filter out challenge accounts from consideration for the empty state */}
        {accountStats.filter(account => !(account.type === 'prop' && userData?.accounts?.find(a => a.id === account.id) && (userData?.accounts?.find(a => a.id === account.id) as any)?.variant === 'challenge')).length === 0 ? (
        <Card className="border-dashed shadow-sm">
            <CardContent className="py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <p className="text-muted-foreground mb-4">You don't have any trading accounts set up yet.</p>
              <Link href="/dashboard/accounts/new">
                  <Button className="shadow-sm hover:text-primary">Add Your First Account</Button>
              </Link>
          </CardContent>
        </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {accountStats
              // Filter out challenge accounts that are already shown in the challenge section
              .filter(account => !(account.type === 'prop' && userData?.accounts?.find(a => a.id === account.id) && (userData?.accounts?.find(a => a.id === account.id) as any)?.variant === 'challenge'))
              .map(account => (
              <div key={account.id} className="relative group">
                <Link href={`/dashboard/accounts/${account.id}`}>
                  <div className="border rounded-lg p-4 bg-background hover:bg-muted/50 transition-all cursor-pointer group shadow-sm hover:shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold flex items-center">
                        {account.broker}<span className="text-xs ml-2 bg-muted/40 text-foreground px-2 py-0.5 rounded">{account.type.toUpperCase()}</span>
                      </div>
                      <div className={`text-sm font-medium flex items-center gap-1 ${account.todayPnL >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                        {account.todayPnL !== 0 ? (
                          <>
                            {account.todayPnL > 0 ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6-6 6 6"/>
                                <path d="M6 12h12"/>
                                <path d="m6 15 6 6 6-6"/>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6-6 6 6"/>
                                <path d="M6 12h12"/>
                                <path d="m6 15 6 6 6-6"/>
                              </svg>
                            )}
                            {account.todayPnL > 0 ? '+' : ''}{Number(account.todayPnL).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </>
                        ) : 'No change'}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xl font-bold">${Number(account.balance).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      <div className="text-xs text-muted-foreground px-2 py-1 bg-background group-hover:bg-muted/90 rounded">
                        Account Value
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20v-6M6 20V10M18 20V4"/>
                        </svg>
                        Trades: {account.totalTrades}
                      </div>
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m18 6-6-4-6 4"/>
                          <path d="M6 8v10c0 .6.4 1 1 1h10c.6 0 1-.4 1-1V8"/>
                        </svg>
                        Win rate: {Number(account.winRate).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%
                      </div>
                    </div>
                  </div>
                </Link>
                
                
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Challenge Accounts Section - Add this after the Trading Accounts section */}
      {challengeAccounts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 5h-7L8 19l-3-6H2"/>
                <path d="M22 5h-3"/>
                <path d="M17 9h-2.5"/>
                <path d="M11 13H8.2"/>
                <path d="M2 9h3"/>
                <path d="M7 13h2.5"/>
                <path d="M13 17h3.1"/>
              </svg>
              Challenge Accounts Progress
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challengeAccounts.map(account => (
              <Card key={account.id} className="shadow-md overflow-hidden">
                <CardHeader className="pb-2 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {account.broker}
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">CHALLENGE</span>
                      </CardTitle>
                      <CardDescription>${account.balance.toLocaleString()} {account.type.toUpperCase()}</CardDescription>
                    </div>
                    {account.profitTarget && account.pnlPercentage >= account.profitTarget ? (
                      <Button 
                        size="sm" 
                        className="h-8 bg-[#089981] hover:bg-[#089981]/90 text-white shadow-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleActivateAccount(account.id);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                        Activate
                      </Button>
                    ) : (
                      <Link href={`/dashboard/accounts/${account.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m9 18 6-6-6-6"/>
                          </svg>
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Profit Target Progress */}
                    {account.profitTarget && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#089981]">
                              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                              <polyline points="16 7 22 7 22 13"/>
                            </svg>
                            Profit Target
                          </span>
                          <span className="text-sm flex items-center gap-1">
                            <span className={account.pnlPercentage >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}>
                              {Number(account.pnlPercentage).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                            </span>
                            <span className="text-muted-foreground">/ {account.profitTarget}%</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${account.pnlPercentage >= 0 ? 'bg-[#089981]' : 'bg-[#f23645]'} rounded-r-full`} 
                            style={{ 
                              width: `${Math.min(Math.max((account.pnlPercentage / account.profitTarget) * 100, 0), 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Max Loss Limit */}
                    {account.maxLossLimit && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#f23645]">
                              <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
                              <polyline points="16 17 22 17 22 11"/>
                            </svg>
                            Max Loss ({account.maxLossType || 'static'})
                          </span>
                          <span className="text-sm flex items-center gap-1">
                            <span className="text-[#f23645]">
                              {Number(account.maxDrawdown).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                            </span>
                            <span className="text-muted-foreground">/ {account.maxLossLimit}%</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#f23645] rounded-r-full" 
                            style={{ 
                              width: `${Math.min((account.maxDrawdown / account.maxLossLimit) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Daily Loss Limit - Only if it exists */}
                    {account.dailyLossLimit && (
                      <div className="text-sm flex justify-between items-center">
                        <span className="flex items-center gap-1 text-amber-500">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v10l4 4"/>
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          Daily Loss Limit:
                        </span>
                        <span>{account.dailyLossLimit}%</span>
                      </div>
                    )}
                    
                    {/* Time Remaining - Only if it exists */}
                    {account.daysRemaining !== null && (
                      <div className="text-sm flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          Time Remaining:
                        </span>
                        <span className={account.daysRemaining < 5 ? 'text-[#f23645]' : ''}>
                          {account.daysRemaining > 0 ? `${account.daysRemaining} days` : 'Expired'}
                        </span>
                      </div>
                    )}
                    
                    {/* Statistics Row */}
                    <div className="grid grid-cols-3 gap-2 text-xs mt-4 pt-3 border-t border-border">
                      <div className="text-center">
                        <div className="text-muted-foreground">Trades</div>
                        <div className="font-medium mt-1">{account.totalTrades}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Win Rate</div>
                        <div className="font-medium mt-1">{Number(account.winRate).toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">P/L</div>
                        <div className={`font-medium mt-1 ${account.pnlPercentage >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                          {account.pnlPercentage >= 0 ? '+' : ''}{Number(account.pnlPercentage).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
      </div>
      )}
      
      {/* Recent Trades */}
      <Card className="shadow-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <line x1="12" x2="12" y1="8" y2="16" />
              <line x1="8" x2="16" y1="12" y2="12" />
            </svg>
            <CardTitle>Trades History</CardTitle>
          </div>
          {recentTrades.length > 0 && (
            <Link href="/dashboard/trades">
              <Button variant="outline" size="sm" className="shadow-sm hover:text-primary">
                <span>View All</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {recentTrades.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <line x1="12" x2="12" y1="8" y2="16" />
                  <line x1="8" x2="16" y1="12" y2="12" />
                </svg>
              </div>
              <p className="text-muted-foreground mb-6">No trades found. Add your first trade!</p>
              <Link href="/dashboard/trades/new" className="inline-block">
                <Button className="shadow-sm hover:text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add New Trade
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-left">Symbol</th>
                    <th className="px-4 py-3 font-medium text-left">Date</th>
                    <th className="px-4 py-3 font-medium text-left">Account</th>
                    <th className="px-4 py-3 font-medium text-left">Type</th>
                    <th className="px-4 py-3 font-medium text-left">Entry</th>
                    <th className="px-4 py-3 font-medium text-left">Exit</th>
                    <th className="px-4 py-3 font-medium text-right">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade, index) => (
                    <tr 
                      key={trade.id} 
                      className={`border-b border-border hover:bg-muted/30 transition-colors ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(trade.date.seconds * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {trade.accountName || 'Unknown'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                          trade.type === 'long' 
                            ? 'bg-[#089981]/10 text-[#089981]' 
                            : 'bg-[#f23645]/10 text-[#f23645]'
                        }`}>
                          {trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">${Number(trade.entry).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="px-4 py-3">${Number(trade.exit).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className={`px-4 py-3 text-right font-medium ${trade.pnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{Number(trade.pnl).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 