'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getDoc, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
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

interface Trade {
  id: string;
  symbol: string;
  date: {
    seconds: number;
    nanoseconds: number;
  };
  type: string;
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  notes?: string;
  accountId: string;
  accountName: string;
}

interface Account {
  id: string;
  name: string;
  broker: string;
  type: string;
  trades: any[];
}

export default function TradesPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmptyState, setIsEmptyState] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Fetch the user doc to get access to accounts
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (!userDoc.exists()) {
          setIsEmptyState(true);
          setLoading(false);
          return;
        }
        
        const userData = userDoc.data();
        
        // Check if the user has accounts
        if (!userData.accounts || userData.accounts.length === 0) {
          setIsEmptyState(true);
          setLoading(false);
          return;
        }
        
        // Get all accounts
        const userAccounts = userData.accounts;
        setAccounts(userAccounts);
        
        // Collect all trades from all accounts
        const allTrades: Trade[] = [];
        
        userAccounts.forEach((account: any) => {
          if (account.trades && Array.isArray(account.trades)) {
            account.trades.forEach((trade: any) => {
              allTrades.push({
                ...trade,
                id: trade.id || `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                accountId: account.id,
                accountName: account.broker
              });
            });
          }
        });
        
        // Sort trades by date (newest first)
        allTrades.sort((a, b) => b.date.seconds - a.date.seconds);
        
        console.log(`Found ${allTrades.length} trades across all accounts`);
        
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

  const applyFilters = () => {
    let filtered = [...trades];
    
    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(trade => 
        trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply account filter
    if (selectedAccount !== 'all') {
      filtered = filtered.filter(trade => trade.accountId === selectedAccount);
    }
    
    // Apply type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(trade => trade.type === selectedType);
    }
    
    // Apply result filter
    if (selectedResult !== 'all') {
      if (selectedResult === 'profit') {
        filtered = filtered.filter(trade => trade.pnl > 0);
      } else {
        filtered = filtered.filter(trade => trade.pnl < 0);
      }
    }
    
    setFilteredTrades(filtered);
  };

  // Call applyFilters when any filter changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedAccount, selectedType, selectedResult, trades]);

  const handleDeleteTrade = async (trade: Trade) => {
    if (!user || isDeleting) return;
    
    try {
      setIsDeleting(true);
      
      // Find the account that contains this trade
      const account = accounts.find(acc => acc.id === trade.accountId);
      if (!account) {
        toast.error("Account not found");
        return;
      }
      
      // Find the trade within the account's trades array
      const tradeToRemove = account.trades.find((t: any) => t.id === trade.id);
      if (!tradeToRemove) {
        toast.error("Trade not found in account");
        return;
      }
      
      // Update the user document to remove the trade from the account's trades array
      const userRef = doc(db, "users", user.uid);
      
      // Get the current user document to get the latest state
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        toast.error("User document not found");
        return;
      }
      
      const userData = userDoc.data();
      const accountIndex = userData.accounts.findIndex((acc: any) => acc.id === trade.accountId);
      
      if (accountIndex === -1) {
        toast.error("Account not found in user document");
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
      setTrades(prevTrades => prevTrades.filter(t => t.id !== trade.id));
      
      toast.success("Trade deleted successfully");
    } catch (error) {
      console.error("Error deleting trade:", error);
      toast.error("Failed to delete trade");
    } finally {
      setIsDeleting(false);
      setTradeToDelete(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold">Trades History</h1>
        <Link href="/dashboard/trades/new">
          <Button className="shadow-sm w-full md:w-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Trade
          </Button>
        </Link>
      </div>
      
      {isEmptyState ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <line x1="12" x2="12" y1="8" y2="16" />
                <line x1="8" x2="16" y1="12" y2="12" />
              </svg>
            </div>
            <p className="text-muted-foreground mb-4">You don't have any trades yet.</p>
            <Link href="/dashboard/trades/new">
              <Button className="shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Your First Trade
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm">
            <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                    placeholder="Search by symbol or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
              />
            </div>
                <div>
                  <Select 
                    value={selectedAccount} 
                    onValueChange={setSelectedAccount}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.broker}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            <div>
              <Select
                    value={selectedType} 
                    onValueChange={setSelectedType}
              >
                <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="long">Long</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                    value={selectedResult} 
                    onValueChange={setSelectedResult}
              >
                <SelectTrigger>
                      <SelectValue placeholder="Select Result" />
                </SelectTrigger>
                <SelectContent>
                      <SelectItem value="all">All Results</SelectItem>
                      <SelectItem value="profit">Profitable</SelectItem>
                      <SelectItem value="loss">Loss</SelectItem>
                </SelectContent>
              </Select>
            </div>
              </div>
        </CardContent>
      </Card>
      
          <Card className="shadow-md">
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
                    <th className="px-4 py-3 font-medium text-left">Size</th>
                    <th className="px-4 py-3 font-medium text-right">P/L</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrades.map((trade, index) => (
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
                        {trade.accountName}
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
                      <td className="px-4 py-3">{Number(trade.size).toLocaleString('en-US')}</td>
                      <td className={`px-4 py-3 text-right font-medium ${trade.pnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{Number(trade.pnl).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center space-x-2">
                          <Link href={`/dashboard/trades/${trade.id}`}>
                            <Button size="sm" variant="outline" className="h-8 px-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                            </Button>
                          </Link>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setTradeToDelete(trade)}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Trade</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this trade record? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => tradeToDelete && handleDeleteTrade(tradeToDelete)}
                                  disabled={isDeleting}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {isDeleting ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
          )}
    </div>
  );
} 