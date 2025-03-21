'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
  entry: string;
  exit: string;
  size: string;
  pnl: string;
  notes: string;
}

export default function EditTradePage() {
  const params = useParams();
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tradeData, setTradeData] = useState<TradeFormData>({
    symbol: '',
    date: '',
    time: '',
    type: 'long',
    entry: '',
    exit: '',
    size: '',
    pnl: '',
    notes: ''
  });

  useEffect(() => {
    const fetchTrade = async () => {
      if (!user || !resolvedParams.id) return;

      try {
        const tradeId = resolvedParams.id as string;
        const tradeDoc = await getDoc(doc(db, 'trades', tradeId));

        if (!tradeDoc.exists()) {
          toast.error('Trade not found');
          router.push('/dashboard/trades');
          return;
        }

        const trade = tradeDoc.data();
        
        // Check if this trade belongs to the current user
        if (trade.userId !== user.uid) {
          toast.error('You do not have permission to edit this trade');
          router.push('/dashboard/trades');
          return;
        }

        // Convert Firestore timestamp to date/time format for the form
        const tradeDate = new Date(trade.date.seconds * 1000);
        
        setTradeData({
          symbol: trade.symbol || '',
          date: tradeDate.toISOString().slice(0, 10), // YYYY-MM-DD format
          time: tradeDate.toTimeString().slice(0, 8), // HH:MM:SS format
          type: trade.type || 'long',
          entry: trade.entry.toString() || '',
          exit: trade.exit.toString() || '',
          size: trade.size.toString() || '',
          pnl: trade.pnl.toString() || '',
          notes: trade.notes || ''
        });
      } catch (error) {
        console.error('Error fetching trade:', error);
        toast.error('Failed to load trade details');
      } finally {
        setLoading(false);
      }
    };

    fetchTrade();
  }, [user, resolvedParams.id, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTradeData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setTradeData(prev => ({ ...prev, type: value as 'long' | 'short' }));
  };

  const calculatePnL = () => {
    if (!tradeData.entry || !tradeData.exit || !tradeData.size) return;

    const entry = parseFloat(tradeData.entry);
    const exit = parseFloat(tradeData.exit);
    const size = parseFloat(tradeData.size);

    if (isNaN(entry) || isNaN(exit) || isNaN(size)) return;

    let pnl;
    if (tradeData.type === 'long') {
      pnl = (exit - entry) * size;
    } else {
      pnl = (entry - exit) * size;
    }

    setTradeData(prev => ({ ...prev, pnl: pnl.toFixed(2) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !resolvedParams.id) return;
    
    try {
      setIsSaving(true);
      
      const [year, month, day] = tradeData.date.split('-').map(Number);
      const [hours, minutes, seconds] = tradeData.time.split(':').map(Number);
      
      const tradeDate = new Date(year, month - 1, day, hours, minutes, seconds);
      
      // Update the trade object
      const tradeId = resolvedParams.id as string;
      const tradeRef = doc(db, 'trades', tradeId);
      
      await updateDoc(tradeRef, {
        symbol: tradeData.symbol.toUpperCase(),
        date: new Date(tradeDate),
        type: tradeData.type,
        entry: parseFloat(tradeData.entry),
        exit: parseFloat(tradeData.exit),
        size: parseFloat(tradeData.size),
        pnl: parseFloat(tradeData.pnl),
        notes: tradeData.notes,
        updatedAt: new Date()
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
          <Link href={`/dashboard/trades/${resolvedParams.id}`}>
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
                  onValueChange={handleSelectChange}
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
              />
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
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href={`/dashboard/trades/${resolvedParams.id}`}>
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