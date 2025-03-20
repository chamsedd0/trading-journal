'use client';

import { useOnboarding } from "@/lib/onboarding-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
export function FinalReviewStep() {
  const { state } = useOnboarding();
  const { user, updateProfile, addAccount } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleComplete = async () => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      // Update user profile with personal info
      await updateProfile({
        fullName: state.personalInfo.fullName
      });
      
      // Add all trading accounts (if any)
      const accountPromises = state.accounts.map(account => 
        addAccount({
          name: `${account.accountType} Account`,
          initialBalance: account.initialBalance,
          currentBalance: account.currentBalance,
          accountType: account.accountType,
        })
      );
      
      // Wait for all accounts to be added
      await Promise.all(accountPromises);
      
      // Mark setup as complete directly in Firestore
      const db = (await import('@/lib/firebase')).db;
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Update user document directly to mark setup as complete
      await updateDoc(doc(db, "users", user.uid), {
        setupComplete: true,
        setupStep: 6,
        updatedAt: serverTimestamp()
      });
      
      toast.success("Setup completed successfully", {
        description: "Your trading journal has been set up. Redirecting to dashboard..."
      });
      
      // Redirect to dashboard
      router.push('/dashboard');

    } catch (error) {
      console.error("Error completing setup:", error);
      toast.error("Error", {
        description: "There was a problem completing your setup. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Personal Information</h3>
        <div className="p-4 bg-secondary/30 rounded-lg">
          <p><strong>Name:</strong> {state.personalInfo.fullName}</p>
        </div>
        
        <h3 className="text-lg font-medium">Trading Accounts</h3>
        {state.accounts.length > 0 ? (
          <div className="space-y-2">
            {state.accounts.map((account, index) => (
              <div key={index} className="p-4 bg-secondary/30 rounded-lg">
                <p><strong>Account Type:</strong> {account.accountType.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                <p><strong>Initial Balance:</strong> ${account.initialBalance.toLocaleString()}</p>
                <p><strong>Current Balance:</strong> ${account.currentBalance.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-secondary/30 rounded-lg">
            <p className="text-muted-foreground">No trading accounts added</p>
          </div>
        )}
      </div>
      
      <div className="pt-4">
        <Button 
          onClick={handleComplete} 
          disabled={isSubmitting} 
          className="w-full"
        >
          {isSubmitting ? "Completing Setup..." : "Complete Setup"}
        </Button>
      </div>
    </div>
  );
} 