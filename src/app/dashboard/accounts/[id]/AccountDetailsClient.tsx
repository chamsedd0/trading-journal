'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface AccountTrade {
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
}

interface Account {
  id: string;
  broker: string;
  accountType: string;
  accountSize: number;
  balance: number;
  type: 'real' | 'demo' | 'prop';
  trades?: AccountTrade[];
}

interface TradeStats {
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  netPnL: number;
  todayPnL: number;
}

export default function AccountDetailsClient({ accountId }: { accountId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [trades, setTrades] = useState<AccountTrade[]>([]);
  const [stats, setStats] = useState<TradeStats>({
    winRate: 0,
    profitFactor: 0,
    totalTrades: 0,
    netPnL: 0,
    todayPnL: 0
  });
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const fetchAccountData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          toast.error("User profile not found");
          router.push("/dashboard");
          return;
        }
        
        const userData = userDoc.data();
        const accounts = userData.accounts || [];
        const foundAccount = accounts.find((acc: any) => acc.id === accountId);
        
        if (!foundAccount) {
          toast.error("Account not found");
          router.push("/dashboard");
          return;
        }
        
        setAccount(foundAccount);
        
        // Ensure trades array exists and is processed correctly
        const accountTrades = foundAccount.trades || [];
        console.log("Raw account trades:", accountTrades);
        
        // Make sure we handle trades properly
        if (Array.isArray(accountTrades)) {
          setTrades(accountTrades);
          
          // Calculate statistics
          if (accountTrades.length > 0) {
            // Sort trades by date (newest first)
            const sortedTrades = [...accountTrades].sort((a: AccountTrade, b: AccountTrade) => {
              return (b.date?.seconds || 0) - (a.date?.seconds || 0);
            });
            
            const totalTrades = sortedTrades.length;
            const winningTrades = sortedTrades.filter((trade: AccountTrade) => trade.pnl > 0);
            const losingTrades = sortedTrades.filter((trade: AccountTrade) => trade.pnl <= 0);
            
            const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
            const totalWins = winningTrades.reduce((sum, trade) => sum + trade.pnl, 0);
            const totalLosses = losingTrades.reduce((sum, trade) => sum + Math.abs(trade.pnl), 0);
            const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
            const netPnL = sortedTrades.reduce((sum, trade) => sum + trade.pnl, 0);
            
            // Calculate today's PnL
            const today = new Date();
            const todayTrades = sortedTrades.filter((trade: AccountTrade) => {
              if (!trade.date || !trade.date.seconds) return false;
              const tradeDate = new Date(trade.date.seconds * 1000);
              return tradeDate.getDate() === today.getDate() &&
                    tradeDate.getMonth() === today.getMonth() &&
                    tradeDate.getFullYear() === today.getFullYear();
            });
            
            const todayPnL = todayTrades.reduce((sum, trade) => sum + trade.pnl, 0);
            
            setStats({
              winRate,
              profitFactor,
              totalTrades,
              netPnL,
              todayPnL
            });
          }
        } else {
          console.error("Trades is not an array:", accountTrades);
          setTrades([]);
        }
      } catch (error) {
        console.error("Error fetching account data:", error);
        toast.error("Failed to load account details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccountData();
  }, [user, accountId, router]);
  
  const handleDeleteAccount = async () => {
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
      
      toast.success("Account deleted successfully");
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (loading) {
    return <div>Loading account details...</div>;
  }
  
  if (!account) {
    return <div>Account not found</div>;
  }
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{account?.broker || 'Account Details'}</h1>
          <p className="text-muted-foreground">
            {account?.type === 'prop' ? 'Proprietary Account' : 
             account?.type === 'real' ? 'Real Account' : 'Demo Account'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Trading Account</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this trading account? This action cannot be undone, and all trade data associated with this account will be permanently lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Link href={`/dashboard/accounts/${accountId}/edit`}>
            <Button variant="outline" className="shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                <path d="m15 5 4 4"/>
              </svg>
              Edit Account
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Account Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20 from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-primary">Account Size</CardDescription>
            <CardTitle className="text-3xl font-bold text-primary">
              ${account.accountSize.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Balance</CardDescription>
            <CardTitle className="text-3xl font-bold">
              ${account.balance.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className={stats.todayPnL >= 0 ? "border-[#089981]/20 bg-[#089981]/5" : "border-[#f23645]/20 bg-[#f23645]/5"}>
          <CardHeader className="pb-2">
            <CardDescription className={stats.todayPnL >= 0 ? "text-[#089981]/70" : "text-[#f23645]/70"}>Today's P/L</CardDescription>
            <CardTitle className={`text-3xl font-bold ${stats.todayPnL >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
              {stats.todayPnL >= 0 ? '+' : ''}{stats.todayPnL.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
        
        <Card className={stats.netPnL >= 0 ? "border-[#089981]/20 bg-[#089981]/5" : "border-[#f23645]/20 bg-[#f23645]/5"}>
          <CardHeader className="pb-2">
            <CardDescription className={stats.netPnL >= 0 ? "text-[#089981]/70" : "text-[#f23645]/70"}>Total P/L</CardDescription>
            <CardTitle className={`text-3xl font-bold ${stats.netPnL >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
              {stats.netPnL >= 0 ? '+' : ''}{stats.netPnL.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      
      <Tabs defaultValue="trades" className="w-full">
        <TabsList>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trades" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>All trades for this account</CardDescription>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No trades found for this account.</p>
                  <Link href="/dashboard/trades/new" className="mt-4 inline-block">
                    <Button className="mt-4">Add First Trade</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left border-b border-border">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Symbol</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Size</th>
                        <th className="px-4 py-3 font-medium">Entry</th>
                        <th className="px-4 py-3 font-medium">Exit</th>
                        <th className="px-4 py-3 font-medium text-right">P/L</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map(trade => (
                        <tr key={trade.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(trade.date.seconds * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              trade.type === 'long' 
                                ? 'bg-[#089981]/10 text-[#089981]' 
                                : 'bg-[#f23645]/10 text-[#f23645]'
                            }`}>
                              {trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">{trade.size}</td>
                          <td className="px-4 py-3">${trade.entry.toFixed(2)}</td>
                          <td className="px-4 py-3">${trade.exit.toFixed(2)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${trade.pnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                            {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/trades/${trade.id}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-primary/20  from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="text-primary/90">Win Rate</CardTitle>
                <CardDescription className="text-primary/70">Percentage of winning trades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <div className="text-4xl font-bold text-primary">{stats.winRate.toFixed(1)}%</div>
                  <div className="text-xl font-medium text-primary/70 mb-1">
                    {stats.totalTrades > 0 && `(${Math.round(stats.winRate * stats.totalTrades / 100)}/${stats.totalTrades})`}
                  </div>
                </div>
                <div className="h-4 w-full bg-muted mt-4 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${Math.min(stats.winRate, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-primary/70 mt-2">
                  {stats.winRate < 40 ? 'Needs improvement' : 
                   stats.winRate < 60 ? 'Average performance' : 
                   'Excellent win rate'}
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-primary/20 from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="text-primar/90">Profit Factor</CardTitle>
                <CardDescription className="text-primary/70">Ratio of gross profits to gross losses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">{stats.profitFactor.toFixed(2)}</div>
                <div className="h-4 w-full bg-muted mt-4 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full" 
                    style={{ width: `${Math.min((stats.profitFactor / 3) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-primary/70 mt-2">
                  {stats.profitFactor < 1 ? 'Losing strategy' : 
                   stats.profitFactor < 1.5 ? 'Marginally profitable' : 
                   stats.profitFactor < 2 ? 'Good performance' : 
                   'Excellent performance'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 