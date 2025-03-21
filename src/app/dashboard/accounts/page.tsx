'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, ArrowUpRight, ArrowDownRight, PieChart, Users, 
  Clock, Filter, Search, Plus, CreditCard, Briefcase, 
  TrendingUp, TrendingDown, CircleDollarSign, Target, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { AccountsPageSkeleton } from '@/components/skeletons';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { LineChart } from '@/components/charts';
import { generateBalanceHistoryData, formatChartData } from '@/lib/chart-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  MoveUp,
  MoveDown,
  DollarSign,
  LineChart as LineChartIcon,
  Trophy,
  TrendingUp as TrendingUpIcon,
} from "lucide-react";

// Define interfaces for our data structure
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

interface Account {
  id: string;
  name?: string;
  broker: string;
  type: 'real' | 'demo' | 'prop';
  accountType: string;
  accountSize?: number;
  initialBalance?: number;
  currentBalance?: number;
  balance?: number;
  variant?: 'challenge' | 'live';
  trades?: Trade[];
  createdAt?: any;
  updatedAt?: any;
  maxLossLimit?: number;
  profitTargetToPass?: number;
}

interface AccountStats {
  id: string;
  broker: string;
  type: 'real' | 'demo' | 'prop';
  accountType: string;
  balance: number;
  accountSize?: number;
  todayPnL: number;
  totalTrades: number;
  winRate: number;
  variant?: 'challenge' | 'live';
  pnlAmount?: number;
  pnlPercentage?: number;
  maxLossLimit?: number;
  profitTargetToPass?: number;
  profitProgress?: number;
  lastUpdated?: Date;
}

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountStats, setAccountStats] = useState<AccountStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [chartPeriodCount, setChartPeriodCount] = useState(12);

  // Calculate stats for an account
  const calculateAccountStats = (account: Account): AccountStats => {
    const trades = account.trades || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate today's P&L
    const todayPnL = trades
      .filter(trade => {
        const tradeDate = new Date(trade.date?.seconds * 1000);
        tradeDate.setHours(0, 0, 0, 0);
        return tradeDate.getTime() === today.getTime();
      })
      .reduce((sum, trade) => sum + trade.pnl, 0);
    
    // Calculate win rate
    const winningTrades = trades.filter(trade => trade.pnl > 0);
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    
    // Calculate total P&L
    const totalPnL = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const initialBalance = account.initialBalance || account.accountSize || 0;
    const pnlPercentage = initialBalance > 0 ? (totalPnL / initialBalance) * 100 : 0;
    
    // Calculate profit progress (for prop accounts with profit targets)
    let profitProgress = 0;
    if (account.type === 'prop' && account.profitTargetToPass && account.profitTargetToPass > 0) {
      const targetAmount = (account.profitTargetToPass / 100) * (account.accountSize || 0);
      profitProgress = targetAmount > 0 ? Math.min(100, (totalPnL / targetAmount) * 100) : 0;
    }
    
    // Get last updated date from the most recent trade
    const sortedTrades = [...trades].sort((a, b) => 
      (b.date?.seconds || 0) - (a.date?.seconds || 0)
    );
    const lastUpdated = sortedTrades.length > 0 
      ? new Date(sortedTrades[0].date.seconds * 1000) 
      : account.updatedAt 
        ? new Date(account.updatedAt.seconds * 1000) 
        : undefined;
    
    return {
      id: account.id,
      broker: account.broker,
      type: account.type,
      accountType: account.accountType,
      balance: account.balance || account.currentBalance || account.initialBalance || 0,
      accountSize: account.accountSize,
      todayPnL,
      totalTrades: trades.length,
      winRate,
      variant: account.variant,
      pnlAmount: totalPnL,
      pnlPercentage,
      maxLossLimit: account.maxLossLimit,
      profitTargetToPass: account.profitTargetToPass,
      profitProgress,
      lastUpdated,
    };
  };

  // Fetch user accounts and calculate stats
  useEffect(() => {
    const fetchUserAccounts = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get user document from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          toast.error('User profile not found');
          setLoading(false);
          return;
        }
        
        const userData = userDoc.data();
        const userAccounts = userData.accounts || [];
        
        // Set accounts
        setAccounts(userAccounts);
        
        // Calculate stats for each account
        const accountStatsData = userAccounts.map((account: Account) => calculateAccountStats(account));
        setAccountStats(accountStatsData);
        
      } catch (error) {
        console.error('Error fetching accounts:', error);
        toast.error('Failed to load accounts');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAccounts();
  }, [user]);

  // Filter accounts based on the active tab and search query
  const filteredAccounts = accountStats.filter((account) => {
    // Filter by tab
    const matchesTab = activeTab === 'all' || account.type === activeTab;
    
    // Filter by search query
    const matchesSearch = searchQuery.trim() === '' ||
      account.broker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.accountType.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  }).sort((a, b) => {
    // Sort by balance (highest first)
    return b.balance - a.balance;
  });

  // Group accounts by type for summary statistics
  const accountSummary = {
    real: accountStats.filter(acc => acc.type === 'real'),
    demo: accountStats.filter(acc => acc.type === 'demo'),
    prop: accountStats.filter(acc => acc.type === 'prop'),
  };

  // Calculate total balances for each account type
  const totalBalances = {
    real: accountSummary.real.reduce((sum, acc) => sum + acc.balance, 0),
    demo: accountSummary.demo.reduce((sum, acc) => sum + acc.balance, 0),
    prop: accountSummary.prop.reduce((sum, acc) => sum + acc.balance, 0),
  };

  // Calculate total P&L for each account type
  const totalPnL = {
    real: accountSummary.real.reduce((sum, acc) => sum + (acc.pnlAmount || 0), 0),
    demo: accountSummary.demo.reduce((sum, acc) => sum + (acc.pnlAmount || 0), 0),
    prop: accountSummary.prop.reduce((sum, acc) => sum + (acc.pnlAmount || 0), 0),
  };

  // Calculate win rates by account type (only for accounts with trades)
  const avgWinRates = {
    real: accountSummary.real.filter(acc => acc.totalTrades > 0).length > 0 
      ? accountSummary.real.filter(acc => acc.totalTrades > 0).reduce((sum, acc) => sum + acc.winRate, 0) / 
        accountSummary.real.filter(acc => acc.totalTrades > 0).length 
      : 0,
    demo: accountSummary.demo.filter(acc => acc.totalTrades > 0).length > 0 
      ? accountSummary.demo.filter(acc => acc.totalTrades > 0).reduce((sum, acc) => sum + acc.winRate, 0) / 
        accountSummary.demo.filter(acc => acc.totalTrades > 0).length 
      : 0,
    prop: accountSummary.prop.filter(acc => acc.totalTrades > 0).length > 0 
      ? accountSummary.prop.filter(acc => acc.totalTrades > 0).reduce((sum, acc) => sum + acc.winRate, 0) / 
        accountSummary.prop.filter(acc => acc.totalTrades > 0).length 
      : 0,
  };

  // Calculate overall win rate (only from real accounts with trades)
  const realAccountsWithTrades = accountSummary.real.filter(acc => acc.totalTrades > 0);
  const overallWinRate = realAccountsWithTrades.length > 0 
    ? realAccountsWithTrades.reduce((sum, acc) => sum + acc.winRate, 0) / realAccountsWithTrades.length
    : 0;

  // Get real accounts (for chart data)
  const realAccounts = accountStats.filter(acc => acc.type === 'real');

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    
    // Format date as "Oct 15, 2023" (short month name)
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Function to handle chart timeframe change
  const handleTimeframeChange = (timeframe: 'week' | 'month' | 'year') => {
    console.log(`Changing timeframe to ${timeframe}`);
    setChartTimeframe(timeframe);
    
    // The period count is no longer used since we show daily data points
    // but we keep this for state management consistency
    if (timeframe === 'week') {
      setChartPeriodCount(7); // 7 days
    } else if (timeframe === 'month') {
      setChartPeriodCount(30); // 30 days
    } else {
      setChartPeriodCount(365); // 365 days
    }
  };

  // For debugging - log whenever timeframe changes
  useEffect(() => {
    console.log(`Current timeframe: ${chartTimeframe}, periods: ${chartPeriodCount}`);
  }, [chartTimeframe, chartPeriodCount]);

  return loading ? (
    <AccountsPageSkeleton />
  ) : (
    <div className="space-y-8">
      {/* Header with responsive search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Trading Accounts</h1>
          <p className="text-muted-foreground">Manage and monitor your trading accounts</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search accounts..."
              className="pl-8 w-[200px] h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Link href="/dashboard/accounts/new">
            <Button className="shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Stats overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Balance Card */}
        <Card className="shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-primary" />
              Total Trading Capital
            </CardTitle>
            <CardDescription>{accountSummary.real.length} Real Accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold truncate">
              {formatCurrency(totalBalances.real)}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
              <div className="bg-secondary/20 rounded-md p-2 text-center">
                <div className="text-xs text-muted-foreground">Real</div>
                <div className="font-medium truncate">{formatCurrency(totalBalances.real)}</div>
              </div>
              <div className="bg-secondary/10 rounded-md p-2 text-center opacity-70">
                <div className="text-xs text-muted-foreground">Demo</div>
                <div className="font-medium truncate">{formatCurrency(totalBalances.demo)}</div>
              </div>
              <div className="bg-secondary/10 rounded-md p-2 text-center opacity-70">
                <div className="text-xs text-muted-foreground">Prop</div>
                <div className="font-medium truncate">{formatCurrency(totalBalances.prop)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Total P&L Card */}
        <Card className="shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {totalPnL.real >= 0 ? (
                <TrendingUpIcon className="h-5 w-5 text-primary" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              Total P&L
            </CardTitle>
            <CardDescription>Real accounts performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-3xl font-bold truncate",
              totalPnL.real >= 0 
                ? "text-primary" 
                : "text-destructive"
            )}>
              {formatCurrency(totalPnL.real)}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
              <div className="bg-secondary/20 rounded-md p-2 text-center">
                <div className="text-xs text-muted-foreground">Real</div>
                <div className={cn(
                  "font-medium truncate",
                  totalPnL.real >= 0 ? "text-primary" : "text-destructive"
                )}>
                  {formatCurrency(totalPnL.real)}
                </div>
              </div>
              <div className="bg-secondary/10 rounded-md p-2 text-center opacity-70">
                <div className="text-xs text-muted-foreground">Demo</div>
                <div className={cn(
                  "font-medium truncate",
                  totalPnL.demo >= 0 ? "text-primary" : "text-destructive"
                )}>
                  {formatCurrency(totalPnL.demo)}
                </div>
              </div>
              <div className="bg-secondary/10 rounded-md p-2 text-center opacity-70">
                <div className="text-xs text-muted-foreground">Prop</div>
                <div className={cn(
                  "font-medium truncate",
                  totalPnL.prop >= 0 ? "text-primary" : "text-destructive"
                )}>
                  {formatCurrency(totalPnL.prop)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Win Rate Card */}
        <Card className="shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Win Rates
            </CardTitle>
            <CardDescription>Real accounts performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {overallWinRate.toFixed(1)}%
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
              <div className="bg-secondary/20 rounded-md p-2 text-center">
                <div className="text-xs text-muted-foreground">Real</div>
                <div className="font-medium">{avgWinRates.real.toFixed(1)}%</div>
              </div>
              <div className="bg-secondary/10 rounded-md p-2 text-center opacity-70">
                <div className="text-xs text-muted-foreground">Demo</div>
                <div className="font-medium">{avgWinRates.demo.toFixed(1)}%</div>
              </div>
              <div className="bg-secondary/10 rounded-md p-2 text-center opacity-70">
                <div className="text-xs text-muted-foreground">Prop</div>
                <div className="font-medium">{avgWinRates.prop.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Monthly Balance Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center">
            <LineChartIcon className="mr-2 h-5 w-5" />
            Historical P&L Performance
          </CardTitle>
          <CardDescription className="flex justify-between items-center">
            <span>Daily balance changes from first trade</span>
            <div className="flex items-center space-x-1">
              <Button 
                variant="outline" 
                size="sm" 
                className={cn("h-7 px-2 text-xs", chartTimeframe === 'week' && "bg-muted")}
                onClick={() => handleTimeframeChange('week')}
              >
                At least 7 days
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn("h-7 px-2 text-xs", chartTimeframe === 'month' && "bg-muted")}
                onClick={() => handleTimeframeChange('month')}
              >
                At least 30 days
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className={cn("h-7 px-2 text-xs", chartTimeframe === 'year' && "bg-muted")}
                onClick={() => handleTimeframeChange('year')}
              >
                At least 1 year
              </Button>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-80 w-full">
            <LineChart 
              key={`chart-${chartTimeframe}-${chartPeriodCount}`}
              data={generateBalanceHistoryData({
                type: 'real', 
                initialBalance: realAccounts.reduce((total, acc) => 
                  total + (acc.initialBalance || acc.accountSize || acc.balance || 0), 0),
                currentBalance: realAccounts.reduce((total, acc) => 
                  total + (acc.balance || 0), 0),
                trades: accounts.filter(acc => acc.type === 'real').flatMap(acc => acc.trades || [])
              }, chartTimeframe, chartPeriodCount)}
              className="h-full w-full"
              showXAxis
              showYAxis
              showGrid
              tooltipFormat={(val) => formatCurrency(val)}
              lineColor="white"
              showArea={false}
              strokeWidth={2}
              baseValue={realAccounts.reduce((total, acc) => 
                total + (acc.initialBalance || acc.accountSize || acc.balance || 0), 0)}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs for filtering accounts by type */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span>All Accounts <span className="ml-1 text-xs">({accountStats.length})</span></span>
          </TabsTrigger>
          <TabsTrigger value="real" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Real <span className="ml-1 text-xs">({accountSummary.real.length})</span></span>
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Demo <span className="ml-1 text-xs">({accountSummary.demo.length})</span></span>
          </TabsTrigger>
          <TabsTrigger value="prop" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span>Prop <span className="ml-1 text-xs">({accountSummary.prop.length})</span></span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-6">
          {filteredAccounts.length === 0 ? (
            <Card className="shadow-sm border-dashed">
              <CardContent className="p-8 text-center">
                <div className="mx-auto bg-muted/40 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-2">No accounts found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery 
                    ? "No accounts match your search criteria." 
                    : activeTab === 'all' 
                      ? "You don't have any trading accounts yet." 
                      : `You don't have any ${activeTab} accounts yet.`}
                </p>
                <Link href="/dashboard/accounts/new">
                  <Button>Add Trading Account</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredAccounts.map((account) => (
                  <Link href={`/dashboard/accounts/${account.id}`} key={account.id}>
                    <Card className="h-full hover:bg-muted/30 transition-all shadow-sm hover:shadow-md cursor-pointer border-border/50 overflow-hidden group">
                      <CardHeader className="pb-3 border-b bg-card/80">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl group-hover:text-primary transition-colors">{account.broker}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <span>{account.accountType}</span>
                              <span className="mx-1">•</span>
                              <Badge className={cn(
                                "font-medium capitalize",
                                account.type === 'real' ? 'bg-blue-500/90 hover:bg-blue-500 text-white' :
                                account.type === 'demo' ? 'bg-green-500/90 hover:bg-green-500 text-white' :
                                'bg-violet-500/90 hover:bg-violet-500 text-white'
                              )}>
                                {account.type}
                              </Badge>
                              {account.variant && (
                                <Badge variant="outline" className="ml-1 font-medium capitalize border-amber-400 text-amber-600 dark:text-amber-400">
                                  {account.variant}
                                </Badge>
                              )}
                            </CardDescription>
                          </div>
                          
                          <div className={cn(
                            "font-medium px-2.5 py-1.5 rounded-md flex items-center text-sm",
                            account.todayPnL > 0 ? "bg-primary/10 text-primary" :
                            account.todayPnL < 0 ? "bg-destructive/10 text-destructive" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {account.todayPnL > 0 ? (
                              <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                            ) : account.todayPnL < 0 ? (
                              <ArrowDownRight className="h-3.5 w-3.5 mr-1" />
                            ) : null}
                            {account.todayPnL !== 0 ? formatCurrency(account.todayPnL) : 'No trades today'}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
                            <div className="text-2xl font-bold text-foreground/90">{formatCurrency(account.balance)}</div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground mb-1">Total P&L</div>
                            <div className={cn(
                              "text-xl font-bold flex items-center justify-end",
                              (account.pnlAmount || 0) >= 0 
                                ? "text-primary" 
                                : "text-destructive"
                            )}>
                              {(account.pnlAmount || 0) >= 0 ? (
                                <ArrowUpRight className="h-4 w-4 mr-1" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 mr-1" />
                              )}
                              {formatCurrency(account.pnlAmount || 0)}
                              <span className="text-xs ml-1 font-medium opacity-80">
                                ({account.pnlPercentage?.toFixed(1) || 0}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="border-t py-3 px-5 bg-muted/20 text-sm text-muted-foreground">
                        <div className="flex items-center group-hover:text-primary transition-colors">
                          <ArrowUpRight className="h-3.5 w-3.5 mr-1.5" />
                          <span>View account details</span>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 