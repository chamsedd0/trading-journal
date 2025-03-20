'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckIcon, PlusIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface Account {
  id: string;
  broker: string;
  accountType: string;
  type: 'real' | 'demo' | 'prop';
  balance: number;
}

export default function NewTradePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [tradeData, setTradeData] = useState({
    symbol: '',
    date: new Date().toISOString().slice(0, 10), // Today's date in YYYY-MM-DD format
    time: new Date().toTimeString().slice(0, 8), // Current time in HH:MM:SS format
    type: 'long',
    entry: '',
    exit: '',
    size: '',
    pnl: '',
    notes: '',
    tags: []
  });

  // Fetch user accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.accounts && userData.accounts.length > 0) {
            setAccounts(userData.accounts);
            // Set default selection to first account
            setSelectedAccounts([userData.accounts[0].id]);
          } else {
            toast.error("No trading accounts found", {
              description: "Please add a trading account before adding trades",
              action: {
                label: "Add Account",
                onClick: () => router.push("/dashboard/accounts/new")
              }
            });
          }
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
        toast.error("Failed to load accounts");
      }
    };
    
    fetchAccounts();
  }, [user, router]);

  // Add a separated useEffect for calculating P&L
  useEffect(() => {
    // Skip calculation if any required value is missing
    if (!tradeData.entry || !tradeData.exit || !tradeData.size) {
      return;
    }

    const entry = parseFloat(tradeData.entry);
    const exit = parseFloat(tradeData.exit);
    const size = parseFloat(tradeData.size);

    // Skip calculation if any parsed value is invalid
    if (isNaN(entry) || isNaN(exit) || isNaN(size)) {
      return;
    }

    let pnl;
    if (tradeData.type === 'long') {
      pnl = (exit - entry) * size;
    } else {
      pnl = (entry - exit) * size;
    }
    
    const newPnl = pnl.toFixed(2);
    
    // Only update if the calculated value is different to avoid unnecessary re-renders
    if (newPnl !== tradeData.pnl) {
      setTradeData(prev => ({
        ...prev,
        pnl: newPnl
      }));
    }
  }, [tradeData.entry, tradeData.exit, tradeData.size, tradeData.type, tradeData.pnl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTradeData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setTradeData(prev => ({ ...prev, [name]: value }));
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccounts(prev => {
      if (prev.includes(accountId)) {
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to add a trade");
      return;
    }
    
    if (selectedAccounts.length === 0) {
      toast.error("Please select at least one account for this trade");
      return;
    }
    
    try {
      setIsSaving(true);
      
      const [year, month, day] = tradeData.date.split('-').map(Number);
      const [hours, minutes, seconds] = tradeData.time.split(':').map(Number);
      
      const tradeDate = new Date(year, month - 1, day, hours, minutes, seconds);
      
      // Reference to the user document
      const userRef = doc(db, "users", user.uid);
      
      // Get current user data
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        toast.error("User profile not found");
        return;
      }
      
      const userData = userDoc.data();
      const existingAccounts = userData.accounts || [];
      
      // Make a copy of the accounts array to modify
      const updatedAccounts = [...existingAccounts];
      
      // Track which accounts were updated
      const updatedAccountsList: string[] = [];
      
      // Apply the trade to each selected account
      for (const accountId of selectedAccounts) {
        // Find the account to update
        const accountIndex = updatedAccounts.findIndex((acc: any) => acc.id === accountId);
        if (accountIndex === -1) continue;
        
        // Create the trade object with a unique ID for each account
        const trade = {
          id: crypto.randomUUID(),
          symbol: tradeData.symbol.toUpperCase(),
          date: {
            seconds: Math.floor(tradeDate.getTime() / 1000),
            nanoseconds: 0
          },
          type: tradeData.type,
          entry: parseFloat(tradeData.entry),
          exit: parseFloat(tradeData.exit),
          size: parseFloat(tradeData.size),
          pnl: parseFloat(tradeData.pnl),
          notes: tradeData.notes,
          createdAt: new Date().getTime()
        };
        
        // Add trade to account
        if (!updatedAccounts[accountIndex].trades) {
          updatedAccounts[accountIndex].trades = [];
        }
        
        updatedAccounts[accountIndex].trades.push(trade);
        
        // Update account balance
        const currentBalance = updatedAccounts[accountIndex].balance || 
                               updatedAccounts[accountIndex].accountSize || 0;
        updatedAccounts[accountIndex].balance = currentBalance + parseFloat(tradeData.pnl);
        
        updatedAccountsList.push(updatedAccounts[accountIndex].broker);
      }
      
      // Update the user document with the updated accounts
      await updateDoc(userRef, {
        accounts: updatedAccounts
      });
      
      const accountString = updatedAccountsList.length > 1 
        ? `${updatedAccountsList.length} accounts (${updatedAccountsList.join(', ')})`
        : updatedAccountsList[0];
      
      toast.success("Trade added successfully", {
        description: `${tradeData.symbol} trade has been added to ${accountString}`
      });
      
      // Redirect to trades page
      router.push('/dashboard/trades');
    } catch (error) {
      console.error("Error adding trade:", error);
      toast.error("Error adding trade", {
        description: "There was a problem saving your trade"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Add New Trade</h1>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>No Trading Accounts</CardTitle>
            <CardDescription>
              You need to create a trading account before adding trades
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">You don't have any trading accounts set up yet.</p>
            <Link href="/dashboard/accounts/new">
              <Button>Create Trading Account</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add New Trade</h1>
      </div>
      
      <Tabs defaultValue="details" className="max-w-3xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Trade Details</TabsTrigger>
          <TabsTrigger value="accounts">Select Accounts</TabsTrigger>
        </TabsList>
        
        <Card className="border-t-0 rounded-tl-none rounded-tr-none">
          <form onSubmit={handleSubmit}>
            <TabsContent value="details" className="m-0">
              <CardHeader>
                <CardTitle>Trade Details</CardTitle>
                <CardDescription>
                  Enter the details of your trade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      name="symbol"
                      value={tradeData.symbol}
                      onChange={handleInputChange}
                      placeholder="e.g. AAPL"
                      required
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Trade Type</Label>
                    <Select 
                      value={tradeData.type} 
                      onValueChange={(value) => handleSelectChange('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select trade type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-full bg-[#089981] mr-2" />
                            Long
                          </div>
                        </SelectItem>
                        <SelectItem value="short">
                          <div className="flex items-center">
                            <div className="h-3 w-3 rounded-full bg-[#f23645] mr-2" />
                            Short
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
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
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="entry">Entry Price</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        id="entry"
                        name="entry"
                        type="number"
                        step="0.01"
                        value={tradeData.entry}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        required
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exit">Exit Price</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        id="exit"
                        name="exit"
                        type="number"
                        step="0.01"
                        value={tradeData.exit}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        required
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="size">Position Size</Label>
                    <Input
                      id="size"
                      name="size"
                      type="number"
                      step="0.01"
                      value={tradeData.size}
                      onChange={handleInputChange}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pnl">Profit/Loss</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500">$</span>
                    </div>
                    <Input
                      id="pnl"
                      name="pnl"
                      type="number"
                      step="0.01"
                      value={tradeData.pnl}
                      onChange={handleInputChange}
                      className={`pl-7 font-medium ${
                        tradeData.pnl && !isNaN(Number(tradeData.pnl)) 
                          ? Number(tradeData.pnl) >= 0 
                            ? 'text-[#089981]' 
                            : 'text-[#f23645]'
                          : ''
                      }`}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {selectedAccounts.length > 1 && tradeData.pnl && !isNaN(Number(tradeData.pnl)) && (
                      <p>Total P/L across all selected accounts: {' '}
                        <span className={`font-medium ${Number(tradeData.pnl) >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                          ${(Number(tradeData.pnl) * selectedAccounts.length).toFixed(2)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Trade Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={tradeData.notes}
                    onChange={handleInputChange}
                    placeholder="Add your trade notes, strategy, and observations here..."
                    className="min-h-[120px]"
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    This trade will be added to {selectedAccounts.length} {selectedAccounts.length === 1 ? 'account' : 'accounts'}
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => document.querySelector('[data-value="accounts"]')?.click()}>
                    Change Accounts
                  </Button>
                </div>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="accounts" className="m-0">
              <CardHeader>
                <CardTitle>Select Trading Accounts</CardTitle>
                <CardDescription>
                  Choose which accounts this trade was executed in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium">
                      Selected: {selectedAccounts.length} {selectedAccounts.length === 1 ? 'account' : 'accounts'}
                    </span>
                    <div className="space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedAccounts([])}
                        disabled={selectedAccounts.length === 0}
                      >
                        Clear All
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedAccounts(accounts.map(acc => acc.id))}
                        disabled={selectedAccounts.length === accounts.length}
                      >
                        Select All
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {accounts.map((account) => {
                      const isSelected = selectedAccounts.includes(account.id);
                      return (
                        <div
                          key={account.id}
                          className={`p-4 border rounded-lg flex items-center cursor-pointer transition-all hover:shadow-md ${
                            isSelected 
                              ? 'bg-primary/10 border-primary ring-1 ring-primary' 
                              : 'hover:bg-muted/50 border-border'
                          }`}
                          onClick={() => toggleAccountSelection(account.id)}
                        >
                          <div className="flex items-center w-full">
                            <div className={`w-3 h-10 rounded-sm mr-3 ${isSelected ? 'bg-primary' : 'bg-gray-200'}`} />
                            <div className="flex-1">
                              <div className="font-medium">{account.broker}</div>
                              <div className="text-sm text-muted-foreground flex items-center justify-between">
                                <span>{account.type.toUpperCase()}</span>
                                <span className="font-medium">${account.balance?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                                <CheckIcon className="h-3.5 w-3.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </TabsContent>
            
            <CardFooter className="flex justify-between p-6">
              <Link href="/dashboard/trades">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button 
                type="submit" 
                disabled={isSaving || selectedAccounts.length === 0}
                className="gap-2"
              >
                {isSaving ? "Saving..." : "Save Trade"}
                {!isSaving && <PlusIcon size={16} />}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </Tabs>
    </div>
  );
} 