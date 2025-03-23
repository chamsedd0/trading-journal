'use client';

import { useState, useEffect, useMemo } from 'react';
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
            <SelectTrigger className="w-[130px] h-9">
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
            <SelectTrigger className="w-[160px] h-9">
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
        <div className="flex gap-1.5 text-sm">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
            <Badge variant="outline" className="bg-green-500 h-2 w-2 p-0 rounded-full border-0" />
            <span>Profit</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
            <Badge variant="outline" className="bg-red-500 h-2 w-2 p-0 rounded-full border-0" />
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
            <span className="text-[10px] font-medium">3W/2L</span>
            <span>Win/Loss Count</span>
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
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
                                onClick={() => hasTrades ? handleDaySelect(date) : null}
                              >
                                <div className="pt-[100%]"></div>
                                <div className={cn(
                                  "absolute inset-0.5 flex flex-col gap-1 justify-space-between items-center p-2 rounded-md bg-primary/2 hover:bg-primary/5 cursor-pointer",
                                  !isCurrentMonth && "opacity-40",
                                  isSelected && "ring-1 ring-inset ring-primary",
                                  isToday && "ring-2 ring-inset ring-primary",
                                  hasNegativePnl && "bg-red-950/40 hover:bg-red-950/60",
                                  hasPositivePnl && "bg-green-950/40 hover:bg-green-950/60",
                                  hasTrades && "cursor-pointer"
                                )}>
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
        
        <div className="space-y-4">
          {selectedDay && selectedDayTrades.length > 0 ? (
            <Card className="bg-card border-muted-foreground/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    </div>
                    {formatDate(selectedDay)}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedDay(null)}
                    className="h-8 px-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </CardTitle>
                <CardDescription>
                  {selectedDayTrades.length} trade{selectedDayTrades.length !== 1 ? 's' : ''} on this day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[450px] px-1">
                  <div className="space-y-2 pr-3">
                    {selectedDayTrades.map((trade) => (
                      <div 
                        key={trade.id} 
                        className={cn(
                          "p-3 rounded-md border bg-background/80 hover:bg-background transition-colors",
                          trade.pnl > 0 ? "border-green-500/30" : 
                          trade.pnl < 0 ? "border-red-500/30" : 
                          "border-muted"
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-1">
                            <Badge variant={trade.type === 'long' ? 'default' : 'destructive'} className="h-5">
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
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  Monthly Summary
                </CardTitle>
                <CardDescription>
                  Performance for {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2 p-3 bg-background rounded-lg border shadow-sm">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    P&L
                  </div>
                  <div className={cn(
                    "text-3xl font-bold flex items-center gap-2",
                    monthlyStats.totalPnl > 0 ? "text-green-500" : 
                    monthlyStats.totalPnl < 0 ? "text-red-500" : ""
                  )}>
                    {monthlyStats.totalPnl > 0 ? <TrendingUp className="w-6 h-6" /> : 
                    monthlyStats.totalPnl < 0 ? <TrendingDown className="w-6 h-6" /> : null}
                    {formatCurrency(monthlyStats.totalPnl)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 p-3 bg-background rounded-lg border shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      Trades
                    </div>
                    <div className="text-2xl font-semibold">{monthlyStats.tradeCount}</div>
                  </div>
                  <div className="space-y-1 p-3 bg-background rounded-lg border shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <PieChart className="h-3.5 w-3.5" />
                      Win Rate
                    </div>
                    <div className="text-2xl font-semibold">
                      {monthlyStats.winRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-1 p-3 bg-background rounded-lg border shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground">Wins</div>
                    <div className="text-2xl font-semibold text-green-500">{monthlyStats.winCount}</div>
                  </div>
                  <div className="space-y-1 p-3 bg-background rounded-lg border shadow-sm">
                    <div className="text-sm font-medium text-muted-foreground">Losses</div>
                    <div className="text-2xl font-semibold text-red-500">{monthlyStats.lossCount}</div>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Weekly Performance
                    </span>
                    <span className="text-xs text-muted-foreground">P&L / Trades</span>
                  </div>
                  <div className="space-y-3">
                    {weekData.map((week, index) => (
                      <HoverCard key={index}>
                        <HoverCardTrigger asChild>
                          <div className={cn(
                            "p-2 rounded-md transition-colors cursor-pointer",
                            week.pnl > 0 ? "bg-green-500/10 hover:bg-green-500/15" : 
                            week.pnl < 0 ? "bg-red-500/10 hover:bg-red-500/15" : 
                            "bg-muted/40 hover:bg-muted/60"
                          )}>
                            <div className="flex justify-between items-center">
                              <div className="text-sm font-medium">
                                Week {index + 1}: {week.startDate.getDate()}-{week.endDate.getDate()} 
                                {week.startDate.getMonth() !== week.endDate.getMonth() ? 
                                  ` ${week.startDate.toLocaleString('default', { month: 'short' })}-${week.endDate.toLocaleString('default', { month: 'short' })}` : 
                                  ` ${week.startDate.toLocaleString('default', { month: 'short' })}`}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-background">
                                  {week.tradeCount}
                                </span>
                                <span className={cn(
                                  "font-medium",
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
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Trading Plan Card - Now full width and below everything */}
      <Card className="bg-card border-muted-foreground/10 mt-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
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
                  className="h-8 px-2"
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={saveTradingPlan}
                  className="h-8 px-3"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : <><Save className="h-4 w-4 mr-1" /> Save</>}
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditingPlan(true)}
                className="h-8 px-3"
              >
                <Edit className="h-4 w-4 mr-1" /> Edit Plan
              </Button>
            )}
          </div>
          <CardDescription>
            {isEditingPlan ? 'Edit your trading strategy to improve performance' : 'Reference your trading strategy while analyzing trades'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="concepts" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
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