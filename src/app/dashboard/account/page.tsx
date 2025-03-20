'use client';

import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

interface AccountInfo {
  broker: string;
  accountType: string;
  accountSize: number;
}

export default function AccountPage() {
  const { user } = useAuth();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AccountInfo>({
    broker: '',
    accountType: '',
    accountSize: 0
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  useEffect(() => {
    const fetchAccountInfo = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const account = {
            broker: userData.broker || '',
            accountType: userData.accountType || '',
            accountSize: userData.accountSize || 0
          };
          
          setAccountInfo(account);
          setFormData(account);
        }
      } catch (error) {
        console.error("Error fetching account info:", error);
        toast.error("Error", {
          description: "Failed to load account information"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccountInfo();
  }, [user]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'accountSize' ? parseFloat(value) || 0 : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      setUpdating(true);
      
      await updateDoc(doc(db, "users", user.uid), {
        broker: formData.broker,
        accountType: formData.accountType,
        accountSize: formData.accountSize
      });
      
      setAccountInfo(formData);
      setIsEditing(false);
      
      toast.success("Account updated", {
        description: "Your account information has been updated successfully"
      });
    } catch (error) {
      console.error("Error updating account info:", error);
      toast.error("Error", {
        description: "Failed to update account information"
      });
    } finally {
      setUpdating(false);
    }
  };
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Account</h1>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trading Account</CardTitle>
              <CardDescription>Your trading account information</CardDescription>
            </div>
            
            {!isEditing && (
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="broker">Broker</Label>
                <Input
                  id="broker"
                  name="broker"
                  value={formData.broker}
                  onChange={handleInputChange}
                  placeholder="Your broker name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <Input
                  id="accountType"
                  name="accountType"
                  value={formData.accountType}
                  onChange={handleInputChange}
                  placeholder="Cash, Margin, etc."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountSize">Account Size ($)</Label>
                <Input
                  id="accountSize"
                  name="accountSize"
                  type="number"
                  value={formData.accountSize}
                  onChange={handleInputChange}
                  placeholder="Your account size"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updating}
                >
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(accountInfo || {
                      broker: '',
                      accountType: '',
                      accountSize: 0
                    });
                  }}
                  disabled={updating}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Broker</p>
                <p>{accountInfo?.broker || "Not set"}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Type</p>
                <p>{accountInfo?.accountType || "Not set"}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Size</p>
                <p>${accountInfo?.accountSize?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p>{user?.displayName || "Not set"}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{user?.email || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 