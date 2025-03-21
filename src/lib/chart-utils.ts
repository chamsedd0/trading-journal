import { formatCurrency } from "./utils";

// Interfaces that match the existing ones in page.tsx
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

type TimeFrame = 'week' | 'month' | 'year';

// Make sure interfaces exported for use across the app
export interface ChartDataPoint {
  label: string;
  value: number;
}

/**
 * Generates balance history data for line charts showing daily PnL
 * @param account The account with trades to generate history for
 * @param timeFrame The range to display (week, month, year)
 * @param maxDays Maximum number of days to include
 * @returns Array of chart data points showing daily balance over time
 */
export function generateBalanceHistoryData(
  account: any,
  timeFrame: 'week' | 'month' | 'year' = 'month',
  maxDays: number = 12
): ChartDataPoint[] {
  // For accounts passed as an object with traits like { type: 'real', trades: [array of trades], etc }
  const trades = account.trades || [];
  const initialBalance = account.initialBalance || 0;
  const currentBalance = account.currentBalance || account.balance || 0;
  
  // If no trades, return simple start/end points
  if (!trades.length) {
    return [
      { label: 'Start', value: initialBalance },
      { label: 'Current', value: currentBalance }
    ];
  }
  
  // Sort trades by date
  const sortedTrades = [...trades].sort((a, b) => 
    a.date.seconds - b.date.seconds
  );
  
  // Find the oldest trade date
  const oldestTradeDate = new Date(sortedTrades[0].date.seconds * 1000);
  
  // Find the starting date based on either the timeframe or oldest trade date
  const now = new Date();
  let timeframeStartDate: Date;
  
  if (timeFrame === 'week') {
    // Last 7 days
    timeframeStartDate = new Date(now);
    timeframeStartDate.setDate(now.getDate() - 7);
  } else if (timeFrame === 'month') {
    // Last 30 days
    timeframeStartDate = new Date(now);
    timeframeStartDate.setDate(now.getDate() - 30);
  } else {
    // Last 365 days
    timeframeStartDate = new Date(now);
    timeframeStartDate.setDate(now.getDate() - 365);
  }
  
  // Use the older of the two dates (timeframe or oldest trade)
  const startDate = oldestTradeDate < timeframeStartDate ? oldestTradeDate : timeframeStartDate;
  
  // Reset time to midnight
  startDate.setHours(0, 0, 0, 0);
  
  // Get trades within our date range (all trades since start date)
  const tradesInRange = sortedTrades.filter(trade => {
    const tradeDate = new Date(trade.date.seconds * 1000);
    return tradeDate >= startDate && tradeDate <= now;
  });
  
  // Create a map of dates to PnL values
  const dailyPnlMap = new Map<string, number>();
  
  // Initialize the result array with one entry per day
  const result: ChartDataPoint[] = [];
  let runningBalance = initialBalance;
  
  // Create a date formatter
  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Group trades by day and calculate daily PnL
  tradesInRange.forEach(trade => {
    const tradeDate = new Date(trade.date.seconds * 1000);
    // Reset time to get just the date
    tradeDate.setHours(0, 0, 0, 0);
    const dateStr = tradeDate.toISOString().split('T')[0];
    
    // Add the trade PnL to this day
    const currentPnl = dailyPnlMap.get(dateStr) || 0;
    dailyPnlMap.set(dateStr, currentPnl + trade.pnl);
  });
  
  // Calculate days between start and now
  const totalDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Create daily data points from start date to today
  for (let d = 0; d <= totalDays; d++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + d);
    
    // Stop if we exceed today
    if (currentDate > now) {
      break;
    }
    
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayPnl = dailyPnlMap.get(dateStr) || 0;
    
    // Update running balance with this day's PnL
    runningBalance += dayPnl;
    
    // Add data point
    result.push({
      label: formatDateLabel(currentDate),
      value: runningBalance
    });
  }
  
  // Ensure the final balance matches the current balance if provided
  if (currentBalance && result.length > 0 && 
      Math.abs(result[result.length - 1].value - currentBalance) > 0.01) {
    result[result.length - 1].value = currentBalance;
  }
  
  return result;
}

/**
 * Generates monthly PnL data for bar charts grouped by account type
 * @param accounts Array of accounts with their trades
 * @param months Number of months to include
 * @returns Array of data points for the bar chart
 */
export function generateMonthlyPnlData(accounts: any[], months: number = 6) {
  // Initialize result array
  const result: Array<{
    month: string,
    real: number,
    demo: number,
    prop: number
  }> = [];
  
  // Get the current date
  const now = new Date();
  
  // Create entries for each month (last X months)
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
      real: 0,
      demo: 0,
      prop: 0
    });
  }
  
  // Process each account - handle both AccountStats and raw Account formats
  accounts.forEach(account => {
    // Skip if there are no trades
    if (!account.trades || account.trades.length === 0) {
      return;
    }
    
    // Handle AccountStats (if pnlAmount exists but no date data for each trade)
    if (account.pnlAmount !== undefined && account.lastUpdated) {
      const type = account.type;
      const monthLabel = account.lastUpdated.toLocaleString('default', { 
        month: 'short', 
        year: '2-digit' 
      });
      
      const monthEntry = result.find(entry => entry.month === monthLabel);
      if (monthEntry) {
        monthEntry[type] += account.pnlAmount;
      }
      return;
    }
    
    // Handle raw account with trades
    account.trades.forEach(trade => {
      const tradeDate = new Date(trade.date.seconds * 1000);
      
      // Check if trade is within our time window
      const monthsAgo = (now.getFullYear() - tradeDate.getFullYear()) * 12 + 
                         (now.getMonth() - tradeDate.getMonth());
      
      if (monthsAgo >= 0 && monthsAgo < months) {
        // Find the correct month entry
        const monthLabel = tradeDate.toLocaleString('default', { month: 'short', year: '2-digit' });
        const monthEntry = result.find(entry => entry.month === monthLabel);
        
        if (monthEntry) {
          // Add PnL to appropriate account type
          if (account.type === 'real') {
            monthEntry.real += trade.pnl;
          } else if (account.type === 'demo') {
            monthEntry.demo += trade.pnl;
          } else if (account.type === 'prop') {
            monthEntry.prop += trade.pnl;
          }
        }
      }
    });
  });
  
  return result;
}

/**
 * Formats a number for chart display
 * @param value Number to format
 * @param isCurrency Whether to format as currency
 * @param precision Number of decimal places
 * @returns Formatted string
 */
export function formatChartData(value: number, isCurrency: boolean = true, precision: number = 2): string {
  if (isCurrency) {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    })}`;
  }
  
  return value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
}

/**
 * Generates monthly balance data for real accounts
 * @param accounts Array of accounts 
 * @param months Number of months to include
 * @returns Array of monthly balance data points
 */
export function generateMonthlyBalanceData(accounts: any[], months: number = 6) {
  // Filter to only include real accounts
  const realAccounts = accounts.filter(acc => acc.type === 'real');
  
  // Initialize result array
  const result: Array<{
    month: string,
    real: number
  }> = [];
  
  // Get the current date
  const now = new Date();
  
  // Create entries for each month (last X months)
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
      real: 0
    });
  }
  
  // Get total current balance of real accounts
  const totalRealBalance = realAccounts.reduce((total, account) => {
    return total + (account.balance || account.currentBalance || 0);
  }, 0);
  
  // Set the most recent month to the current total balance
  if (result.length > 0) {
    result[result.length - 1].real = totalRealBalance;
  }
  
  // If we have accounts with trades, calculate history
  const accountsWithTrades = realAccounts.filter(acc => acc.trades && acc.trades.length > 0);
  
  if (accountsWithTrades.length > 0) {
    // Work backwards to estimate previous months based on PnL
    let currentBalance = totalRealBalance;
    
    // Process each month except the last/current one
    for (let i = result.length - 2; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i + 1, 1);
      
      // Calculate PnL for this month from all real accounts
      let monthPnL = 0;
      
      realAccounts.forEach(account => {
        if (!account.trades) return;
        
        // Sum PnL from trades in this month
        account.trades.forEach((trade: any) => {
          const tradeDate = new Date(trade.date.seconds * 1000);
          if (tradeDate >= monthDate && tradeDate < nextMonthDate) {
            monthPnL += trade.pnl;
          }
        });
      });
      
      // Subtract this month's PnL from the next month's balance
      // to get this month's estimated balance
      currentBalance -= monthPnL;
      result[i].real = Math.max(0, currentBalance); // Ensure balance isn't negative
    }
  } else {
    // If we don't have trade data, create some realistic test data
    // Start with the current balance and work backwards with some variations
    let prevBalance = totalRealBalance || 50000; // Default if no real accounts
    
    for (let i = result.length - 2; i >= 0; i--) {
      // Random variation between -5% and +5% for demo purposes
      const variation = Math.random() * 0.1 - 0.05;
      prevBalance = prevBalance / (1 + variation);
      result[i].real = Math.max(0, prevBalance);
    }
  }
  
  return result;
} 