'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckIcon, UploadIcon, FileIcon, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

// Types
interface Account {
  id: string;
  broker: string;
  accountType: string;
  type: 'real' | 'demo' | 'prop';
  balance: number;
  trades?: any[];
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

interface MappedTrade {
  id: string;
  symbol: string;
  date: {
    seconds: number;
    nanoseconds: number;
  };
  type: 'long' | 'short';
  marketType: string;
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
  createdAt: number;
}

interface ValidationError {
  row: number;
  errors: string[];
}

interface ColumnMapping {
  [key: string]: string;
}

export default function BulkImportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<'upload' | 'map' | 'validate' | 'confirm'>('upload');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<{ headers: string[], data: any[] } | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping>({});
  const [mappedTrades, setMappedTrades] = useState<MappedTrade[]>([]);
  const [validationResults, setValidationResults] = useState<{ validTrades: MappedTrade[], errors: ValidationError[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tradingPlan, setTradingPlan] = useState<TradingPlan | null>(null);
  const [rawCsvContent, setRawCsvContent] = useState<string>('');
  const [defaultValues, setDefaultValues] = useState({
    commission: 0,
    tickValue: 5,
    pipValue: 10,
    marketType: 'futures'
  });

  // Fetch user data including accounts and trading plan on page load
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Get trading accounts
          if (userData.accounts && userData.accounts.length > 0) {
            setAccounts(userData.accounts);
          } else {
            toast.error("No trading accounts found", {
              description: "Please add a trading account before importing trades",
              action: {
                label: "Add Account",
                onClick: () => router.push("/dashboard/accounts/new")
              }
            });
          }
          
          // Get trading plan if it exists
          if (userData.tradingPlan) {
            setTradingPlan(userData.tradingPlan);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data");
      }
    };
    
    fetchUserData();
  }, [user, router]);

  // CSV parsing functions
  const parseCsvContent = (content: string) => {
    // Split content into lines and filter out empty lines
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      toast.error('CSV file appears to be empty');
      return null;
    }
    
    // Parse headers (first line)
    const headers = parseCSVLine(lines[0]);
    
    if (headers.length === 0) {
      toast.error('Could not parse CSV headers');
      return null;
    }
    
    // Parse data rows
    const data = lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      
      // Create object mapping headers to values
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {} as Record<string, string>);
    });
    
    return { headers, data };
  };
  
  // Helper function to properly parse CSV lines with quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && !inQuotes) {
        // Start of quoted field
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          // Escaped quote inside a quoted field
          currentValue += '"';
          i++; // Skip the next quote
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(currentValue.trim());
        currentValue = '';
      } else {
        // Normal character
        currentValue += char;
      }
    }
    
    // Don't forget the last field
    result.push(currentValue.trim());
    
    return result;
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File is too large', {
        description: 'Maximum file size is 5MB'
      });
      return;
    }
    
    // Check file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Invalid file type', {
        description: 'Please upload a CSV file'
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setRawCsvContent(content);
        
        const parsed = parseCsvContent(content);
        if (parsed) {
          setCsvData(parsed);
          setStep('map');
          toast.success('CSV file parsed successfully');
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Failed to parse CSV file');
      }
    };
    
    reader.readAsText(file);
  };
  
  // Handle pasted CSV content
  const handlePastedContent = () => {
    if (!rawCsvContent.trim()) {
      toast.error('Please paste some CSV content first');
      return;
    }
    
    try {
      const parsed = parseCsvContent(rawCsvContent);
      if (parsed) {
        setCsvData(parsed);
        setStep('map');
        toast.success('CSV content parsed successfully');
      }
    } catch (error) {
      console.error('Error parsing CSV content:', error);
      toast.error('Failed to parse CSV content');
    }
  };

  // Required trade fields 
  const requiredTradeFields = useMemo(() => [
    { id: 'symbol', label: 'Symbol', required: true },
    { id: 'date', label: 'Date', required: true },
    { id: 'time', label: 'Time', required: false },
    { id: 'type', label: 'Direction (Long/Short)', required: true },
    { id: 'entry', label: 'Entry Price', required: true },
    { id: 'exit', label: 'Exit Price', required: true },
    { id: 'size', label: 'Position Size', required: true },
    { id: 'tp', label: 'Take Profit Price', required: false },
    { id: 'sl', label: 'Stop Loss Price', required: false },
    { id: 'marketType', label: 'Market Type', required: false },
    { id: 'commission', label: 'Commission', required: false },
    { id: 'tickValue', label: 'Tick Value', required: false },
    { id: 'pipValue', label: 'Pip Value', required: false },
    { id: 'notes', label: 'Notes', required: false },
  ], []);

  // Transformation functions for different data types
  const transformers = {
    // Handle different date formats
    date: (value: string): number => {
      if (!value) return 0;
      
      let date: Date | null = null;
      
      // Try different date formats
      const formats = [
        // MM/DD/YYYY
        (str: string) => {
          const parts = str.split('/');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
          }
          return null;
        },
        // YYYY-MM-DD
        (str: string) => {
          const parts = str.split('-');
          if (parts.length === 3) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          }
          return null;
        },
        // DD-MM-YYYY
        (str: string) => {
          const parts = str.split('-');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
          return null;
        },
        // DD.MM.YYYY
        (str: string) => {
          const parts = str.split('.');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          }
          return null;
        }
      ];
      
      // Try each format until one works
      for (const format of formats) {
        const parsedDate = format(value);
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          date = parsedDate;
          break;
        }
      }
      
      // If none of the formats worked, try using the browser's built-in parser
      if (!date) {
        const parsedDate = new Date(value);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate;
        }
      }
      
      return date ? Math.floor(date.getTime() / 1000) : 0;
    },
    
    // Handle different ways to express trade direction
    type: (value: string): 'long' | 'short' => {
      const normalized = value.toString().toLowerCase().trim();
      
      if (['buy', 'long', 'b', 'l', '1', 'true', 'bullish', 'up'].includes(normalized)) {
        return 'long';
      }
      
      if (['sell', 'short', 's', '-1', 'false', 'bearish', 'down'].includes(normalized)) {
        return 'short';
      }
      
      // Default to long if we can't determine
      return 'long';
    },
    
    // Normalize numbers and handle different decimal separators
    numeric: (value: string | number): number => {
      if (typeof value === 'number') return value;
      if (!value || value === '') return 0;
      
      // Remove currency symbols and normalize decimal/thousand separators
      const normalized = value.toString()
        .replace(/[^\d.,\-]/g, '')  // Remove non-numeric chars except . , and -
        .replace(/,/g, '.');        // Convert commas to dots
      
      // If we have multiple dots, keep only the last one as decimal separator
      const parts = normalized.split('.');
      if (parts.length > 2) {
        const decimalPart = parts.pop();
        const integerPart = parts.join('');
        return parseFloat(`${integerPart}.${decimalPart}`);
      }
      
      return parseFloat(normalized) || 0;
    },
    
    // Market type normalization
    marketType: (value: string): string => {
      const normalized = value.toString().toLowerCase().trim();
      
      // Map common market type variations
      const marketTypeMap: Record<string, string> = {
        'fx': 'forex',
        'for': 'forex',
        'forex': 'forex',
        'fut': 'futures',
        'futures': 'futures',
        'stock': 'stocks',
        'stocks': 'stocks',
        'equity': 'stocks',
        'equities': 'stocks',
        'crypto': 'crypto',
        'cryptocurrency': 'crypto',
        'btc': 'crypto',
        'opt': 'options',
        'options': 'options',
      };
      
      return marketTypeMap[normalized] || 'futures'; // Default to futures
    }
  };

  // Handle mapping column change
  const handleMappingChange = (fieldId: string, csvColumn: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [fieldId]: csvColumn === 'none' ? '' : csvColumn
    }));
  };

  // Process mapped data
  const processMappedData = () => {
    if (!csvData) return;
    
    setIsProcessing(true);
    
    try {
      // Map CSV data to trade objects
      const trades: MappedTrade[] = csvData.data.map((row, index) => {
        const trade: Partial<MappedTrade> = {
          id: crypto.randomUUID(),
          createdAt: Date.now()
        };
        
        // Apply mappings and transformations
        Object.entries(columnMappings).forEach(([fieldId, csvColumn]) => {
          if (!csvColumn) return;
          
          const value = row[csvColumn];
          
          switch (fieldId) {
            case 'symbol':
              trade.symbol = value ? value.toString().toUpperCase() : '';
              break;
            case 'date':
              // Store date as Firebase Timestamp format
              const seconds = transformers.date(value);
              trade.date = {
                seconds,
                nanoseconds: 0
              };
              break;
            case 'type':
              trade.type = transformers.type(value);
              break;
            case 'entry':
              trade.entry = transformers.numeric(value);
              break;
            case 'exit':
              trade.exit = transformers.numeric(value);
              break;
            case 'size':
              trade.size = transformers.numeric(value);
              break;
            case 'tp':
              trade.tp = transformers.numeric(value) || null;
              break;
            case 'sl':
              trade.sl = transformers.numeric(value) || null;
              break;
            case 'marketType':
              trade.marketType = value ? transformers.marketType(value) : 'futures';
              break;
            case 'commission':
              trade.commission = transformers.numeric(value) || 0;
              break;
            case 'tickValue':
              trade.tickValue = transformers.numeric(value) || null;
              break;
            case 'pipValue':
              trade.pipValue = transformers.numeric(value) || null;
              break;
            case 'notes':
              trade.notes = value ? value.toString() : '';
              break;
            case 'time':
              trade.exitTime = value ? value.toString() : '00:00:00';
              break;
          }
        });
        
        // Set default values for required fields if they're missing
        if (!trade.marketType) trade.marketType = defaultValues.marketType;
        if (!trade.tickValue && (trade.marketType === 'futures' || trade.marketType === 'stocks')) {
          trade.tickValue = defaultValues.tickValue;
        }
        if (!trade.pipValue && (trade.marketType === 'forex' || trade.marketType === 'crypto')) {
          trade.pipValue = defaultValues.pipValue;
        }
        if (!trade.commission) trade.commission = defaultValues.commission;
        if (!trade.exitTime) trade.exitTime = '00:00:00';
        
        // Calculate P&L
        const calculatePnl = (): number => {
          const entry = trade.entry || 0;
          const exit = trade.exit || 0;
          const size = trade.size || 0;
          const commission = trade.commission || 0;
          const isLong = trade.type === 'long';
          
          if (!entry || !exit || !size) return 0;
          
          const totalCommission = commission * size;
          
          if (trade.marketType === 'futures' || trade.marketType === 'stocks') {
            const tickValue = trade.tickValue || 5;
            if (isLong) {
              return ((exit - entry) * tickValue * size) - totalCommission;
            } else {
              return ((entry - exit) * tickValue * size) - totalCommission;
            }
          } else if (trade.marketType === 'forex' || trade.marketType === 'crypto') {
            const pipValue = trade.pipValue || 10;
            const isPipDecimal = !(trade.symbol || '').includes('JPY');
            const pipSize = isPipDecimal ? 0.0001 : 0.01;
            
            if (isLong) {
              return ((exit - entry) / pipSize * pipValue * size) - totalCommission;
            } else {
              return ((entry - exit) / pipSize * pipValue * size) - totalCommission;
            }
          } else {
            if (isLong) {
              return ((exit - entry) * size) - totalCommission;
            } else {
              return ((entry - exit) * size) - totalCommission;
            }
          }
        };
        
        trade.pnl = calculatePnl();
        
        // Add empty followedRules array
        trade.followedRules = [];
        
        return trade as MappedTrade;
      });
      
      setMappedTrades(trades);
      validateTrades(trades);
    } catch (error) {
      console.error('Error processing mapped data:', error);
      toast.error('Failed to process mapped data');
    } finally {
      setIsProcessing(false);
    }
  };

  // Validate the mapped trades
  const validateTrades = (trades: MappedTrade[]) => {
    const errors: ValidationError[] = [];
    const validTrades: MappedTrade[] = [];
    
    trades.forEach((trade, index) => {
      const rowErrors: string[] = [];
      
      // Required fields validation
      if (!trade.symbol) rowErrors.push('Symbol is required');
      if (!trade.date || trade.date.seconds === 0) rowErrors.push('Invalid date format');
      if (!trade.entry || trade.entry <= 0) rowErrors.push('Entry price must be greater than zero');
      if (!trade.exit || trade.exit <= 0) rowErrors.push('Exit price must be greater than zero');
      if (!trade.size || trade.size <= 0) rowErrors.push('Position size must be greater than zero');
      
      // Logical validation for SL and TP
      if (trade.sl !== null && trade.sl !== undefined && trade.sl > 0) {
        if (trade.type === 'long' && trade.sl >= trade.entry) {
          rowErrors.push('Stop loss should be below entry price for long trades');
        } else if (trade.type === 'short' && trade.sl <= trade.entry) {
          rowErrors.push('Stop loss should be above entry price for short trades');
        }
      }
      
      if (trade.tp !== null && trade.tp !== undefined && trade.tp > 0) {
        if (trade.type === 'long' && trade.tp <= trade.entry) {
          rowErrors.push('Take profit should be above entry price for long trades');
        } else if (trade.type === 'short' && trade.tp >= trade.entry) {
          rowErrors.push('Take profit should be below entry price for short trades');
        }
      }
      
      if (rowErrors.length > 0) {
        errors.push({ row: index + 2, errors: rowErrors }); // +2 because of 0-index and header row
      } else {
        validTrades.push(trade);
      }
    });
    
    setValidationResults({ validTrades, errors });
    
    if (errors.length > 0) {
      toast.warning(`${errors.length} trade(s) have validation issues`, {
        description: 'Please review and fix the issues before importing'
      });
    } else if (validTrades.length > 0) {
      toast.success(`All ${validTrades.length} trades are valid`);
      setStep('validate');
    } else {
      toast.error('No valid trades found');
    }
  };
  
  // Display a value preview for the column mapping dropdown
  const renderPreview = (data: any[], column: string, limit = 15) => {
    if (!data || data.length === 0 || !column) return '';
    
    const previewValue = data[0][column];
    if (previewValue === undefined) return '';
    
    const trimmedValue = previewValue.toString().substring(0, limit);
    return trimmedValue.length < previewValue.toString().length 
      ? `(e.g., "${trimmedValue}...")` 
      : `(e.g., "${trimmedValue}")`;
  };

  // Handle the actual import of trades
  const handleImportTrades = async () => {
    if (!user || !validationResults || validationResults.validTrades.length === 0 || selectedAccounts.length === 0) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Get the current user document
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        toast.error("User profile not found");
        return;
      }
      
      const userData = userDoc.data();
      const existingAccounts = userData.accounts || [];
      
      // Make a copy of the accounts array to modify
      const updatedAccounts = [...existingAccounts];
      
      // Track import statistics
      let totalTradesImported = 0;
      const accountsUpdated: string[] = [];
      
      // Apply trades to each selected account
      for (const accountId of selectedAccounts) {
        // Find the account to update
        const accountIndex = updatedAccounts.findIndex((acc: any) => acc.id === accountId);
        if (accountIndex === -1) continue;
        
        const account = updatedAccounts[accountIndex];
        accountsUpdated.push(account.broker);
        
        // Initialize trades array if it doesn't exist
        if (!account.trades) {
          account.trades = [];
        }
        
        // Calculate the total P&L from all imported trades
        const totalPnl = validationResults.validTrades.reduce((sum, trade) => sum + trade.pnl, 0);
        
        // Update the account balance
        const currentBalance = account.balance || 0;
        account.balance = currentBalance + totalPnl;
        
        // Add trades to the account with unique IDs
        validationResults.validTrades.forEach(trade => {
          // Create a new trade with a unique ID for this account
          const newTrade = {
            ...trade,
            id: crypto.randomUUID() // Ensure each trade gets a unique ID per account
          };
          
          account.trades.push(newTrade);
          totalTradesImported++;
        });
        
        // Update the account in the array
        updatedAccounts[accountIndex] = account;
      }
      
      // Update the user document with the updated accounts
      await updateDoc(userRef, {
        accounts: updatedAccounts
      });
      
      // Success message
      toast.success(`${validationResults.validTrades.length} trades imported successfully`, {
        description: `Added to ${accountsUpdated.join(', ')}`,
        duration: 5000
      });
      
      // Redirect to trades page
      router.push('/dashboard/trades');
      
    } catch (error) {
      console.error("Error importing trades:", error);
      toast.error("Failed to import trades", {
        description: "There was a problem saving your trades"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Bulk Import Trades</h1>
          <p className="text-muted-foreground">
            Upload a CSV file to import multiple trades at once
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/dashboard/trades">
            <Button variant="outline">All Trades</Button>
          </Link>
          <Link href="/dashboard/trades/new">
            <Button variant="outline">Add Single Trade</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Trades</CardTitle>
          <CardDescription>
            Upload and map your trade data from a CSV file
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={step} 
            onValueChange={(value) => setStep(value as any)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload" disabled={step !== 'upload'}>
                Upload File
              </TabsTrigger>
              <TabsTrigger value="map" disabled={!csvData || step === 'upload'}>
                Map Columns
              </TabsTrigger>
              <TabsTrigger value="validate" disabled={!mappedTrades.length || step === 'upload' || step === 'map'}>
                Validate
              </TabsTrigger>
              <TabsTrigger value="confirm" disabled={!validationResults?.validTrades.length || step === 'upload' || step === 'map' || step === 'validate'}>
                Confirm
              </TabsTrigger>
            </TabsList>
            
            {/* Step 1: Upload CSV */}
            <TabsContent value="upload" className="py-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file containing your trades. The first row should contain column headers.
                </p>
                
                <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                  <div className="mb-4">
                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                  
                  <div className="text-center mb-4">
                    <h3 className="font-medium">Drop your CSV file here or click to browse</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports CSV files up to 5MB
                    </p>
                  </div>
                  
                  <Input
                    type="file"
                    accept=".csv"
                    className="max-w-sm"
                    onChange={handleFileUpload}
                  />
                  
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      Or paste your CSV data directly
                    </p>
                    <Textarea 
                      className="mt-2 min-h-[150px] font-mono text-xs"
                      placeholder="Paste CSV content here..."
                      value={rawCsvContent}
                      onChange={(e) => setRawCsvContent(e.target.value)}
                    />
                    
                    <Button 
                      className="mt-2"
                      variant="outline"
                      onClick={handlePastedContent}
                      disabled={!rawCsvContent.trim()}
                    >
                      Process Data
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Step 2: Map Columns */}
            <TabsContent value="map" className="py-4">
              <div className="space-y-6">
                <div className="flex flex-col space-y-2">
                  <h3 className="text-lg font-medium">Map CSV Columns to Trade Fields</h3>
                  <p className="text-sm text-muted-foreground">
                    Match each column from your CSV file to the appropriate trade field. Fields marked with * are required.
                  </p>
                  <div className="text-xs text-amber-600 mt-1 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    <span>Required fields must be mapped to proceed.</span>
                  </div>
                </div>
                
                {csvData && (
                  <>
                    <div className="max-h-[200px] overflow-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            {csvData.headers.map((header, i) => (
                              <th key={i} className="p-2 text-left font-medium">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvData.data.slice(0, 3).map((row, rowIndex) => (
                            <tr key={rowIndex} className={`border-t border-border ${rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                              {csvData.headers.map((header, colIndex) => (
                                <td key={colIndex} className="p-2 truncate max-w-[150px]">
                                  {row[header] || ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-md font-medium">Field Mapping</h3>
                      <div className="grid gap-4">
                        {requiredTradeFields.map((field) => (
                          <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
                            <div className="flex items-center">
                              <label className="text-sm font-medium">
                                {field.label}
                                {field.required && <span className="text-destructive ml-1">*</span>}
                              </label>
                            </div>
                            <div>
                              <Select
                                value={columnMappings[field.id] || 'none'}
                                onValueChange={(value) => handleMappingChange(field.id, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="-- Not mapped --" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- Not mapped --</SelectItem>
                                  {csvData.headers.map((header) => (
                                    <SelectItem key={header} value={header}>
                                      {header} {renderPreview(csvData.data, header)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Default values section */}
                    <div className="space-y-4 mt-6 p-4 border rounded-md bg-muted/10">
                      <h3 className="text-md font-medium">Default Values for Unmapped Fields</h3>
                      <p className="text-sm text-muted-foreground">
                        Set default values for unmapped fields that will apply to all imported trades.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Commission
                          </label>
                          <Input
                            type="number"
                            placeholder="Default commission"
                            value={defaultValues.commission}
                            onChange={(e) => setDefaultValues(prev => ({
                              ...prev,
                              commission: parseFloat(e.target.value) || 0
                            }))}
                            disabled={!!columnMappings.commission}
                          />
                          <p className="text-xs text-muted-foreground">Applied if no commission column is mapped</p>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Market Type
                          </label>
                          <Select
                            value={defaultValues.marketType}
                            onValueChange={(value) => setDefaultValues(prev => ({
                              ...prev,
                              marketType: value
                            }))}
                            disabled={!!columnMappings.marketType}
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
                          <p className="text-xs text-muted-foreground">Default market type for all trades</p>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Tick Value ($)
                          </label>
                          <Input
                            type="number"
                            placeholder="Default tick value"
                            value={defaultValues.tickValue}
                            onChange={(e) => setDefaultValues(prev => ({
                              ...prev,
                              tickValue: parseFloat(e.target.value) || 5
                            }))}
                            disabled={!!columnMappings.tickValue}
                          />
                          <p className="text-xs text-muted-foreground">For futures & stocks (default: $5)</p>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Pip Value ($)
                          </label>
                          <Input
                            type="number"
                            placeholder="Default pip value"
                            value={defaultValues.pipValue}
                            onChange={(e) => setDefaultValues(prev => ({
                              ...prev,
                              pipValue: parseFloat(e.target.value) || 10
                            }))}
                            disabled={!!columnMappings.pipValue}
                          />
                          <p className="text-xs text-muted-foreground">For forex & crypto (default: $10)</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCsvData(null);
                          setRawCsvContent('');
                          setColumnMappings({});
                          setStep('upload');
                        }}
                      >
                        Back to Upload
                      </Button>
                      
                      <Button
                        onClick={processMappedData}
                        disabled={
                          isProcessing || 
                          !columnMappings.symbol || 
                          !columnMappings.date || 
                          !columnMappings.type || 
                          !columnMappings.entry || 
                          !columnMappings.exit || 
                          !columnMappings.size
                        }
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            Process Mapping
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
            
            {/* Step 3: Validate */}
            <TabsContent value="validate" className="py-4">
              {validationResults && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Validate Imported Trades</h3>
                      <p className="text-sm text-muted-foreground">
                        Review your imported trades and select the accounts to add them to.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Valid trades: <span className="text-primary">{validationResults.validTrades.length}</span>
                      </div>
                      {validationResults.errors.length > 0 && (
                        <div className="text-sm font-medium">
                          Invalid trades: <span className="text-destructive">{validationResults.errors.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      <h3 className="text-md font-medium">Select Trading Accounts</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose which accounts to import these trades into.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                            onClick={() => {
                              if (isSelected) {
                                setSelectedAccounts(prev => prev.filter(id => id !== account.id));
                              } else {
                                setSelectedAccounts(prev => [...prev, account.id]);
                              }
                            }}
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
                    
                    {validationResults.validTrades.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-md font-medium">Valid Trades Preview</h3>
                        <div className="max-h-[300px] overflow-auto border rounded-md">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="p-2 text-left font-medium">Symbol</th>
                                <th className="p-2 text-left font-medium">Date</th>
                                <th className="p-2 text-left font-medium">Type</th>
                                <th className="p-2 text-left font-medium">Entry</th>
                                <th className="p-2 text-left font-medium">Exit</th>
                                <th className="p-2 text-left font-medium">Size</th>
                                <th className="p-2 text-right font-medium">P/L</th>
                              </tr>
                            </thead>
                            <tbody>
                              {validationResults.validTrades.map((trade, index) => (
                                <tr 
                                  key={trade.id} 
                                  className={`border-t border-border ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
                                >
                                  <td className="p-2 font-medium">{trade.symbol}</td>
                                  <td className="p-2">
                                    {new Date(trade.date.seconds * 1000).toLocaleDateString()}
                                  </td>
                                  <td className="p-2">
                                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                      trade.type === 'long' 
                                        ? 'bg-[#089981]/10 text-[#089981]' 
                                        : 'bg-[#f23645]/10 text-[#f23645]'
                                    }`}>
                                      {trade.type.charAt(0).toUpperCase() + trade.type.slice(1)}
                                    </span>
                                  </td>
                                  <td className="p-2">${trade.entry.toFixed(2)}</td>
                                  <td className="p-2">${trade.exit.toFixed(2)}</td>
                                  <td className="p-2">{trade.size}</td>
                                  <td className={`p-2 text-right font-medium ${trade.pnl >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {validationResults.errors.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-md font-medium">Invalid Trades</h3>
                        <div className="border rounded-md p-4 bg-destructive/10">
                          <div className="space-y-4">
                            {validationResults.errors.map((error, index) => (
                              <div key={index} className="p-3 border border-destructive/30 rounded-md">
                                <div className="flex items-center text-destructive mb-2">
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  <span className="font-medium">Row {error.row}</span>
                                </div>
                                <ul className="list-disc list-inside text-sm space-y-1">
                                  {error.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setStep('map')}
                    >
                      Back to Mapping
                    </Button>
                    
                    <Button
                      onClick={() => {
                        if (selectedAccounts.length === 0) {
                          toast.error('Please select at least one account');
                          return;
                        }
                        setStep('confirm');
                      }}
                      disabled={
                        validationResults.validTrades.length === 0 || 
                        selectedAccounts.length === 0
                      }
                    >
                      Continue to Confirm
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Step 4: Confirm */}
            <TabsContent value="confirm" className="py-4">
              {validationResults && selectedAccounts.length > 0 && (
                <div className="space-y-6">
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-medium">Confirm Import</h3>
                    <p className="text-sm text-muted-foreground">
                      You are about to import {validationResults.validTrades.length} trades into {selectedAccounts.length} accounts.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="border rounded-md p-4 bg-amber-500/10 border-amber-500/30">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-amber-600">Import Summary</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Please review this information carefully before importing:
                          </p>
                          <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                            <li>Valid trades to import: {validationResults.validTrades.length}</li>
                            <li>Target accounts: {selectedAccounts.map(id => 
                              accounts.find(acc => acc.id === id)?.broker
                            ).join(', ')}</li>
                            <li>Each trade will be added to all selected accounts</li>
                            <li>Account balances will be updated based on the P/L of each trade</li>
                            <li>This action cannot be undone automatically</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Summary Statistics</h4>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div className="flex flex-col p-3 border rounded-md">
                          <span className="text-sm text-muted-foreground">Total Trades</span>
                          <span className="font-medium text-lg">{validationResults.validTrades.length}</span>
                        </div>
                        
                        <div className="flex flex-col p-3 border rounded-md">
                          <span className="text-sm text-muted-foreground">Profitable Trades</span>
                          <span className="font-medium text-lg text-[#089981]">
                            {validationResults.validTrades.filter(t => t.pnl > 0).length}
                          </span>
                        </div>
                        
                        <div className="flex flex-col p-3 border rounded-md">
                          <span className="text-sm text-muted-foreground">Losing Trades</span>
                          <span className="font-medium text-lg text-[#f23645]">
                            {validationResults.validTrades.filter(t => t.pnl < 0).length}
                          </span>
                        </div>
                        
                        <div className="flex flex-col p-3 border rounded-md">
                          <span className="text-sm text-muted-foreground">Net P/L</span>
                          <span className={`font-medium text-lg ${
                            validationResults.validTrades.reduce((sum, t) => sum + t.pnl, 0) >= 0 
                              ? 'text-[#089981]' 
                              : 'text-[#f23645]'
                          }`}>
                            ${validationResults.validTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setStep('validate')}
                    >
                      Back to Validation
                    </Button>
                    
                    <Button
                      onClick={handleImportTrades}
                      disabled={isProcessing}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          Confirm Import
                          <CheckIcon className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 