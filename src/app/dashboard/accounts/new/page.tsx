'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function NewAccountPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    broker: '',
    customBroker: '',
    accountType: '', // cash or futures
    accountSize: '',
    accountCategory: '', // broker or propfirm
    accountVariant: '', // demo, real, challenge, or passed
    
    // Prop firm specific fields
    profitTarget: '',
    dailyLossLimit: '',
    maxLossLimit: '',
    maxLossType: '', // static or trailing
  });
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAccountSize, setSelectedAccountSize] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleRadioChange = (name: string, value: string) => {
    // Reset related fields when category or variant changes
    if (name === 'accountCategory') {
      setFormData({
        ...formData,
        [name]: value,
        accountVariant: '', // Reset variant when category changes
        profitTarget: '',
        dailyLossLimit: '',
        maxLossLimit: '',
        maxLossType: 'static',
        accountSize: '',
      });
      setSelectedAccountSize(null);
    } else if (name === 'accountVariant') {
      setFormData({
        ...formData,
        [name]: value,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleAccountSizeSelect = (value: string) => {
    setSelectedAccountSize(value);
    setFormData({
      ...formData,
      accountSize: value
    });
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
  
  const handleNextStep = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!formData.accountCategory) {
        toast.error("Please select an account category");
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.accountVariant) {
        toast.error("Please select an account variant");
        return;
      }
      
      if (formData.accountCategory === 'propfirm' && !formData.accountSize) {
        toast.error("Please select an account size");
        return;
      }
    }
    
    setCurrentStep(currentStep + 1);
  };
  
  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to add an account");
      return;
    }
    
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
      setLoading(true);
      
      // Map accountVariant to type for database compatibility
      let accountType = 'demo';
      
      if (formData.accountVariant === 'real' || formData.accountVariant === 'passed') {
        accountType = 'real';
      } else if (formData.accountVariant === 'challenge') {
        accountType = 'prop';
      } else if (formData.accountVariant === 'demo') {
        accountType = 'demo';
      }
      
      // Create a new account object
      const brokerName = formData.broker === 'other' ? formData.customBroker : 
        BROKERS.find(b => b.value === formData.broker)?.label || formData.broker;
      
      const newAccount = {
        id: crypto.randomUUID(),
        broker: brokerName,
        accountType: formData.accountType, // cash or futures
        accountSize: Number(formData.accountSize),
        category: formData.accountCategory, // propfirm or broker
        variant: formData.accountVariant, // challenge, passed, real, demo
        type: accountType, // For backward compatibility: demo, real, or prop
        balance: Number(formData.accountSize), // Initially set balance to account size
        trades: [], // Initialize with empty trades array
        
        // Prop firm specific fields (only included if relevant)
        ...(formData.accountCategory === 'propfirm' && formData.accountVariant === 'challenge' && {
          profitTarget: Number(formData.profitTarget),
          dailyLossLimit: formData.dailyLossLimit ? Number(formData.dailyLossLimit) : null,
        }),
        ...(formData.accountCategory === 'propfirm' && {
          maxLossLimit: Number(formData.maxLossLimit),
          maxLossType: formData.maxLossType,
        }),
      };
      
      // Reference to the user document
      const userRef = doc(db, "users", user.uid);
      
      // Get current user data
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        toast.error("User profile not found");
        return;
      }
      
      // Update the user document with the new account
      await updateDoc(userRef, {
        accounts: arrayUnion(newAccount)
      });
      
      toast.success("Account added successfully");
      router.push("/dashboard");
    } catch (error) {
      console.error("Error adding account:", error);
      toast.error("Failed to add account");
    } finally {
      setLoading(false);
    }
  };
  
  // Determine if the form should show prop firm sizes
  const showPropFirmSizes = formData.accountCategory === 'propfirm';
  
  // Determine if we need to show challenge-specific fields
  const showChallengeFields = formData.accountCategory === 'propfirm' && formData.accountVariant === 'challenge';
  
  // Determine if we need to show prop firm-specific fields (for both challenge and passed)
  const showPropFirmFields = formData.accountCategory === 'propfirm' && 
    (formData.accountVariant === 'challenge' || formData.accountVariant === 'passed');
  
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Add New Trading Account</h1>
      </div>
      
      <Card className="overflow-hidden shadow-lg">
        <CardHeader className="border-b px-6 py-5 w-full">
          <CardTitle className="text-2xl">Trading Account Setup</CardTitle>
          <CardDescription className="text-base mt-1">
            {currentStep === 1 && "Select your account category"}
            {currentStep === 2 && "Configure account details"}
            {currentStep === 3 && "Finalize account settings"}
          </CardDescription>
          
          <div className="flex items-center mt-4 w-full">
            <div className="flex items-center w-full">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${
                currentStep >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>1</div>
              <div className={`h-1 flex-grow ${
                currentStep >= 2 ? 'bg-primary' : 'bg-muted-foreground/20'
              }`}></div>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${
                currentStep >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>2</div>
              <div className={`h-1 flex-grow ${
                currentStep >= 3 ? 'bg-primary' : 'bg-muted-foreground/20'
              }`}></div>
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${
                currentStep >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>3</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <form id="accountForm" onSubmit={handleSubmit}>
            {/* Step 1: Choose Account Category */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Choose Account Category</Label>
                  <RadioGroup
                    value={formData.accountCategory}
                    onValueChange={(value) => handleRadioChange('accountCategory', value)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"
                  >
                    <div
                      className={`border rounded-lg p-5 hover:border-primary cursor-pointer transition-colors ${
                        formData.accountCategory === 'broker' ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem 
                          value="broker" 
                          id="broker" 
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="broker" className="text-base font-medium cursor-pointer">Broker Account</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Regular trading account from a standard broker like TD Ameritrade, Interactive Brokers, etc.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div
                      className={`border rounded-lg p-5 hover:border-primary cursor-pointer transition-colors ${
                        formData.accountCategory === 'propfirm' ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem 
                          value="propfirm" 
                          id="propfirm" 
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="propfirm" className="text-base font-medium cursor-pointer">Prop Firm Account</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Account from a proprietary trading firm like FTMO, Topstep, etc.
                          </p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
              
            {/* Step 2: Account Variant and Size */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Account Variant Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Account Variant</Label>
                  
                  {formData.accountCategory === 'broker' ? (
                    <RadioGroup
                      value={formData.accountVariant}
                      onValueChange={(value) => handleRadioChange('accountVariant', value)}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"
                    >
                      <div
                        className={`border rounded-lg p-5 hover:border-primary cursor-pointer transition-colors ${
                          formData.accountVariant === 'demo' ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem 
                            value="demo" 
                            id="demo" 
                            className="mt-1"
                          />
                          <div>
                            <Label htmlFor="demo" className="text-base font-medium cursor-pointer">Demo Account</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Paper trading account for practice without real money
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div
                        className={`border rounded-lg p-5 hover:border-primary cursor-pointer transition-colors ${
                          formData.accountVariant === 'real' ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem 
                            value="real" 
                            id="real" 
                            className="mt-1"
                          />
                          <div>
                            <Label htmlFor="real" className="text-base font-medium cursor-pointer">Real Account</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Live trading account with real money
                            </p>
                          </div>
                        </div>
                      </div>
                    </RadioGroup>
                  ) : (
                    <RadioGroup
                      value={formData.accountVariant}
                      onValueChange={(value) => handleRadioChange('accountVariant', value)}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"
                    >
                      <div
                        className={`border rounded-lg p-5 hover:border-primary cursor-pointer transition-colors ${
                          formData.accountVariant === 'challenge' ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem 
                            value="challenge" 
                            id="challenge" 
                            className="mt-1"
                          />
                          <div>
                            <Label htmlFor="challenge" className="text-base font-medium cursor-pointer">Challenge Account</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Evaluation phase to prove your trading skills
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div
                        className={`border rounded-lg p-5 hover:border-primary cursor-pointer transition-colors ${
                          formData.accountVariant === 'passed' ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem 
                            value="passed" 
                            id="passed" 
                            className="mt-1"
                          />
                          <div>
                            <Label htmlFor="passed" className="text-base font-medium cursor-pointer">Funded Account</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Live account after passing the challenge
                            </p>
                          </div>
                        </div>
                      </div>
                    </RadioGroup>
                  )}
                </div>
                
                {/* Account Type Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Account Type</Label>
                  <RadioGroup
                    value={formData.accountType}
                    onValueChange={(value) => handleRadioChange('accountType', value)}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3"
                  >
                    <div
                      className={`border rounded-lg p-5 hover:border-primary cursor-pointer transition-colors ${
                        formData.accountType === 'cash' ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem 
                          value="cash" 
                          id="cash" 
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="cash" className="text-base font-medium cursor-pointer">Cash Account</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Trade with available cash without leverage
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div
                      className={`border rounded-lg p-5 hover:border-primary cursor-pointer transition-colors ${
                        formData.accountType === 'futures' ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem 
                          value="futures" 
                          id="futures" 
                          className="mt-1"
                        />
                        <div>
                          <Label htmlFor="futures" className="text-base font-medium cursor-pointer">Futures Account</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Trade futures contracts with leverage
                          </p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Account Size */}
                {showPropFirmSizes ? (
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Account Size</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      {PROP_FIRM_SIZES.map((size) => (
                        <div
                          key={size.value}
                          className={`border rounded-lg p-3 flex items-center justify-center cursor-pointer hover:border-primary transition-colors ${
                            selectedAccountSize === size.value ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
                          }`}
                          onClick={() => handleAccountSizeSelect(size.value)}
                        >
                          <span className="font-medium">{size.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="accountSize" className="text-base font-semibold mb-3 block">Account Size ($)</Label>
                    <Input
                      id="accountSize"
                      name="accountSize"
                      type="number"
                      placeholder="e.g., 10000"
                      value={formData.accountSize}
                      onChange={handleChange}
                      className="max-w-md"
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Step 3: Account Details & Rules */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="broker" className="text-base font-semibold mb-3 block">Broker Name</Label>
                  <Select
                    value={formData.broker}
                    onValueChange={(value) => handleSelectChange('broker', value)}
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Select a broker" />
                    </SelectTrigger>
                    <SelectContent>
                      {BROKERS.map((broker) => (
                        <SelectItem key={broker.value} value={broker.value}>
                          {broker.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {formData.broker === 'other' && (
                    <div className="mt-3">
                      <Label htmlFor="customBroker" className="text-sm font-medium">Custom Broker Name</Label>
                      <Input
                        id="customBroker"
                        name="customBroker"
                        placeholder="Enter broker name"
                        value={formData.customBroker}
                        onChange={handleChange}
                        className="max-w-md mt-1"
                        required
                      />
                    </div>
                  )}
                </div>
                
                {/* Additional fields for prop firm challenge accounts */}
                {showChallengeFields && (
                  <div>
                    <div className="pt-2 pb-3">
                      <h3 className="text-base font-semibold mb-1">Challenge Rules</h3>
                      <p className="text-sm text-muted-foreground">
                        Enter the rules for your prop firm challenge
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="profitTarget" className="text-sm font-medium text-[#089981]">
                          Profit Target (%)
                        </Label>
                        <div className="relative">
                          <Input
                            id="profitTarget"
                            name="profitTarget"
                            type="number"
                            placeholder="e.g., 10"
                            value={formData.profitTarget}
                            onChange={handleChange}
                            className="mt-1 border-[#089981]/30 focus-visible:ring-[#089981]"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#089981] mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                              <polyline points="16 7 22 7 22 13"/>
                            </svg>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Percentage profit needed to pass the challenge
                        </p>
                      </div>
                      
                      <div>
                        <Label htmlFor="dailyLossLimit" className="text-sm font-medium text-amber-500">
                          Daily Loss Limit (%) <span className="text-muted-foreground">(optional)</span>
                        </Label>
                        <Input
                          id="dailyLossLimit"
                          name="dailyLossLimit"
                          type="number"
                          placeholder="e.g., 5"
                          value={formData.dailyLossLimit}
                          onChange={handleChange}
                          className="mt-1 border-amber-500/30 focus-visible:ring-amber-500"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum allowed loss in a single day
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Max loss limit for prop firm accounts (both challenge and funded) */}
                {showPropFirmFields && (
                  <div className="pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <Label htmlFor="maxLossLimit" className="text-sm font-medium text-[#f23645]">
                          Max Loss Limit (%)
                        </Label>
                        <div className="relative">
                          <Input
                            id="maxLossLimit"
                            name="maxLossLimit"
                            type="number"
                            placeholder="e.g., 10"
                            value={formData.maxLossLimit}
                            onChange={handleChange}
                            className="mt-1 border-[#f23645]/30 focus-visible:ring-[#f23645]"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#f23645] mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>
                              <polyline points="16 17 22 17 22 11"/>
                            </svg>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum allowed total account drawdown
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium block mb-1">
                          Max Loss Type
                        </Label>
                        <Select
                          value={formData.maxLossType}
                          onValueChange={(value) => handleRadioChange('maxLossType', value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select loss type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="static">Static (from starting balance)</SelectItem>
                            <SelectItem value="trailing">Trailing (from highest equity)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          How the maximum loss is calculated
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Summary section with updated styling */}
                <div className="mt-8 pt-5 border-t">
                  <h3 className="text-base font-semibold mb-3">Account Summary</h3>
                  <div className="bg-muted/20 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span className="font-medium capitalize">
                        {formData.accountCategory === 'propfirm' ? 'Prop Firm' : 'Broker'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Variant:</span>
                      <span className="font-medium capitalize">{formData.accountVariant}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium capitalize">{formData.accountType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span className="font-medium">${Number(formData.accountSize).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Broker:</span>
                      <span className="font-medium">
                        {formData.broker === 'other' ? formData.customBroker : 
                         BROKERS.find(b => b.value === formData.broker)?.label || ''}
                      </span>
                    </div>
                    
                    {showChallengeFields && formData.profitTarget && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit Target:</span>
                        <span className="font-medium text-[#089981]">{formData.profitTarget}%</span>
                      </div>
                    )}
                    
                    {showPropFirmFields && formData.maxLossLimit && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Loss:</span>
                        <span className="font-medium text-[#f23645]">{formData.maxLossLimit}% ({formData.maxLossType})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        </CardContent>
        
        <CardFooter className="bg-muted/10 px-6 py-4 flex justify-between">
          {currentStep > 1 ? (
            <Button 
              variant="outline" 
              type="button" 
              onClick={handlePreviousStep}
            >
              Back
            </Button>
          ) : (
            <Link href="/dashboard">
              <Button variant="outline">Cancel</Button>
            </Link>
          )}
          
          {currentStep < 3 ? (
            <Button 
              type="button" 
              onClick={handleNextStep}
            >
              Continue
            </Button>
          ) : (
            <Button 
              type="submit" 
              form="accountForm" 
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? 'Adding...' : 'Create Account'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
} 