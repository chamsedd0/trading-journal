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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { toast } from 'sonner';

const PROP_FIRM_SIZES = [
  { value: '5000', label: '$5,000' },
  { value: '10000', label: '$10,000' },
  { value: '25000', label: '$25,000' },
  { value: '50000', label: '$50,000' },
  { value: '100000', label: '$100,000' },
  { value: '150000', label: '$150,000' },
  { value: '200000', label: '$200,000' },
  { value: '250000', label: '$250,000' },
];

const BROKERS = [
  { value: 'ftmo', label: 'FTMO' },
  { value: 'topstep', label: 'TopStep' },
  { value: 'bulenox', label: 'Bulenox' },
  { value: 'blueguardian', label: 'Blue Guardian' },
  { value: 'other', label: 'Other' },
];

interface AccountFormData {
  broker: string;
  customBroker: string;
  accountType: string; // cash or futures
  accountSize: string;
  accountCategory: string; // broker or propfirm
  accountVariant: string; // demo, real, challenge, or passed
  balance: string;
  
  // Prop firm specific fields
  profitTarget: string;
  dailyLossLimit: string;
  maxLossLimit: string;
  maxLossType: string; // static or trailing
}

export default function EditAccountPage() {
  const params = useParams();
  const accountId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    broker: '',
    customBroker: '',
    accountType: '', // cash or futures
    accountSize: '',
    accountCategory: '', // broker or propfirm
    accountVariant: '', // demo, real, challenge, or passed
    balance: '',
    
    // Prop firm specific fields
    profitTarget: '',
    dailyLossLimit: '',
    maxLossLimit: '',
    maxLossType: '', // static or trailing
  });

  useEffect(() => {
    const fetchAccount = async () => {
      if (!user || !accountId) return;

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
        
        // Find the account
        const foundAccount = accounts.find((acc: any) => acc.id === accountId);

        if (!foundAccount) {
          toast.error('Account not found');
          router.push('/dashboard/accounts');
          return;
        }

        // Determine broker display name and value
        let broker = 'other';
        let customBroker = '';
        
        // Find if the broker is in our predefined list
        const foundBroker = BROKERS.find(b => b.label === foundAccount.broker);
        if (foundBroker) {
          broker = foundBroker.value;
        } else {
          broker = 'other';
          customBroker = foundAccount.broker;
        }
        
        // Populate form data
        setFormData({
          broker,
          customBroker,
          accountType: foundAccount.accountType || '',
          accountSize: foundAccount.accountSize?.toString() || '',
          accountCategory: foundAccount.category || '',
          accountVariant: foundAccount.variant || '',
          balance: foundAccount.balance?.toString() || foundAccount.accountSize?.toString() || '',
          profitTarget: foundAccount.profitTarget?.toString() || '',
          dailyLossLimit: foundAccount.dailyLossLimit?.toString() || '',
          maxLossLimit: foundAccount.maxLossLimit?.toString() || '',
          maxLossType: foundAccount.maxLossType || 'static',
        });
      } catch (error) {
        console.error('Error fetching account:', error);
        toast.error('Failed to load account details');
      } finally {
        setLoading(false);
      }
    };

    fetchAccount();
  }, [user, accountId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'broker' && value !== 'other') {
      setFormData({
        ...formData,
        broker: value,
        customBroker: '',
      });
    } else if (name === 'broker' && value === 'other') {
      setFormData({
        ...formData,
        broker: value,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !accountId) return;
    
    if (!formData.broker) {
      toast.error("Please select a broker");
      return;
    }
    
    if (formData.broker === 'other' && !formData.customBroker) {
      toast.error("Please enter the broker name");
      return;
    }
    
    if (!formData.accountSize || isNaN(Number(formData.accountSize)) || Number(formData.accountSize) <= 0) {
      toast.error("Please enter a valid account size");
      return;
    }
    
    // Validate balance
    if (!formData.balance || isNaN(Number(formData.balance))) {
      toast.error("Please enter a valid balance");
      return;
    }
    
    // Validate prop firm specific fields
    if (formData.accountCategory === 'propfirm') {
      if (formData.accountVariant === 'challenge' && !formData.profitTarget) {
        toast.error("Please enter a profit target percentage for the challenge");
        return;
      }
      
      if (!formData.maxLossLimit) {
        toast.error("Please enter a maximum loss limit percentage");
        return;
      }
    }
    
    try {
      setIsSaving(true);
      
      // Map accountVariant to type for database compatibility
      let accountType = 'demo';
      
      if (formData.accountVariant === 'real' || formData.accountVariant === 'passed') {
        accountType = 'real';
      } else if (formData.accountVariant === 'challenge') {
        accountType = 'prop';
      } else if (formData.accountVariant === 'demo') {
        accountType = 'demo';
      }
      
      // Create an updated account object
      const brokerName = formData.broker === 'other' ? formData.customBroker : 
        BROKERS.find(b => b.value === formData.broker)?.label || formData.broker;
      
      const updatedAccount = {
        broker: brokerName,
        accountType: formData.accountType, // cash or futures
        accountSize: Number(formData.accountSize),
        category: formData.accountCategory, // propfirm or broker
        variant: formData.accountVariant, // challenge, passed, real, demo
        type: accountType, // For backward compatibility: demo, real, or prop
        balance: Number(formData.balance),
        profitTarget: formData.profitTarget ? Number(formData.profitTarget) : null,
        dailyLossLimit: formData.dailyLossLimit ? Number(formData.dailyLossLimit) : null,
        maxLossLimit: formData.maxLossLimit ? Number(formData.maxLossLimit) : null,
        maxLossType: formData.maxLossType || 'static',
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
      
      // Find the account and update it
      const accountIndex = accounts.findIndex((acc: any) => acc.id === accountId);
      if (accountIndex === -1) {
        toast.error("Account not found");
        return;
      }
      
      // Preserve trades and id
      const existingTrades = accounts[accountIndex].trades || [];
      
      // Update the account
      accounts[accountIndex] = {
        ...accounts[accountIndex],
        ...updatedAccount,
        trades: existingTrades,
        id: accountId
      };
      
      // Update the user document with the updated accounts
      await updateDoc(userRef, {
        accounts: accounts,
        updatedAt: serverTimestamp()
      });
      
      toast.success('Account updated successfully');
      
      // Redirect to account details
      router.push(`/dashboard/accounts/${accountId}`);
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account');
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
        <h1 className="text-2xl font-bold">Edit Account</h1>
        
        <div className="flex space-x-2">
          <Link href={`/dashboard/accounts/${accountId}`}>
            <Button variant="ghost">Cancel</Button>
          </Link>
        </div>
      </div>
      
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>
              Update your trading account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="broker">Broker</Label>
              <Select 
                value={formData.broker} 
                onValueChange={(value) => handleSelectChange('broker', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  {BROKERS.map((broker) => (
                    <SelectItem key={broker.value} value={broker.value}>
                      {broker.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {formData.broker === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="customBroker">Custom Broker Name</Label>
                <Input
                  id="customBroker"
                  name="customBroker"
                  value={formData.customBroker}
                  onChange={handleChange}
                  placeholder="Enter broker name"
                  required={formData.broker === 'other'}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Account Category</Label>
              <RadioGroup 
                value={formData.accountCategory} 
                onValueChange={(value) => handleRadioChange('accountCategory', value)}
                className="flex flex-col space-y-1 sm:flex-row sm:space-x-6 sm:space-y-0"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="broker" id="broker" />
                  <Label htmlFor="broker" className="cursor-pointer">Regular Broker</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="propfirm" id="propfirm" />
                  <Label htmlFor="propfirm" className="cursor-pointer">Prop Firm</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Account Type</Label>
              <RadioGroup 
                value={formData.accountType}
                onValueChange={(value) => handleRadioChange('accountType', value)}
                className="flex flex-col space-y-1 sm:flex-row sm:space-x-6 sm:space-y-0"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="cursor-pointer">Cash</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="futures" id="futures" />
                  <Label htmlFor="futures" className="cursor-pointer">Futures</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Account Variant</Label>
              <RadioGroup 
                value={formData.accountVariant}
                onValueChange={(value) => handleRadioChange('accountVariant', value)}
                className="flex flex-wrap gap-4"
              >
                {formData.accountCategory === 'propfirm' ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="challenge" id="challenge" />
                      <Label htmlFor="challenge" className="cursor-pointer">Evaluation Phase</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="passed" id="passed" />
                      <Label htmlFor="passed" className="cursor-pointer">Funded Account</Label>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="demo" id="demo" />
                      <Label htmlFor="demo" className="cursor-pointer">Demo Account</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="real" id="real" />
                      <Label htmlFor="real" className="cursor-pointer">Real Account</Label>
                    </div>
                  </>
                )}
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accountSize">Account Size ($)</Label>
              <Input
                id="accountSize"
                name="accountSize"
                type="number"
                value={formData.accountSize}
                onChange={handleChange}
                placeholder="Enter account size"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="balance">Current Balance ($)</Label>
              <Input
                id="balance"
                name="balance"
                type="number"
                value={formData.balance}
                onChange={handleChange}
                placeholder="Enter current balance"
                required
              />
            </div>
            
            {formData.accountCategory === 'propfirm' && (
              <div className="space-y-4 border rounded-md p-4">
                <h3 className="font-medium">Prop Firm Rules</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="profitTarget">Profit Target (%)</Label>
                    <Input
                      id="profitTarget"
                      name="profitTarget"
                      type="number"
                      value={formData.profitTarget}
                      onChange={handleChange}
                      placeholder="e.g. 10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dailyLossLimit">Daily Loss Limit (%)</Label>
                    <Input
                      id="dailyLossLimit"
                      name="dailyLossLimit"
                      type="number"
                      value={formData.dailyLossLimit}
                      onChange={handleChange}
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxLossLimit">Maximum Loss Limit (%)</Label>
                    <Input
                      id="maxLossLimit"
                      name="maxLossLimit"
                      type="number"
                      value={formData.maxLossLimit}
                      onChange={handleChange}
                      placeholder="e.g. 10"
                      required={formData.accountCategory === 'propfirm'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Loss Limit Type</Label>
                    <RadioGroup 
                      value={formData.maxLossType}
                      onValueChange={(value) => handleRadioChange('maxLossType', value)}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="static" id="static" />
                        <Label htmlFor="static" className="cursor-pointer">Static</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="trailing" id="trailing" />
                        <Label htmlFor="trailing" className="cursor-pointer">Trailing</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href={`/dashboard/accounts/${accountId}`}>
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