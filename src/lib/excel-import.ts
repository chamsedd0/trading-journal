import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

interface ExcelTrade {
  symbol: string;
  date: string; // Format: MM/DD/YYYY
  time: string; // Format: HH:MM:SS
  type: string; // Long or Short
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  notes?: string;
}

interface ProcessedTrade {
  symbol: string;
  date: Timestamp;
  type: 'long' | 'short';
  entry: number;
  exit: number;
  size: number;
  pnl: number;
  notes?: string;
  userId: string;
  createdAt: Timestamp;
}

export async function importTradesFromExcel(
  trades: ExcelTrade[],
  userId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    let successCount = 0;
    
    for (const trade of trades) {
      // Process date and time
      const [month, day, year] = trade.date.split('/').map(Number);
      const [hours, minutes, seconds] = trade.time ? trade.time.split(':').map(Number) : [0, 0, 0];
      
      const tradeDate = new Date(year, month - 1, day, hours, minutes, seconds);
      
      // Create a processed trade object
      const processedTrade: ProcessedTrade = {
        symbol: trade.symbol.toUpperCase(),
        date: Timestamp.fromDate(tradeDate),
        type: trade.type.toLowerCase() === 'long' ? 'long' : 'short',
        entry: trade.entry,
        exit: trade.exit,
        size: trade.size,
        pnl: trade.pnl,
        notes: trade.notes,
        userId,
        createdAt: Timestamp.fromDate(new Date())
      };
      
      // Add trade to Firestore
      await addDoc(collection(db, "trades"), processedTrade);
      successCount++;
    }
    
    return {
      success: true,
      count: successCount
    };
  } catch (error) {
    console.error("Error importing trades:", error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Function to validate Excel data before importing
export function validateExcelTrades(
  trades: any[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let isValid = true;
  
  if (!Array.isArray(trades) || trades.length === 0) {
    errors.push("No trades found in the Excel file");
    return { valid: false, errors };
  }
  
  // Sample validation for required fields
  trades.forEach((trade, index) => {
    if (!trade.symbol) {
      errors.push(`Row ${index + 1}: Missing symbol`);
      isValid = false;
    }
    
    if (!trade.date) {
      errors.push(`Row ${index + 1}: Missing date`);
      isValid = false;
    } else {
      // Validate date format
      const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      if (!dateRegex.test(trade.date)) {
        errors.push(`Row ${index + 1}: Invalid date format. Expected MM/DD/YYYY`);
        isValid = false;
      }
    }
    
    if (!trade.type || (trade.type.toLowerCase() !== 'long' && trade.type.toLowerCase() !== 'short')) {
      errors.push(`Row ${index + 1}: Type must be 'Long' or 'Short'`);
      isValid = false;
    }
    
    if (typeof trade.entry !== 'number' || isNaN(trade.entry)) {
      errors.push(`Row ${index + 1}: Entry price must be a number`);
      isValid = false;
    }
    
    if (typeof trade.exit !== 'number' || isNaN(trade.exit)) {
      errors.push(`Row ${index + 1}: Exit price must be a number`);
      isValid = false;
    }
    
    if (typeof trade.size !== 'number' || isNaN(trade.size) || trade.size <= 0) {
      errors.push(`Row ${index + 1}: Size must be a positive number`);
      isValid = false;
    }
    
    if (typeof trade.pnl !== 'number' || isNaN(trade.pnl)) {
      errors.push(`Row ${index + 1}: PnL must be a number`);
      isValid = false;
    }
  });
  
  return { valid: isValid, errors };
} 