'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

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

interface Account {
  id: string;
  broker: string;
  type: 'real' | 'demo' | 'prop';
}

export default function TradesPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmptyState, setIsEmptyState] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // Filters
  const [filters, setFilters] = useState({
    symbol: '',
    account: 'all',
    type: 'all',
    dateRange: 'all'
  });

  // Get all trades from user accounts
  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) return;
      
      try {
        // Fetch the user document
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!userDoc.exists()) {
          setIsEmptyState(true);
          setLoading(false);
          return;
        }
        
        const userData = userDoc.data();
        
        // Check if user has accounts
        if (!userData.accounts || userData.accounts.length === 0) {
          setIsEmptyState(true);
          setLoading(false);
          return;
        }
        
        // Process accounts and extract trades
        const userAccounts = userData.accounts || [];
        setAccounts(userAccounts.map((acc: any) => ({
          id: acc.id,
          broker: acc.broker,
          type: acc.type || 'demo'
        })));
        
        // Collect all trades from all accounts
        const allTrades: Trade[] = [];
        
        userAccounts.forEach((account: any) => {
          if (account.trades && account.trades.length > 0) {
            const accountTrades = account.trades.map((trade: any) => ({
              ...trade,
              accountId: account.id,
              accountName: account.broker
            }));
            
            allTrades.push(...accountTrades);
          }
        });
        
        // Sort by date (newest first)
        allTrades.sort((a, b) => {
          return (b.date?.seconds || 0) - (a.date?.seconds || 0);
        });
        
        console.log(`Found ${allTrades.length} trades across ${userAccounts.length} accounts`);
        
        setTrades(allTrades);
        setFilteredTrades(allTrades);
        setIsEmptyState(allTrades.length === 0);
      } catch (error) {
        console.error("Error fetching trades:", error);
        toast.error("Failed to load trades");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrades();
  }, [user]);
  
  // Apply filters when filter state changes
  useEffect(() => {
    applyFilters();
  }, [filters]);
  
  const applyFilters = () => {
    let filtered = [...trades];
    
    // Filter by symbol
    if (filters.symbol) {
      filtered = filtered.filter(trade => 
        trade.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
      );
    }
    
    // Filter by account
    if (filters.account && filters.account !== 'all') {
      filtered = filtered.filter(trade => trade.accountId === filters.account);
    }
    
    // Filter by trade type
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(trade => trade.type === filters.type);
    }
    
    // Filter by date range
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(0); // Beginning of time
      }
      
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      
      filtered = filtered.filter(trade => 
        (trade.date?.seconds || 0) >= startTimestamp
      );
    }
    
    setFilteredTrades(filtered);
  };
  
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleReset = () => {
    setFilters({
      symbol: '',
      account: 'all',
      type: 'all',
      dateRange: 'all'
    });
    setFilteredTrades(trades);
  };
  
  if (loading) {
    return <div className="flex justify-center p-6">Loading trades...</div>;
  }
  
  if (isEmptyState) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Trades</h1>
          <Link href="/dashboard/trades/new">
            <Button>Add Your First Trade</Button>
          </Link>
        </div>
        
        <Card className="flex flex-col items-center justify-center p-10 text-center">
          <div className="rounded-full bg-primary/10 p-6 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">No trades yet</h3>
          <p className="text-muted-foreground mb-6">Start by adding your first trade to track your performance</p>
          <Link href="/dashboard/trades/new">
            <Button size="lg">Add Your First Trade</Button>
          </Link>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trades</h1>
        <Link href="/dashboard/trades/new">
          <Button>Add New Trade</Button>
        </Link>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter your trades by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-full md:w-auto md:flex-1">
              <Input
                placeholder="Filter by symbol..."
                value={filters.symbol}
                onChange={(e) => handleFilterChange('symbol', e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-auto md:flex-1">
              <Select 
                value={filters.account} 
                onValueChange={(value) => handleFilterChange('account', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.broker} ({account.type.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-auto md:flex-1">
              <Select 
                value={filters.type} 
                onValueChange={(value) => handleFilterChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-auto md:flex-1">
              <Select 
                value={filters.dateRange} 
                onValueChange={(value) => handleFilterChange('dateRange', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                  <SelectItem value="year">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" onClick={handleReset}>Reset</Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Trades table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Trades</CardTitle>
              <CardDescription>
                {filteredTrades.length} {filteredTrades.length === 1 ? 'trade' : 'trades'} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Entry</th>
                  <th className="px-4 py-3 font-medium">Exit</th>
                  <th className="px-4 py-3 font-medium text-right">P/L</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map(trade => (
                  <tr key={trade.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(trade.date.seconds * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {trade.accountName || 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        trade.type === 'long' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">${trade.entry.toFixed(2)}</td>
                    <td className="px-4 py-3">${trade.exit.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
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
        </CardContent>
      </Card>
    </div>
  );
} 