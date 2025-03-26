'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { toast } from 'sonner';

interface TradeFormData {
  symbol: string;
  date: string;
  time: string;
  type: 'long' | 'short';
  marketType: string;
  entry: string;
  exit: string;
  exitTime: string;
  tp: string;
  sl: string;
  size: string;
  tickValue: string;
  pipValue: string;
  commission: string;
  pnl: string;
  notes: string;
  followedRules?: string[];
}

interface Account {
  id: string;
  broker: string;
  type: 'real' | 'demo' | 'prop';
  accountType: string;
  trades: any[];
}

export default function EditTradePage() {
  const params = useParams();
  const tradeId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [tradingPlan, setTradingPlan] = useState<any | null>(null);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [tradeData, setTradeData] = useState<TradeFormData>({
    symbol: '',
    date: '',
    time: '',
    type: 'long',
    marketType: 'futures',
    entry: '',
    exit: '',
    exitTime: '',
    tp: '',
    sl: '',
    size: '',
    tickValue: '',
    pipValue: '',
    commission: '',
    pnl: '',
    notes: ''
  });

  useEffect(() => {
    const fetchTrade = async () => {
      if (!user || !tradeId) return;

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
        
        // Get trading plan if it exists
        if (userData.tradingPlan) {
          setTradingPlan(userData.tradingPlan);
        }
        
        // Search through all accounts for the trade
        let foundTrade = null;
        let foundAccount = null;
        
        // Loop through accounts to find the trade
        for (const acc of accounts) {
          if (acc.trades && Array.isArray(acc.trades)) {
            const trade = acc.trades.find((t: any) => t.id === tradeId);
            if (trade) {
              foundTrade = trade;
              foundAccount = {
                id: acc.id,
                broker: acc.broker,
                type: acc.type || 'demo',
                accountType: acc.accountType,
                trades: acc.trades
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

        setAccount(foundAccount);

        // Convert Firestore timestamp to date/time format for the form
        const tradeDate = new Date(foundTrade.date.seconds * 1000);
        
        // Initialize selected rules if there are any
        if (foundTrade.followedRules && foundTrade.followedRules.length > 0) {
          setSelectedRules(foundTrade.followedRules);
        }
        
        setTradeData({
          symbol: foundTrade.symbol || '',
          date: tradeDate.toISOString().slice(0, 10), // YYYY-MM-DD format
          time: foundTrade.time || tradeDate.toTimeString().slice(0, 8), // HH:MM:SS format
          type: foundTrade.type || 'long',
          marketType: foundTrade.marketType || 'futures',
          entry: foundTrade.entry.toString() || '',
          exit: foundTrade.exit.toString() || '',
          exitTime: foundTrade.exitTime || '',
          tp: foundTrade.tp?.toString() || '',
          sl: foundTrade.sl?.toString() || '',
          size: foundTrade.size.toString() || '',
          tickValue: foundTrade.tickValue?.toString() || '',
          pipValue: foundTrade.pipValue?.toString() || '',
          commission: foundTrade.commission?.toString() || '',
          pnl: foundTrade.pnl.toString() || '',
          notes: foundTrade.notes || ''
        });
      } catch (error) {
        console.error('Error fetching trade:', error);
        toast.error('Failed to load trade details');
      } finally {
        setLoading(false);
      }
    };

    fetchTrade();
  }, [user, tradeId, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTradeData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setTradeData(prev => ({ ...prev, [name]: value }));
  };

  const toggleRuleSelection = (rule: string) => {
    setSelectedRules(prev => {
      if (prev.includes(rule)) {
        return prev.filter(r => r !== rule);
      } else {
        return [...prev, rule];
      }
    });
  };

  const calculatePnL = () => {
    if (!tradeData.entry || !tradeData.exit || !tradeData.size) return;

    const entry = parseFloat(tradeData.entry);
    const exit = parseFloat(tradeData.exit);
    const size = parseFloat(tradeData.size);
    const commission = parseFloat(tradeData.commission || '0');

    if (isNaN(entry) || isNaN(exit) || isNaN(size)) return;

    let pnl;
    const totalCommission = commission * size;
    
    // Calculate PNL based on market type
    if (tradeData.marketType === 'futures' || tradeData.marketType === 'stocks') {
      // Calculate ticks
      const tickValue = parseFloat(tradeData.tickValue || '0');
      if (isNaN(tickValue)) return;
      
      const tickSize = 1; // Default tick size of 1 point
      
      if (tradeData.type === 'long') {
        pnl = ((exit - entry) * tickValue * size) - totalCommission;
      } else {
        pnl = ((entry - exit) * tickValue * size) - totalCommission;
      }
    } else if (tradeData.marketType === 'forex' || tradeData.marketType === 'crypto') {
      // Calculate pips
      const pipValue = parseFloat(tradeData.pipValue || '0');
      if (isNaN(pipValue)) return;
      
      // For forex, we calculate in pips (0.0001 for most pairs, 0.01 for JPY pairs)
      const isPipDecimal = !tradeData.symbol.includes('JPY');
      const pipSize = isPipDecimal ? 0.0001 : 0.01;
      
    if (tradeData.type === 'long') {
        pnl = ((exit - entry) / pipSize * pipValue * size) - totalCommission;
      } else {
        pnl = ((entry - exit) / pipSize * pipValue * size) - totalCommission;
      }
    } else {
      // Default calculation for other markets (direct price difference)
      if (tradeData.type === 'long') {
        pnl = ((exit - entry) * size) - totalCommission;
      } else {
        pnl = ((entry - exit) * size) - totalCommission;
      }
    }

    setTradeData(prev => ({ ...prev, pnl: pnl.toFixed(2) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !tradeId || !account) return;
    
    try {
      setIsSaving(true);
      
      const [year, month, day] = tradeData.date.split('-').map(Number);
      const [hours, minutes, seconds] = tradeData.time.split(':').map(Number);
      
      const tradeDate = new Date(year, month - 1, day, hours, minutes, seconds);
      
      // Create the updated trade object
      const updatedTrade = {
        symbol: tradeData.symbol.toUpperCase(),
        date: {
          seconds: Math.floor(tradeDate.getTime() / 1000),
          nanoseconds: 0
        },
        type: tradeData.type,
        marketType: tradeData.marketType,
        entry: parseFloat(tradeData.entry),
        exit: parseFloat(tradeData.exit),
        exitTime: tradeData.exitTime,
        tp: tradeData.tp ? parseFloat(tradeData.tp) : null,
        sl: tradeData.sl ? parseFloat(tradeData.sl) : null,
        size: parseFloat(tradeData.size),
        tickValue: tradeData.marketType === 'futures' || tradeData.marketType === 'stocks' 
          ? parseFloat(tradeData.tickValue) 
          : null,
        pipValue: tradeData.marketType === 'forex' || tradeData.marketType === 'crypto' 
          ? parseFloat(tradeData.pipValue) 
          : null,
        commission: parseFloat(tradeData.commission || '0'),
        pnl: parseFloat(tradeData.pnl),
        notes: tradeData.notes,
        followedRules: selectedRules.length > 0 ? selectedRules : [],
        updatedAt: new Date().getTime()
      };
      
      // Get the user reference
      const userRef = doc(db, 'users', user.uid);
      
      // Get current user data
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        toast.error("User profile not found");
        return;
      }
      
      const userData = userDoc.data();
      const accounts = userData.accounts || [];
      
      // Find the account and update the trade
      const accountIndex = accounts.findIndex((acc: any) => acc.id === account.id);
      if (accountIndex === -1) {
        toast.error("Account not found");
        return;
      }
      
      // Find the trade and update it
      const trades = accounts[accountIndex].trades || [];
      const tradeIndex = trades.findIndex((t: any) => t.id === tradeId);
      if (tradeIndex === -1) {
        toast.error("Trade not found in account");
        return;
      }
      
      // Calculate balance adjustment
      const oldPnl = trades[tradeIndex].pnl;
      const newPnl = parseFloat(tradeData.pnl);
      const pnlDifference = newPnl - oldPnl;
      
      // Update the trade
      accounts[accountIndex].trades[tradeIndex] = {
        ...trades[tradeIndex],
        ...updatedTrade
      };
      
      // Adjust the account balance
      if (accounts[accountIndex].balance) {
        accounts[accountIndex].balance += pnlDifference;
      }
      
      // Update the user document with the updated accounts
      await updateDoc(userRef, {
        accounts: accounts
      });
      
      toast.success('Trade updated successfully');
      
      // Redirect to trade details
      router.push(`/dashboard/trades/${tradeId}`);
    } catch (error) {
      console.error('Error updating trade:', error);
      toast.error('Failed to update trade');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Trade</h1>
        
        <div className="flex space-x-2">
          <Link href={`/dashboard/trades/${tradeId}`}>
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      </div>
      
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Trade Details</CardTitle>
            <CardDescription>
              Update the details of your trade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  name="symbol"
                  value={tradeData.symbol}
                  onChange={handleInputChange}
                  placeholder="e.g. AAPL"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select 
                  value={tradeData.type} 
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trade type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="marketType">Market Type</Label>
              <Select 
                value={tradeData.marketType} 
                onValueChange={(value) => handleSelectChange('marketType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select market type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="futures">Futures</SelectItem>
                  <SelectItem value="forex">Forex</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="options">Options</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={tradeData.date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  name="time"
                  type="time"
                  step="1"
                  value={tradeData.time}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entry">Entry Price</Label>
                <Input
                  id="entry"
                  name="entry"
                  type="number"
                  step="0.01"
                  value={tradeData.entry}
                  onChange={(e) => {
                    handleInputChange(e);
                    setTimeout(calculatePnL, 100);
                  }}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exit">Exit Price</Label>
                <Input
                  id="exit"
                  name="exit"
                  type="number"
                  step="0.01"
                  value={tradeData.exit}
                  onChange={(e) => {
                    handleInputChange(e);
                    setTimeout(calculatePnL, 100);
                  }}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitTime">Exit Time</Label>
                <Input
                  id="exitTime"
                  name="exitTime"
                  type="time"
                  step="1"
                  value={tradeData.exitTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tp">Take Profit (TP)</Label>
                <Input
                  id="tp"
                  name="tp"
                  type="number"
                  step="0.01"
                  value={tradeData.tp}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sl">Stop Loss (SL)</Label>
                <Input
                  id="sl"
                  name="sl"
                  type="number"
                  step="0.01"
                  value={tradeData.sl}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  name="size"
                  type="number"
                  step="0.01"
                  value={tradeData.size}
                  onChange={(e) => {
                    handleInputChange(e);
                    setTimeout(calculatePnL, 100);
                  }}
                  placeholder="0"
                  required
                />
              </div>
            </div>
            
            {/* Market specific fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor={tradeData.marketType === 'forex' || tradeData.marketType === 'crypto' ? 'pipValue' : 'tickValue'}>
                  {tradeData.marketType === 'forex' || tradeData.marketType === 'crypto'
                    ? 'Pip Value ($)'
                    : 'Tick Value ($)'}
                </Label>
                <Input
                  id={tradeData.marketType === 'forex' || tradeData.marketType === 'crypto' ? 'pipValue' : 'tickValue'}
                  name={tradeData.marketType === 'forex' || tradeData.marketType === 'crypto' ? 'pipValue' : 'tickValue'}
                  type="number"
                  step="0.01"
                  value={tradeData.marketType === 'forex' || tradeData.marketType === 'crypto' ? tradeData.pipValue : tradeData.tickValue}
                  onChange={(e) => {
                    handleInputChange(e);
                    setTimeout(calculatePnL, 100);
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Commission</Label>
                <Input
                  id="commission"
                  name="commission"
                  type="number"
                  step="0.01"
                  value={tradeData.commission}
                  onChange={(e) => {
                    handleInputChange(e);
                    setTimeout(calculatePnL, 100);
                  }}
                  placeholder="0.00"
                />
              </div>
            <div className="space-y-2">
              <Label htmlFor="pnl">P&L</Label>
              <Input
                id="pnl"
                name="pnl"
                type="number"
                step="0.01"
                value={tradeData.pnl}
                onChange={handleInputChange}
                placeholder="0.00"
                required
                  className={`${
                    parseFloat(tradeData.pnl) >= 0 
                      ? 'text-[#089981]' 
                      : 'text-[#f23645]'
                  }`}
              />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={tradeData.notes}
                onChange={handleInputChange}
                placeholder="Add your trade notes here..."
                className="min-h-[100px]"
              />
            </div>
            
            {tradingPlan && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-medium">Trading Plan Rules</h3>
                
                {tradingPlan.concepts && tradingPlan.concepts.length > 0 && (
                  <div className="space-y-2">
                    <Label>Trading Concepts</Label>
                    <div className="space-y-2">
                      {tradingPlan.concepts.map((concept: string, index: number) => (
                        <div 
                          key={`concept-${index}`}
                          className={`p-3 rounded-md border flex items-center gap-2 cursor-pointer ${
                            selectedRules.includes(concept) ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleRuleSelection(concept)}
                        >
                          <div className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                            selectedRules.includes(concept) ? 'bg-primary border-primary' : 'border-input'
                          }`}>
                            {selectedRules.includes(concept) && <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                          </div>
                          <span className="text-sm">{concept}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {tradingPlan.entryRules && tradingPlan.entryRules.length > 0 && (
                  <div className="space-y-2">
                    <Label>Entry Rules</Label>
                    <div className="space-y-2">
                      {tradingPlan.entryRules.map((rule: string, index: number) => (
                        <div 
                          key={`rule-${index}`}
                          className={`p-3 rounded-md border flex items-center gap-2 cursor-pointer ${
                            selectedRules.includes(rule) ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleRuleSelection(rule)}
                        >
                          <div className={`w-5 h-5 rounded-sm border flex items-center justify-center ${
                            selectedRules.includes(rule) ? 'bg-primary border-primary' : 'border-input'
                          }`}>
                            {selectedRules.includes(rule) && <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                          </div>
                          <span className="text-sm">{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href={`/dashboard/trades/${tradeId}`}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 