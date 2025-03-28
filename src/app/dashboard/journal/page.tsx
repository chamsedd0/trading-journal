'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  ArrowRight, 
  CalendarDays, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Clock,
  DollarSign,
  PieChart,
  Layers,
  Calendar as CalendarIcon,
  PlusCircle,
  Save,
  Edit,
  X,
  Trash
} from 'lucide-react';
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";

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
  notes?: string;
  accountId: string;
}

interface Account {
  id: string;
  name: string;
  broker: string;
  type: 'real' | 'demo' | 'prop';
  trades: Trade[];
}

interface DayData {
  trades: Trade[];
  pnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
}

interface WeekData {
  startDate: Date;
  endDate: Date;
  pnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
}

interface TradingPlan {
  concepts: string[];
  entryRules: string[];
  riskManagement: {
    planType: string;
    riskPercentage: number;
    reduceRiskAfterLoss: boolean;
    targetRiskRewardRatio: number;
    customRules?: string[];
  };
}

// Add new interface for weekly view data
interface WeekViewData {
  date: Date;
  dayData: DayData | undefined;
}

export default function JournalPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedAccountType, setSelectedAccountType] = useState<string>('real');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dayData, setDayData] = useState<Map<string, DayData>>(new Map());
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalPnl: 0,
    tradeCount: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedDayTrades, setSelectedDayTrades] = useState<Trade[]>([]);
  const [tradingPlan, setTradingPlan] = useState<TradingPlan | null>(null);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editingTradingPlan, setEditingTradingPlan] = useState<TradingPlan | null>(null);
  const [newConcept, setNewConcept] = useState('');
  const [newEntryRule, setNewEntryRule] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Mobile specific states
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Start with the current day and go back to include the last 7 days
    const today = new Date();
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - 6); // Go back 6 days from today to show current day + previous 6 days
    startDay.setHours(0, 0, 0, 0);
    return startDay;
  });
  const isMobile = useMediaQuery("(max-width: 500px)");
  const [weekViewData, setWeekViewData] = useState<WeekViewData[]>([]);
  const [weekViewStats, setWeekViewStats] = useState({
    totalPnl: 0,
    tradeCount: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
  });

  // Function to get the first day of the month
  const getMonthStart = (date: Date) => {
    const newDate = new Date(date);
    newDate.setDate(1);
    return newDate;
  };

  // Function to get the last day of the month
  const getMonthEnd = (date: Date) => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + 1);
    newDate.setDate(0);
    return newDate;
  };

  // Generate an array of weeks for the current month
  const getWeeksInMonth = (date: Date) => {
    const monthStart = getMonthStart(date);
    const monthEnd = getMonthEnd(date);
    
    // Find the first Sunday before or on the first day of the month
    const firstSunday = new Date(monthStart);
    const day = firstSunday.getDay();
    firstSunday.setDate(firstSunday.getDate() - day);
    
    const weeks: { start: Date; end: Date }[] = [];
    let currentWeekStart = new Date(firstSunday);
    
    while (currentWeekStart <= monthEnd) {
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
      
      weeks.push({
        start: new Date(currentWeekStart),
        end: new Date(currentWeekEnd),
      });
      
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return weeks;
  };

  // Format date to YYYY-MM-DD for indexing
  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Navigate to previous month
  const previousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  // Navigate to next month
  const nextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };

  // Navigate to current month
  const currentMonth = () => {
    setSelectedMonth(new Date());
  };

  // Fetch user accounts and trades
  useEffect(() => {
    const fetchAccounts = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          toast.error('User data not found');
          return;
        }

        const userData = userDoc.data();
        const userAccounts = userData.accounts || [];
        setAccounts(userAccounts);

        // Extract the trading plan if it exists
        if (userData.tradingPlan) {
          setTradingPlan(userData.tradingPlan);
          setEditingTradingPlan(JSON.parse(JSON.stringify(userData.tradingPlan))); // Deep copy for editing
        }

        // Set default selected account type
        if (userAccounts.some((acc: any) => acc.type === 'real')) {
          setSelectedAccountType('real');
        } else if (userAccounts.some((acc: any) => acc.type === 'prop')) {
          setSelectedAccountType('prop');
        } else {
          setSelectedAccountType('demo');
        }
      } catch (error) {
        console.error('Error fetching accounts:', error);
        toast.error('Failed to load accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [user]);

  // Process trades data when accounts or selected month changes
  useEffect(() => {
    if (accounts.length === 0) return;

    // Filter accounts by type
    const filteredAccounts = accounts.filter(account => 
      selectedAccountType === 'all' || account.type === selectedAccountType
    );

    // Filter by specific account if selected
    const accountsToProcess = selectedAccountId === 'all' 
      ? filteredAccounts 
      : filteredAccounts.filter(account => account.id === selectedAccountId);

    // Get month boundaries
    const monthStart = getMonthStart(selectedMonth);
    const monthEnd = getMonthEnd(selectedMonth);
    monthStart.setHours(0, 0, 0, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // Process day data
    const newDayData = new Map<string, DayData>();
    let monthlyPnl = 0;
    let monthlyTradeCount = 0;
    let monthlyWins = 0;
    let monthlyLosses = 0;

    // Process all trades from selected accounts
    accountsToProcess.forEach(account => {
      if (!account.trades) return;

      account.trades.forEach(trade => {
        const tradeDate = new Date(trade.date.seconds * 1000);
        
        // Only include trades from the selected month
        if (tradeDate >= monthStart && tradeDate <= monthEnd) {
          const dateKey = formatDateKey(tradeDate);
          
          // Initialize day data if not exist
          if (!newDayData.has(dateKey)) {
            newDayData.set(dateKey, {
              trades: [],
              pnl: 0,
              tradeCount: 0,
              winCount: 0,
              lossCount: 0
            });
          }
          
          // Add trade to the day
          const dayInfo = newDayData.get(dateKey)!;
          dayInfo.trades.push(trade);
          dayInfo.pnl += trade.pnl;
          dayInfo.tradeCount += 1;
          
          // Track win/loss
          if (trade.pnl > 0) {
            dayInfo.winCount += 1;
            monthlyWins += 1;
          } else if (trade.pnl < 0) {
            dayInfo.lossCount += 1;
            monthlyLosses += 1;
          }
          
          // Update monthly stats
          monthlyPnl += trade.pnl;
          monthlyTradeCount += 1;
        }
      });
    });

    setDayData(newDayData);
    
    // Calculate weekly data
    const weeks = getWeeksInMonth(selectedMonth);
    const newWeekData: WeekData[] = weeks.map(week => {
      let weekPnl = 0;
      let weekTradeCount = 0;
      let weekWins = 0;
      let weekLosses = 0;
      
      // Iterate through each day in the week
      const current = new Date(week.start);
      while (current <= week.end) {
        const dateKey = formatDateKey(current);
        const dayInfo = newDayData.get(dateKey);
        
        if (dayInfo) {
          weekPnl += dayInfo.pnl;
          weekTradeCount += dayInfo.tradeCount;
          weekWins += dayInfo.winCount;
          weekLosses += dayInfo.lossCount;
        }
        
        current.setDate(current.getDate() + 1);
      }
      
      return {
        startDate: week.start,
        endDate: week.end,
        pnl: weekPnl,
        tradeCount: weekTradeCount,
        winCount: weekWins,
        lossCount: weekLosses,
        winRate: weekWins + weekLosses > 0 ? (weekWins / (weekWins + weekLosses)) * 100 : 0
      };
    });
    
    setWeekData(newWeekData);

    // Set monthly stats
    setMonthlyStats({
      totalPnl: monthlyPnl,
      tradeCount: monthlyTradeCount,
      winCount: monthlyWins,
      lossCount: monthlyLosses,
      winRate: monthlyWins + monthlyLosses > 0 ? (monthlyWins / (monthlyWins + monthlyLosses)) * 100 : 0
    });
  }, [accounts, selectedMonth, selectedAccountType, selectedAccountId]);

  // Handle day selection
  const handleDaySelect = (day: Date) => {
    // Format the date to match our keys
    const dateKey = formatDateKey(day);
    const dayInfo = dayData.get(dateKey);
    
    // If this day has trades, set it as selected
    if (dayInfo && dayInfo.tradeCount > 0) {
      setSelectedDay(day);
      setSelectedDayTrades(dayInfo.trades);
    } else {
      // Otherwise clear selection
      setSelectedDay(null);
      setSelectedDayTrades([]);
    }
  };

  // Custom calendar day renderer
  const renderCalendarDay = (day: Date, displaySelectedDay: Date | undefined) => {
    const dateKey = formatDateKey(day);
    const dayInfo = dayData.get(dateKey);
    
    // Only show trade data for days in the current month
    const isCurrentMonth = day.getMonth() === selectedMonth.getMonth();
    const isSelected = selectedDay && day.toDateString() === selectedDay.toDateString();
    const isToday = day.toDateString() === new Date().toDateString();
    
    return (
      <div className="relative w-full">
        <div className="pt-[100%]"></div>
        <div 
          className={cn(
            "w-full aspect-square flex flex-col rounded-md shadow-sm cursor-default p-2",
            !isCurrentMonth && "opacity-40",
            isSelected && "ring-1 ring-inset ring-primary",
            isToday && "ring-2 ring-inset ring-primary",
            dayInfo && dayInfo.pnl !== 0 && "cursor-pointer hover:bg-muted/10",
            dayInfo && dayInfo.pnl > 0 && "bg-green-950/20",
            dayInfo && dayInfo.pnl < 0 && "bg-red-950/20"
          )}
          onClick={() => dayInfo?.tradeCount ? handleDaySelect(day) : null}
        >
          <div className={cn(
            "text-sm text-center", 
            isToday && "font-bold text-primary"
          )}>
            {day.getDate()}
          </div>
          
          {dayInfo && dayInfo.pnl !== 0 && (
            <div className="mt-auto space-y-1 text-center">
              {dayInfo.pnl !== 0 && (
                <div className={cn(
                  "w-2 h-2 rounded-full mx-auto mb-1",
                  dayInfo.pnl > 0 ? "bg-green-500" : "bg-red-500"
                )}></div>
              )}
              <div className={cn(
                "text-xs font-medium",
                dayInfo.pnl > 0 ? "text-green-500" : "text-red-500"
              )}>
                {formatCurrency(dayInfo.pnl)}
              </div>
              <div className="text-xs text-muted-foreground">
                {dayInfo.lossCount > 0 && <span className="text-red-500">{dayInfo.lossCount}L</span>}
                {dayInfo.lossCount > 0 && " "}
                {dayInfo.tradeCount}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Filter for available accounts of selected type
  const availableAccounts = useMemo(() => {
    return accounts.filter(account => 
      selectedAccountType === 'all' || account.type === selectedAccountType
    );
  }, [accounts, selectedAccountType]);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Function to handle saving trading plan changes
  const saveTradingPlan = async () => {
    if (!user || !editingTradingPlan) return;
    
    try {
      setIsSaving(true);
      
      await updateDoc(doc(db, 'users', user.uid), {
        tradingPlan: editingTradingPlan,
        updatedAt: serverTimestamp()
      });
      
      setTradingPlan(editingTradingPlan);
      setIsEditingPlan(false);
      toast.success('Trading plan updated successfully');
    } catch (error) {
      console.error('Error updating trading plan:', error);
      toast.error('Failed to update trading plan');
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle canceling edits
  const cancelEditing = () => {
    if (tradingPlan) {
      setEditingTradingPlan(JSON.parse(JSON.stringify(tradingPlan))); // Reset to original
    }
    setIsEditingPlan(false);
  };

  // Function to handle adding a new concept
  const addConcept = () => {
    if (!newConcept.trim() || !editingTradingPlan) return;
    
    setEditingTradingPlan({
      ...editingTradingPlan,
      concepts: [...(editingTradingPlan.concepts || []), newConcept.trim()]
    });
    setNewConcept('');
  };

  // Function to handle removing a concept
  const removeConcept = (index: number) => {
    if (!editingTradingPlan) return;
    
    const newConcepts = [...editingTradingPlan.concepts];
    newConcepts.splice(index, 1);
    
    setEditingTradingPlan({
      ...editingTradingPlan,
      concepts: newConcepts
    });
  };

  // Function to handle adding a new entry rule
  const addEntryRule = () => {
    if (!newEntryRule.trim() || !editingTradingPlan) return;
    
    setEditingTradingPlan({
      ...editingTradingPlan,
      entryRules: [...(editingTradingPlan.entryRules || []), newEntryRule.trim()]
    });
    setNewEntryRule('');
  };

  // Function to handle removing an entry rule
  const removeEntryRule = (index: number) => {
    if (!editingTradingPlan) return;
    
    const newEntryRules = [...editingTradingPlan.entryRules];
    newEntryRules.splice(index, 1);
    
    setEditingTradingPlan({
      ...editingTradingPlan,
      entryRules: newEntryRules
    });
  };

  // Function to update risk management settings
  const updateRiskManagement = (field: string, value: any) => {
    if (!editingTradingPlan) return;
    
    setEditingTradingPlan({
      ...editingTradingPlan,
      riskManagement: {
        ...editingTradingPlan.riskManagement,
        [field]: value
      }
    });
  };

  // Function to get the last 7 days for mobile view
  const getLastSevenDays = (startDate: Date) => {
    const result: Date[] = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      result.push(day);
    }
    
    return result;
  };

  // Navigate to previous week for mobile view
  const previousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  // Navigate to next week for mobile view
  const nextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  // Navigate to current week for mobile view
  const currentWeek = () => {
    const today = new Date();
    const startDay = new Date(today);
    startDay.setDate(today.getDate() - 6); // Show last week including today
    startDay.setHours(0, 0, 0, 0);
    setCurrentWeekStart(startDay);
  };

  // Update week view data when needed
  useEffect(() => {
    // Always process and show the 7 days regardless of whether there's trade data
    const days = getLastSevenDays(currentWeekStart);
    
    // Process data for each day in the week
    const weekViewItems: WeekViewData[] = days.map(date => {
      const dateKey = formatDateKey(date);
      return {
        date,
        dayData: dayData.get(dateKey)
      };
    });
    
    setWeekViewData(weekViewItems);
    
    // Calculate stats for the visible week
    let totalPnl = 0;
    let tradeCount = 0;
    let winCount = 0;
    let lossCount = 0;
    
    weekViewItems.forEach(({ dayData }) => {
      if (dayData) {
        totalPnl += dayData.pnl;
        tradeCount += dayData.tradeCount;
        winCount += dayData.winCount;
        lossCount += dayData.lossCount;
      }
    });
    
    setWeekViewStats({
      totalPnl,
      tradeCount,
      winCount,
      lossCount,
      winRate: winCount + lossCount > 0 ? (winCount / (winCount + lossCount)) * 100 : 0
    });
  }, [currentWeekStart, dayData]);

  // Format date for mobile view (shorter format)
  const formatMobileDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
          <p className="text-muted-foreground">
            View your trading activity by day and analyze performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={selectedAccountType}
            onValueChange={setSelectedAccountType}
          >
            <SelectTrigger className="w-[110px] h-8 text-sm">
              <SelectValue placeholder="Account Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="real">Real</SelectItem>
              <SelectItem value="demo">Demo</SelectItem>
              <SelectItem value="prop">Prop</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
          >
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {availableAccounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name || account.broker}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-wrap gap-1.5 text-sm">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50">
            <Badge variant="outline" className="bg-green-500 h-2 w-2 p-0 rounded-full border-0" />
            <span>Profit</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50">
            <Badge variant="outline" className="bg-red-500 h-2 w-2 p-0 rounded-full border-0" />
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50">
            <span className="text-[10px] font-medium">3W/2L</span>
            <span>Win/Loss Count</span>
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* Mobile-specific weekly calendar view */}
        {isMobile ? (
          <Card className="md:col-span-2 border-muted-foreground/10">
            <CardHeader className="pb-1 pt-2 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Weekly View
                </CardTitle>
              </div>
              <div className="text-center mt-1 text-sm">
                <div>Weekly P/L: <span className={cn(
                  "font-medium",
                  weekViewStats.totalPnl < 0 ? "text-red-500" : "text-green-500"
                )}>{formatCurrency(weekViewStats.totalPnl)}</span></div>
              </div>
            </CardHeader>
            <CardContent className="px-3 pt-0 pb-2">
              <div>
                {/* First group of 3 days */}
                <div className="grid grid-cols-3 gap-1 mb-1">
                  {weekViewData.slice(0, 3).map((dayInfo, index) => {
                    const { date, dayData: info } = dayInfo;
                    const hasTrades = info && info.tradeCount > 0;
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div 
                        key={index}
                        className="relative"
                      >
                        <div className="pt-[100%]"></div> {/* Creates a square aspect ratio */}
                        <div 
                          className={cn(
                            "absolute inset-0 p-1 flex flex-col rounded-md transition-colors",
                            hasTrades ? "cursor-pointer" : "cursor-default",
                            info && info.pnl > 0 ? "bg-green-950/20" : 
                            info && info.pnl < 0 ? "bg-red-950/20" : 
                            "bg-muted/20",
                            isToday && "ring-1 ring-primary"
                          )}
                          onClick={() => hasTrades ? handleDaySelect(date) : null}
                        >
                          <div className={cn(
                            "text-center text-xs font-medium",
                            isToday && "text-primary"
                          )}>
                            {date.getDate()}
                          </div>
                          
                          {hasTrades ? (
                            <div className="mt-auto space-y-0.5 text-center">
                              <div className={cn(
                                "text-xs font-medium",
                                info && info.pnl > 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {formatCurrency(info?.pnl || 0)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {info?.winCount > 0 && <span className="text-green-500">{info?.winCount}W</span>}
                                {info?.winCount > 0 && info?.lossCount > 0 && '/'}
                                {info?.lossCount > 0 && <span className="text-red-500">{info?.lossCount}L</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-auto text-center">
                              <div className="text-[10px] text-muted-foreground">No trades</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Second group of 3 days */}
                <div className="grid grid-cols-3 gap-1 mb-1">
                  {weekViewData.slice(3, 6).map((dayInfo, index) => {
                    const { date, dayData: info } = dayInfo;
                    const hasTrades = info && info.tradeCount > 0;
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div 
                        key={index + 3}
                        className="relative"
                      >
                        <div className="pt-[100%]"></div> {/* Creates a square aspect ratio */}
                        <div 
                          className={cn(
                            "absolute inset-0 p-1 flex flex-col rounded-md transition-colors",
                            hasTrades ? "cursor-pointer" : "cursor-default",
                            info && info.pnl > 0 ? "bg-green-950/20" : 
                            info && info.pnl < 0 ? "bg-red-950/20" : 
                            "bg-muted/20",
                            isToday && "ring-1 ring-primary"
                          )}
                          onClick={() => hasTrades ? handleDaySelect(date) : null}
                        >
                          <div className={cn(
                            "text-center text-xs font-medium",
                            isToday && "text-primary"
                          )}>
                            {date.getDate()}
                          </div>
                          
                          {hasTrades ? (
                            <div className="mt-auto space-y-0.5 text-center">
                              <div className={cn(
                                "text-xs font-medium",
                                info?.pnl > 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {formatCurrency(info?.pnl || 0)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {info?.winCount > 0 && <span className="text-green-500">{info?.winCount}W</span>}
                                {info?.winCount > 0 && info?.lossCount > 0 && '/'}
                                {info?.lossCount > 0 && <span className="text-red-500">{info?.lossCount}L</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-auto text-center">
                              <div className="text-[10px] text-muted-foreground">No trades</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Last row with 1 day cell and navigation controls */}
                <div className="grid grid-cols-3 gap-1">
                  {/* The last day cell */}
                  <div className="relative">
                    {weekViewData.length >= 7 && (
                      <>
                        <div className="pt-[100%]"></div>
                        <div 
                          className={cn(
                            "absolute inset-0 p-1 flex flex-col rounded-md transition-colors",
                            weekViewData[6]?.dayData && weekViewData[6]?.dayData?.tradeCount > 0 ? "cursor-pointer" : "cursor-default",
                            weekViewData[6]?.dayData && weekViewData[6]?.dayData?.pnl > 0 ? "bg-green-950/20" : 
                            weekViewData[6]?.dayData && weekViewData[6]?.dayData?.pnl < 0 ? "bg-red-950/20" : 
                            "bg-muted/20",
                            weekViewData[6]?.date.toDateString() === new Date().toDateString() && "ring-1 ring-primary"
                          )}
                          onClick={() => weekViewData[6]?.dayData?.tradeCount ? handleDaySelect(weekViewData[6].date) : null}
                        >
                          <div className={cn(
                            "text-center text-xs font-medium",
                            weekViewData[6]?.date.toDateString() === new Date().toDateString() && "text-primary"
                          )}>
                            {weekViewData[6]?.date.getDate()}
                          </div>
                          
                          {weekViewData[6]?.dayData && weekViewData[6].dayData.tradeCount > 0 ? (
                            <div className="mt-auto space-y-0.5 text-center">
                              <div className={cn(
                                "text-xs font-medium",
                                weekViewData[6]?.dayData?.pnl > 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {formatCurrency(weekViewData[6]?.dayData?.pnl || 0)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {weekViewData[6]?.dayData?.winCount > 0 && <span className="text-green-500">{weekViewData[6]?.dayData?.winCount}W</span>}
                                {weekViewData[6]?.dayData?.winCount > 0 && weekViewData[6]?.dayData?.lossCount > 0 && '/'}
                                {weekViewData[6]?.dayData?.lossCount > 0 && <span className="text-red-500">{weekViewData[6]?.dayData?.lossCount}L</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-auto text-center">
                              <div className="text-[10px] text-muted-foreground">No trades</div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Navigation controls */}
                  <div className="col-span-2 flex items-center justify-end gap-1 mt-1">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={previousWeek}
                      className="h-8 w-8 rounded-md"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={nextWeek}
                      className="h-8 w-8 rounded-md"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={currentWeek}
                      className="h-8 px-2 ml-1"
                    >
                      Today
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Desktop monthly calendar view (unchanged)
        <Card className="md:col-span-2 border-muted-foreground/10">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center">
                <CalendarDays className="h-5 w-5 mr-2" />
                {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={previousMonth}
                  className="h-8 w-8 p-0 rounded-l-md"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={nextMonth}
                  className="h-8 w-8 p-0 rounded-r-md"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={currentMonth}
                  className="h-8 px-3 ml-2"
                >
                  Today
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="relative">
                  <div className="text-center mb-3">
                    <div className="text-lg font-medium">Monthly P/L: <span className={cn(
                      monthlyStats.totalPnl < 0 ? "text-red-500" : "text-green-500"
                    )}>{formatCurrency(monthlyStats.totalPnl)}</span></div>
                  </div>

                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr>
                        <th className="text-xs text-muted-foreground p-2 text-center w-[12.5%]">Su</th>
                        <th className="text-xs text-muted-foreground p-2 text-center w-[12.5%]">Mo</th>
                        <th className="text-xs text-muted-foreground p-2 text-center w-[12.5%]">Tu</th>
                        <th className="text-xs text-muted-foreground p-2 text-center w-[12.5%]">We</th>
                        <th className="text-xs text-muted-foreground p-2 text-center w-[12.5%]">Th</th>
                        <th className="text-xs text-muted-foreground p-2 text-center w-[12.5%]">Fr</th>
                        <th className="text-xs text-muted-foreground p-2 text-center w-[12.5%]">Sa</th>
                        <th className="text-xs text-muted-foreground p-2 text-center w-[12.5%]">Week</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getWeeksInMonth(selectedMonth).map((week, weekIndex) => (
                        <tr key={weekIndex} className="border-t border-muted/20">
                          {Array.from({ length: 7 }).map((_, dayIndex) => {
                            const date = new Date(week.start);
                            date.setDate(date.getDate() + dayIndex);
                            
                            const dateKey = formatDateKey(date);
                            const dayInfo = dayData.get(dateKey);
                            const isCurrentMonth = date.getMonth() === selectedMonth.getMonth();
                            const isSelected = selectedDay && date.toDateString() === selectedDay.toDateString();
                            const isToday = date.toDateString() === new Date().toDateString();
                            
                            // Calculate which days have trading data
                            const hasTrades = dayInfo && dayInfo.tradeCount > 0;
                            const hasPositivePnl = dayInfo && dayInfo.pnl > 0;
                            const hasNegativePnl = dayInfo && dayInfo.pnl < 0;
                            
                            return (
                              <td 
                                key={dateKey} 
                                className="align-top w-[12.5%] p-0 relative"
                              >
                                <div className="pt-[100%]"></div>
                                {hasTrades ? (
                                  <HoverCard>
                                    <HoverCardTrigger asChild>
                                      <div className={cn(
                                        "absolute inset-0.5 flex flex-col gap-1 justify-space-between items-center p-2 rounded-md bg-primary/2 hover:bg-primary/5 cursor-pointer",
                                        !isCurrentMonth && "opacity-40",
                                        isSelected && "ring-1 ring-inset ring-primary",
                                        isToday && "ring-2 ring-inset ring-primary",
                                        hasNegativePnl && "bg-red-950/40 hover:bg-red-950/60",
                                        hasPositivePnl && "bg-green-950/40 hover:bg-green-950/60",
                                        hasTrades && "cursor-pointer"
                                      )}
                                      onClick={() => hasTrades ? handleDaySelect(date) : null}
                                    >
                                      <div className={cn(
                                        "text-sm text-center",
                                        isToday && "font-bold text-primary"
                                      )}>
                                        {date.getDate()}
                                      </div>
                                      
                                      {hasTrades && (
                                        <div className="text-center flex flex-col items-center justify-space-between gap-1">
                                          <div className={cn(
                                            "text-xs font-medium",
                                            hasPositivePnl ? "text-green-500" : "text-red-500"
                                          )}>
                                            {formatCurrency(dayInfo.pnl)}
                                          </div>
                                          <div className="text-xs text-muted-foreground/60 mt-0.5">
                                            {dayInfo.tradeCount} trades
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-96 p-0 overflow-hidden border-none shadow-lg">
                                    <div className={cn(
                                      "bg-gradient-to-br px-4 py-3",
                                      dayInfo.pnl > 0 
                                        ? "from-green-900/90 via-green-900/70 to-background/95 border-b border-green-500/30" 
                                        : dayInfo.pnl < 0 
                                          ? "from-red-900/90 via-red-900/70 to-background/95 border-b border-red-500/30" 
                                          : "from-primary/30 via-primary/20 to-background/95 border-b border-primary/30"
                                    )}>
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <h4 className="font-bold text-base">{date.toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric'
                                          })}</h4>
                                          <p className="text-sm text-muted-foreground/90 mt-0.5 flex items-center gap-2">
                                            <span className="flex items-center gap-1">
 
                                              {dayInfo.tradeCount} trade{dayInfo.tradeCount !== 1 ? 's' : ''}
                                            </span>
                                            <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40"></span>
                                            <span className="flex items-center gap-1">

                                              {dayInfo.winCount} win{dayInfo.winCount !== 1 ? 's' : ''}
                                            </span>
                                            <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40"></span>
                                            <span className="flex items-center gap-1">

                                              {dayInfo.lossCount} loss{dayInfo.lossCount !== 1 ? 'es' : ''}
                                            </span>
                                          </p>
                                        </div>
                                        <div className={cn(
                                          "text-2xl font-bold rounded-md px-3 py-1 ",
                                          dayInfo.pnl > 0 
                                            ? "text-green-300" 
                                            : "text-red-300"
                                        )}>
                                          {formatCurrency(dayInfo.pnl)}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="p-4 bg-gradient-to-b from-background to-muted/20">
                                      <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="bg-background rounded-lg p-3 text-center shadow-sm border border-muted/50">
                                          <div className="text-xs text-muted-foreground mb-1 opacity-80">Win Rate</div>
                                          <div className="text-lg font-semibold">
                                            {dayInfo.tradeCount > 0 
                                              ? Math.round((dayInfo.winCount / dayInfo.tradeCount) * 100) 
                                              : 0}%
                                          </div>
                                          <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
                                            <div 
                                              className="bg-primary h-full rounded-full"
                                              style={{ 
                                                width: `${dayInfo.tradeCount > 0 ? Math.round((dayInfo.winCount / dayInfo.tradeCount) * 100) : 0}%` 
                                              }}
                                            ></div>
                                          </div>
                                        </div>
                                        <div className="bg-background rounded-lg p-3 text-center shadow-sm border border-muted/50">
                                          <div className="text-xs text-muted-foreground mb-1 opacity-80">Wins</div>
                                          <div className="text-lg font-semibold text-green-500">{dayInfo.winCount}</div>
                                          <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
                                            <div 
                                              className="bg-green-500 h-full rounded-full"
                                              style={{ 
                                                width: `${dayInfo.tradeCount > 0 ? Math.round((dayInfo.winCount / dayInfo.tradeCount) * 100) : 0}%` 
                                              }}
                                            ></div>
                                          </div>
                                        </div>
                                        <div className="bg-background rounded-lg p-3 text-center shadow-sm border border-muted/50">
                                          <div className="text-xs text-muted-foreground mb-1 opacity-80">Losses</div>
                                          <div className="text-lg font-semibold text-red-500">{dayInfo.lossCount}</div>
                                          <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
                                            <div 
                                              className="bg-red-500 h-full rounded-full"
                                              style={{ 
                                                width: `${dayInfo.tradeCount > 0 ? Math.round((dayInfo.lossCount / dayInfo.tradeCount) * 100) : 0}%` 
                                              }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {dayInfo.trades && dayInfo.trades.length > 0 && (
                                        <div className="mb-4">
                                          <h5 className="text-sm font-medium mb-2 border-b pb-1.5">Latest Trades</h5>
                                          <div className="space-y-2.5">
                                            {dayInfo.trades.slice(0, 3).map((trade, index) => (
                                              <div 
                                                key={index} 
                                                className={cn(
                                                  "flex justify-between items-center py-2 px-3 rounded-md border",
                                                  trade.pnl > 0 
                                                    ? "bg-green-950/30 border-green-500/30" 
                                                    : "bg-red-950/30 border-red-500/30"
                                                )}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <div className={cn(
                                                    "w-7 h-7 rounded-full flex items-center justify-center shadow-sm",
                                                    trade.type === 'long' 
                                                      ? "bg-green-900/50 text-green-400 border border-green-600/30" 
                                                      : "bg-red-900/50 text-red-400 border border-red-600/30"
                                                  )}>
                                                    <span>
                                                      {trade.type === 'long' ? '▲' : '▼'}
                                                    </span>
                                                  </div>
                                                  <div>
                                                    <span className="font-medium block">{trade.symbol}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                      {formatCurrency(trade.entry)} → {formatCurrency(trade.exit)}
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <span className={cn(
                                                    "font-semibold text-sm block",
                                                    trade.pnl > 0 ? 'text-green-400' : 'text-red-400'
                                                  )}>
                                                    {formatCurrency(trade.pnl)}
                                                  </span>
                                                  <span className="text-xs text-muted-foreground">
                                                    {trade.size} units
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                            {dayInfo.trades.length > 3 && (
                                              <div className="text-center text-xs text-muted-foreground pt-1">
                                                +{dayInfo.trades.length - 3} more trades
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      <Button 
                                        className="w-full group relative overflow-hidden"
                                        onClick={() => handleDaySelect(date)}
                                      >
                                        <span className="absolute inset-0 w-full h-full transition-all duration-300 ease-out bg-gradient-to-r from-primary/0 via-primary/30 to-primary/0 group-hover:translate-x-full"></span>
                                        <span className="relative flex items-center justify-center gap-1.5">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
                                            <path d="M5 8v-3a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2h-5"/>
                                            <path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                                            <path d="M3 18v-5.5C3 8.96 6.96 5 11.5 5"/>
                                          </svg>
                                          View All Trades
                                        </span>
                                      </Button>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                                ) : (
                                  <div className={cn(
                                    "absolute inset-0.5 flex flex-col gap-1 justify-space-between items-center p-2 rounded-md bg-primary/2 hover:bg-primary/5 cursor-pointer",
                                    !isCurrentMonth && "opacity-40",
                                    isSelected && "ring-1 ring-inset ring-primary",
                                    isToday && "ring-2 ring-inset ring-primary"
                                  )}>
                                    <div className={cn(
                                      "text-sm text-center",
                                      isToday && "font-bold text-primary"
                                    )}>
                                      {date.getDate()}
                                    </div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          
                          {/* Weekly summary on the right */}
                          <td className="border-l border-muted/20 p-2 align-top text-right w-[12.5%]">
                            <div className="text-xs font-medium">Week {weekIndex + 1}</div>
                            <div className={cn(
                              "text-lg font-bold",
                              weekData[weekIndex]?.pnl > 0 ? "text-green-500" : 
                              weekData[weekIndex]?.pnl < 0 ? "text-red-500" : ""
                            )}>
                              {formatCurrency(weekData[weekIndex]?.pnl || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {weekData[weekIndex]?.tradeCount || 0} trades
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}
        
        <div className="space-y-4">
          {selectedDay && selectedDayTrades.length > 0 ? (
            <Card className="bg-card border-muted-foreground/10">
              <CardHeader className={cn("pb-2", isMobile && "pt-2 px-3")}>
                <CardTitle className={cn("text-xl flex items-center justify-between", isMobile && "text-base")}>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center", isMobile && "h-5 w-5")}>
                      <CalendarDays className={cn("h-3.5 w-3.5 text-primary", isMobile && "h-3 w-3")} />
                    </div>
                    {formatDate(selectedDay)}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedDay(null)}
                    className={cn("h-8 px-2", isMobile && "h-6 px-1")}
                  >
                    <ArrowLeft className={cn("h-4 w-4 mr-1", isMobile && "h-3 w-3")} /> Back
                  </Button>
                </CardTitle>
                <CardDescription>
                  {selectedDayTrades.length} trade{selectedDayTrades.length !== 1 ? 's' : ''} on this day
                </CardDescription>
              </CardHeader>
              <CardContent className={cn(isMobile && "px-3 py-2")}>
                <ScrollArea className={cn("h-[450px] px-1", isMobile && "h-[300px]")}>
                  <div className="space-y-2 pr-3">
                    {selectedDayTrades.map((trade) => (
                      <div 
                        key={trade.id} 
                        className={cn(
                          "p-3 rounded-md border bg-background/80 hover:bg-background transition-colors",
                          isMobile && "p-2",
                          trade.pnl > 0 ? "border-green-500/30" : 
                          trade.pnl < 0 ? "border-red-500/30" : 
                          "border-muted"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-1">
                            <Badge variant={trade.type === 'long' ? 'default' : 'destructive'} className={cn("h-5", isMobile && "h-4 text-xs")}>
                              {trade.type === 'long' ? 'Long' : 'Short'}
                            </Badge>
                            <span className="font-bold">{trade.symbol}</span>
                          </div>
                          <div className={cn(
                            "font-semibold",
                            trade.pnl > 0 ? "text-green-500" : 
                            trade.pnl < 0 ? "text-red-500" : ""
                          )}>
                            {formatCurrency(trade.pnl)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="text-muted-foreground">Entry</div>
                          <div className="text-right">{formatCurrency(trade.entry)}</div>
                          <div className="text-muted-foreground">Exit</div>
                          <div className="text-right">{formatCurrency(trade.exit)}</div>
                          <div className="text-muted-foreground">Size</div>
                          <div className="text-right">{trade.size}</div>
                        </div>
                        {trade.notes && (
                          <div className="text-xs mt-2 pt-2 border-t text-muted-foreground">
                            {trade.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-muted-foreground/10">
              <CardHeader className={cn("pb-2", isMobile && "pt-2 px-3")}>
                <CardTitle className={cn("text-xl flex items-center gap-2", isMobile && "text-base")}>
                  <div className={cn("h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center", isMobile && "h-5 w-5")}>
                    <BarChart3 className={cn("h-3.5 w-3.5 text-primary", isMobile && "h-3 w-3")} />
                  </div>
                  {isMobile ? "Weekly Summary" : "Monthly Summary"}
                </CardTitle>
                <CardDescription>
                  {isMobile ? (
                    <>Performance for week of {formatMobileDate(currentWeekStart)} - {formatMobileDate(new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000))}</>
                  ) : (
                    <>Performance for {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className={cn("space-y-6", isMobile && "space-y-3 px-3 py-2")}>
                <div className={cn("space-y-2 p-3 bg-background rounded-lg border shadow-sm", isMobile && "space-y-1 p-2")}>
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                    P&L
                  </div>
                  <div className={cn(
                    "text-3xl font-bold flex items-center gap-2 w-full truncate",
                    isMobile && "text-xl gap-1",
                    isMobile 
                      ? (weekViewStats.totalPnl > 0 ? "text-green-500" : weekViewStats.totalPnl < 0 ? "text-red-500" : "")
                      : (monthlyStats.totalPnl > 0 ? "text-green-500" : monthlyStats.totalPnl < 0 ? "text-red-500" : "")
                  )}>
                    {(isMobile ? weekViewStats.totalPnl : monthlyStats.totalPnl) > 0 ? 
                      <TrendingUp className={cn("w-6 h-6 flex-shrink-0", isMobile && "w-4 h-4")} /> : 
                    (isMobile ? weekViewStats.totalPnl : monthlyStats.totalPnl) < 0 ? 
                      <TrendingDown className={cn("w-6 h-6 flex-shrink-0", isMobile && "w-4 h-4")} /> : null}
                    <span className="truncate">{formatCurrency(isMobile ? weekViewStats.totalPnl : monthlyStats.totalPnl)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn("space-y-1 p-3 bg-background rounded-lg border shadow-sm", isMobile && "space-y-0.5 p-2")}>
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 flex-shrink-0" />
                      Trades
                    </div>
                    <div className={cn("text-2xl font-semibold truncate", isMobile && "text-lg")}>
                      {isMobile ? weekViewStats.tradeCount : monthlyStats.tradeCount}
                  </div>
                  </div>
                  <div className={cn("space-y-1 p-3 bg-background rounded-lg border shadow-sm", isMobile && "space-y-0.5 p-2")}>
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <PieChart className="h-3.5 w-3.5 flex-shrink-0" />
                      Win Rate
                    </div>
                    <div className={cn("text-2xl font-semibold truncate", isMobile && "text-lg")}>
                      {(isMobile ? weekViewStats.winRate : monthlyStats.winRate).toFixed(1)}%
                    </div>
                  </div>
                  <div className={cn("space-y-1 p-3 bg-background rounded-lg border shadow-sm", isMobile && "space-y-0.5 p-2")}>
                    <div className="text-sm font-medium text-muted-foreground">Wins</div>
                    <div className={cn("text-2xl font-semibold text-green-500 truncate", isMobile && "text-lg")}>
                      {isMobile ? weekViewStats.winCount : monthlyStats.winCount}
                  </div>
                  </div>
                  <div className={cn("space-y-1 p-3 bg-background rounded-lg border shadow-sm", isMobile && "space-y-0.5 p-2")}>
                    <div className="text-sm font-medium text-muted-foreground">Losses</div>
                    <div className={cn("text-2xl font-semibold text-red-500 truncate", isMobile && "text-lg")}>
                      {isMobile ? weekViewStats.lossCount : monthlyStats.lossCount}
                    </div>
                  </div>
                </div>
                
                {!isMobile && (
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      Weekly Performance
                    </span>
                    <span className="text-xs text-muted-foreground">P&L / Trades</span>
                  </div>
                  <div className="space-y-3">
                    {weekData
                      .filter(week => week.tradeCount > 0)
                      .map((week, index) => (
                      <HoverCard key={index}>
                        <HoverCardTrigger asChild>
                          <div className={cn(
                            "p-2 rounded-md transition-colors cursor-pointer",
                            week.pnl > 0 ? "bg-green-500/10 hover:bg-green-500/15" : 
                            week.pnl < 0 ? "bg-red-500/10 hover:bg-red-500/15" : 
                            "bg-muted/40 hover:bg-muted/60"
                          )}>
                            <div className="flex justify-between items-center">
                              <div className="text-sm font-medium truncate pr-2 max-w-[50%]">
                                Week {index + 1}: {week.startDate.getDate()}-{week.endDate.getDate()} 
                                {week.startDate.getMonth() !== week.endDate.getMonth() ? 
                                  ` ${week.startDate.toLocaleString('default', { month: 'short' })}-${week.endDate.toLocaleString('default', { month: 'short' })}` : 
                                  ` ${week.startDate.toLocaleString('default', { month: 'short' })}`}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-background">
                                  {week.tradeCount}
                                </span>
                                <span className={cn(
                                  "font-medium truncate max-w-[100px]",
                                  week.pnl > 0 ? "text-green-500" : week.pnl < 0 ? "text-red-500" : ""
                                )}>
                                  {formatCurrency(week.pnl)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="flex justify-between space-x-4">
                            <div className="space-y-1">
                              <h4 className="text-sm font-semibold">Week {index + 1} Details</h4>
                              <div className="text-sm">
                                <p className="text-muted-foreground">
                                  {week.startDate.toLocaleDateString()} to {week.endDate.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className={cn(
                                week.pnl > 0 ? "bg-green-500/20 text-green-500" : 
                                week.pnl < 0 ? "bg-red-500/20 text-red-500" : 
                                "bg-muted text-muted-foreground"
                              )}>
                                {index + 1}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="text-xs text-muted-foreground">Win Rate</div>
                            <div className="text-xs text-right">{week.winRate.toFixed(1)}%</div>
                            <div className="text-xs text-muted-foreground">Wins</div>
                            <div className="text-xs text-green-500 text-right">{week.winCount}</div>
                            <div className="text-xs text-muted-foreground">Losses</div>
                            <div className="text-xs text-red-500 text-right">{week.lossCount}</div>
                            <div className="text-xs text-muted-foreground">Total P&L</div>
                            <div className={cn(
                              "text-xs font-medium text-right",
                              week.pnl > 0 ? "text-green-500" : week.pnl < 0 ? "text-red-500" : ""
                            )}>
                              {formatCurrency(week.pnl)}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                  </div>
                </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Trading Plan Card - Now full width and below everything */}
      <Card className="bg-card border-muted-foreground/10 mt-6">
        <CardHeader className={cn("pb-2", isMobile && "pt-2 px-3")}>
          <div className="flex items-center justify-between">
            <CardTitle className={cn("text-xl flex items-center gap-2", isMobile && "text-base")}>
              <div className={cn("h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center", isMobile && "h-5 w-5")}>
                <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "12" : "14"} height={isMobile ? "12" : "14"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                  <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                  <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
                  <line x1="9" y1="9" x2="10" y2="9"></line>
                  <line x1="9" y1="13" x2="15" y2="13"></line>
                  <line x1="9" y1="17" x2="15" y2="17"></line>
                </svg>
              </div>
              Your Trading Plan
            </CardTitle>
            {isEditingPlan ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={cancelEditing}
                  className={cn("h-8 px-2", isMobile && "h-6 px-1 text-xs")}
                  disabled={isSaving}
                >
                  <X className={cn("h-4 w-4 mr-1", isMobile && "h-3 w-3")} /> Cancel
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={saveTradingPlan}
                  className={cn("h-8 px-3", isMobile && "h-6 px-2 text-xs")}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : <><Save className={cn("h-4 w-4 mr-1", isMobile && "h-3 w-3")} /> Save</>}
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditingPlan(true)}
                className={cn("h-8 px-3", isMobile && "h-6 px-2 text-xs")}
              >
                <Edit className={cn("h-4 w-4 mr-1", isMobile && "h-3 w-3")} /> Edit Plan
              </Button>
            )}
          </div>
          <CardDescription>
            {isEditingPlan ? 'Edit your trading strategy to improve performance' : 'Reference your trading strategy while analyzing trades'}
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(isMobile && "px-3 py-2")}>
          <Tabs defaultValue="concepts" className="w-full">
            <TabsList className={cn("grid w-full grid-cols-3 max-w-md", isMobile && "mobile-tabs-scroll h-8 text-xs")}>
              <TabsTrigger value="concepts">Concepts</TabsTrigger>
              <TabsTrigger value="rules">Entry Rules</TabsTrigger>
              <TabsTrigger value="risk">Risk Mgmt</TabsTrigger>
            </TabsList>
            
            <TabsContent value="concepts" className="space-y-4 mt-4">
              {isEditingPlan ? (
                <>
                  <div className="space-y-3">
                    {editingTradingPlan?.concepts && editingTradingPlan.concepts.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {editingTradingPlan.concepts.map((concept, index) => (
                          <div key={index} className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10">
                            <span>{concept}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeConcept(index)}
                              className="h-5 w-5 rounded-full p-0 ml-1"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic mb-4">
                        No concepts defined yet. Add your first trading concept below.
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add new trading concept"
                        value={newConcept}
                        onChange={(e) => setNewConcept(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline"
                        onClick={addConcept}
                        className="shrink-0"
                      >
                        <PlusCircle className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {tradingPlan?.concepts && tradingPlan.concepts.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tradingPlan.concepts.map((concept, index) => (
                        <Badge key={index} variant="secondary" className="px-2 py-1 bg-primary/10">
                          {concept}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No trading concepts defined. Click Edit Plan to add some.
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="rules" className="space-y-4 mt-4">
              {isEditingPlan ? (
                <>
                  <div className="space-y-3">
                    {editingTradingPlan?.entryRules && editingTradingPlan.entryRules.length > 0 ? (
                      <div className="space-y-2">
                        {editingTradingPlan.entryRules.map((rule, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-background border">
                            <div className="flex-1 text-sm">{rule}</div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeEntryRule(index)}
                              className="h-7 w-7 rounded-full p-0"
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground italic mb-4">
                        No entry rules defined yet. Add your first entry rule below.
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add new entry rule"
                        value={newEntryRule}
                        onChange={(e) => setNewEntryRule(e.target.value)}
                        className="flex-1 min-h-[60px] resize-none"
                      />
                    </div>
                    <Button 
                      variant="outline"
                      onClick={addEntryRule}
                      className="mt-2"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" /> Add Rule
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {tradingPlan?.entryRules && tradingPlan.entryRules.length > 0 ? (
                    <ul className="space-y-2 text-sm list-disc list-inside">
                      {tradingPlan.entryRules.map((rule, index) => (
                        <li key={index}>{rule}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No entry rules defined. Click Edit Plan to add some.
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="risk" className="space-y-4 mt-4">
              {isEditingPlan ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Risk Per Trade (%)</label>
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={editingTradingPlan?.riskManagement?.riskPercentage || 1}
                        onChange={(e) => updateRiskManagement('riskPercentage', parseFloat(e.target.value))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Risk:Reward Target</label>
                      <Input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={editingTradingPlan?.riskManagement?.targetRiskRewardRatio || 2}
                        onChange={(e) => updateRiskManagement('targetRiskRewardRatio', parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Plan Type</label>
                      <Select
                        value={editingTradingPlan?.riskManagement?.planType || 'fixed'}
                        onValueChange={(value) => updateRiskManagement('planType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select plan type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="dynamic">Dynamic</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reduce Risk After Loss</label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editingTradingPlan?.riskManagement?.reduceRiskAfterLoss || false}
                          onCheckedChange={(checked) => updateRiskManagement('reduceRiskAfterLoss', checked)}
                          className="data-[state=checked]:bg-primary"
                        />
                        <span className="text-sm text-muted-foreground">
                          {editingTradingPlan?.riskManagement?.reduceRiskAfterLoss ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {tradingPlan?.riskManagement ? (
                    <div className="space-y-3 text-sm">
                      <div className="flex flex-col sm:flex-row sm:justify-between border-b pb-2">
                        <span className="text-muted-foreground mb-1 sm:mb-0">Risk Per Trade:</span>
                        <span className="font-medium">{tradingPlan.riskManagement.riskPercentage}%</span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:justify-between border-b pb-2">
                        <span className="text-muted-foreground mb-1 sm:mb-0">Risk/Reward Target:</span>
                        <span className="font-medium">1:{tradingPlan.riskManagement.targetRiskRewardRatio}</span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:justify-between border-b pb-2">
                        <span className="text-muted-foreground mb-1 sm:mb-0">Reduce Risk After Loss:</span>
                        <span className="font-medium">{tradingPlan.riskManagement.reduceRiskAfterLoss ? 'Yes' : 'No'}</span>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:justify-between pb-2">
                        <span className="text-muted-foreground mb-1 sm:mb-0">Plan Type:</span>
                        <span className="font-medium">{tradingPlan.riskManagement.planType || 'Standard'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No risk management settings defined. Click Edit Plan to add some.
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}