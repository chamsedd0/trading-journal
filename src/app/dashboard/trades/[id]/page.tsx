'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { CheckIcon, XIcon } from 'lucide-react';

interface Trade {
  id: string;
  symbol: string;
  date: {
    seconds: number;
    nanoseconds: number;
  };
  type: 'long' | 'short';
  marketType?: string;
  entry: number;
  exit: number;
  exitTime?: string;
  tp?: number | null;
  sl?: number | null;
  size: number;
  tickValue?: number | null;
  pipValue?: number | null;
  commission?: number;
  pnl: number;
  notes?: string;
  followedRules?: string[];
  accountId: string;
  accountName?: string;
  createdAt?: number;
}

interface Account {
  id: string;
  broker: string;
  type: 'real' | 'demo' | 'prop';
  accountType: string;
}

export default function TradeDetailPage() {
  const params = useParams();
  const tradeId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrade = async () => {
      if (!user) return;

      try {
        // Get user document
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
          toast.error('User profile not found');
          router.push('/dashboard');
          return;
        }

        const userData = userDoc.data();
        const accounts = userData.accounts || [];
        
        // Search through all accounts for the trade
        let foundTrade: Trade | null = null;
        let foundAccount: Account | null = null;
        
        // Loop through accounts to find the trade
        for (const account of accounts) {
          if (account.trades && Array.isArray(account.trades)) {
            const trade = account.trades.find((t: any) => t.id === tradeId);
            if (trade) {
              foundTrade = {
                ...trade,
                accountId: account.id,
                accountName: account.broker
              };
              foundAccount = {
                id: account.id,
                broker: account.broker,
                type: account.type || 'demo',
                accountType: account.accountType
              };
              break;
            }
          }
        }

        if (!foundTrade) {
          toast.error('Trade not found');
          router.push('/dashboard/trades');
          return;
        }

        setTrade(foundTrade);
        setAccount(foundAccount);
      } catch (error) {
        console.error('Error fetching trade:', error);
        toast.error('Failed to load trade details');
      } finally {
        setLoading(false);
      }
    };

    fetchTrade();
  }, [user, tradeId, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!trade) {
    return <div>Trade not found</div>;
  }

  const tradeDate = new Date(trade.date.seconds * 1000);
  const formattedDate = tradeDate.toLocaleDateString();
  const formattedTime = tradeDate.toLocaleTimeString();
  
  const profitPercentage = ((trade.exit - trade.entry) / trade.entry) * 100 * (trade.type === 'long' ? 1 : -1);
  
  // Calculate actual risk-reward ratio using stop loss if available
  let riskRewardRatio = 0;
  
  if (trade.sl && trade.entry) {
    // Calculate reward - if TP is set, use it instead of exit price for proper ratio calculation
    const rewardPrice = trade.tp || trade.exit;
    const reward = Math.abs(rewardPrice - trade.entry);
    const risk = trade.type === 'long' 
      ? Math.abs(trade.entry - trade.sl) 
      : Math.abs(trade.sl - trade.entry);
    
    if (risk > 0) {
      riskRewardRatio = reward / risk;
    }
  } else {
    // Fallback to simplified calculation if no stop loss
    riskRewardRatio = trade.pnl > 0 ? Math.abs(trade.pnl / (trade.entry * trade.size * 0.01)) : 0;
  }

  const hasRules = trade.followedRules && trade.followedRules.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{trade.symbol} Trade Details</h1>
          <p className="text-muted-foreground">
            {trade.type === 'long' ? 'Long' : 'Short'} position on {formattedDate}
            {account && ` · ${account.broker} (${account.type.toUpperCase()})`}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/dashboard/trades/${trade.id}/edit`}>
            <Button>Edit Trade</Button>
          </Link>
          <Link href={`/dashboard/accounts/${trade.accountId}`}>
            <Button variant="outline">View Account</Button>
          </Link>
          <Link href="/dashboard/trades">
            <Button variant="ghost">All Trades</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trade Summary</CardTitle>
            <CardDescription>Key information about this trade</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Symbol</p>
                <p className="text-xl font-medium">{trade.symbol}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <div className={`inline-flex px-2 py-1 rounded-md text-sm font-medium ${
                  trade.type === 'long' 
                    ? 'bg-[#089981]/10 text-[#089981]' 
                    : 'bg-[#f23645]/10 text-[#f23645]'
                }`}>
                  {trade.type === 'long' ? 'Long' : 'Short'}
                </div>
              </div>
            </div>

            {trade.marketType && (
              <div>
                <p className="text-sm text-muted-foreground">Market Type</p>
                <div className="inline-flex px-2 py-1 rounded-md text-sm font-medium bg-blue-500/10 text-blue-500">
                  {trade.marketType.charAt(0).toUpperCase() + trade.marketType.slice(1)}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{formattedDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium">{formattedTime}</p>
              </div>
            </div>
            
            {account && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Account</p>
                  <p className="font-medium">{account.broker}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Type</p>
                  <div className={`inline-flex px-2 py-1 rounded-md text-sm font-medium ${
                    account.type === 'real' 
                      ? 'bg-green-500/10 text-green-500' 
                      : account.type === 'prop'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {account.type.toUpperCase()}
                  </div>
                </div>
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardDescription>Entry Price</CardDescription>
                  <CardTitle className="text-2xl tracking-tight">
                    ${Number(trade.entry).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </CardTitle>
                </CardHeader>
              </Card>
              
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardDescription>Exit Price</CardDescription>
                  <CardTitle className="text-2xl tracking-tight">
                    ${Number(trade.exit).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </CardTitle>
                </CardHeader>
              </Card>
              
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardDescription>Position Size</CardDescription>
                  <CardTitle className="text-2xl tracking-tight">
                    {Number(trade.size).toLocaleString('en-US')}
                  </CardTitle>
                </CardHeader>
              </Card>
              
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardDescription>Profit/Loss</CardDescription>
                  <CardTitle className={`text-2xl tracking-tight ${trade.pnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                    {trade.pnl >= 0 ? '+' : ''}{Number(trade.pnl).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {(trade.tp || trade.sl) && (
              <div className="grid grid-cols-2 gap-4">
                {trade.tp && (
                  <div>
                    <p className="text-sm text-muted-foreground">Take Profit</p>
                    <p className="font-medium text-[#089981]">
                      ${Number(trade.tp).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                  </div>
                )}
                {trade.sl && (
                  <div>
                    <p className="text-sm text-muted-foreground">Stop Loss</p>
                    <p className="font-medium text-[#f23645]">
                      ${Number(trade.sl).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trade Analysis</CardTitle>
            <CardDescription>Performance metrics and statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Outcome</p>
                <div className={`inline-flex px-2 py-1 rounded-md text-sm font-medium ${
                  trade.pnl >= 0 
                    ? 'bg-green-500/10 text-green-500' 
                    : 'bg-red-500/10 text-red-500'
                }`}>
                  {trade.pnl >= 0 ? 'Win' : 'Loss'}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profit %</p>
                <p className={`font-medium ${profitPercentage >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Risk/Reward</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk-Reward Ratio</span>
                  <span className={`text-sm font-medium ${
                    riskRewardRatio >= 1 
                      ? 'text-[#089981]' 
                      : 'text-[#f23645]'
                  }`}>
                    1:{riskRewardRatio.toFixed(2)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Position Size</p>
                <p className="font-medium">
                  ${(trade.entry * trade.size).toLocaleString()}
                </p>
              </div>
            </div>

            {hasRules && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Trading Plan Rules Followed</p>
                <div className="flex flex-wrap gap-2">
                  {trade.followedRules?.map((rule, index) => (
                    <Badge 
                      key={index} 
                      className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 flex items-center gap-1"
                    >
                      <CheckIcon className="h-3 w-3" />
                      {rule}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Trade Notes</p>
              <div className="bg-muted/40 p-3 rounded-lg min-h-[100px]">
                {trade.notes ? (
                  <p className="whitespace-pre-wrap">{trade.notes}</p>
                ) : (
                  <p className="text-muted-foreground italic">No notes for this trade</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              {trade.createdAt ? 
                `Created on ${new Date(trade.createdAt).toLocaleString()}` : 
                'Created date not available'}
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Trading Plan Adherence - New Card */}
      {hasRules && (
        <Card>
          <CardHeader>
            <CardTitle>Trading Plan Adherence</CardTitle>
            <CardDescription>Evaluation of this trade against your trading plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/40 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-3">Rules Followed</h3>
              <div className="space-y-2">
                {trade.followedRules?.map((rule, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p>{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Risk Management</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Stop Loss Set</span>
                    <span className={trade.sl ? "text-green-500" : "text-red-500"}>
                      {trade.sl ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Take Profit Set</span>
                    <span className={trade.tp ? "text-green-500" : "text-red-500"}>
                      {trade.tp ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Risk:Reward Ratio</span>
                    <span className={riskRewardRatio >= 1 ? "text-green-500" : "text-yellow-500"}>
                      1:{riskRewardRatio.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Trade Outcome</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Result</span>
                    <span className={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                      {trade.pnl >= 0 ? "Win" : "Loss"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">P/L</span>
                    <span className={trade.pnl >= 0 ? "text-[#089981]" : "text-[#f23645]"}>
                      {trade.pnl >= 0 ? '+' : ''}${Number(trade.pnl).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Performance Rating</span>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg 
                          key={star} 
                          className={`h-4 w-4 ${
                            (trade.pnl >= 0 && hasRules) || star <= 3 
                              ? "text-yellow-400" 
                              : "text-gray-300"
                          }`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 