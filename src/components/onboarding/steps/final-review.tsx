'use client';

import { useOnboarding } from "@/lib/onboarding-context";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
export function FinalReviewStep() {
  const { state } = useOnboarding();
  const { user, updateProfile, refreshAuthState } = useAuth();
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
      
      // Mark setup as complete directly in Firestore
      const db = (await import('@/lib/firebase')).db;
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Update user document directly to mark setup as complete
      await updateDoc(doc(db, "users", user.uid), {
        setupComplete: true,
        setupStep: 5,
        updatedAt: serverTimestamp()
      });
      
      // Force refresh the auth state
      await refreshAuthState();
      
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
        
        <h3 className="text-lg font-medium">Trading Plan</h3>
        <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
          <div>
            <p className="font-medium mb-1">Concepts</p>
            {state.tradingPlan.concepts && state.tradingPlan.concepts.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {state.tradingPlan.concepts.map((concept, index) => (
                  <span key={index} className="px-2 py-1 rounded-sm bg-primary/10 text-primary text-xs">
                    {concept}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No concepts defined</p>
            )}
          </div>
          
          <div>
            <p className="font-medium mb-1">Entry Rules</p>
            {state.tradingPlan.entryRules && state.tradingPlan.entryRules.length > 0 ? (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {state.tradingPlan.entryRules.map((rule, index) => (
                  <li key={index}>{rule}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No entry rules defined</p>
            )}
          </div>
        </div>
        
        <h3 className="text-lg font-medium">Risk Management</h3>
        <div className="p-4 bg-secondary/30 rounded-lg">
          <div className="space-y-2">
            <p><strong>Risk Per Trade:</strong> {state.tradingPlan.riskManagement.riskPercentage}%</p>
            <p><strong>Target Risk:Reward Ratio:</strong> 1:{state.tradingPlan.riskManagement.targetRiskRewardRatio}</p>
            <p>
              <strong>Risk Reduction After Loss:</strong> 
              {state.tradingPlan.riskManagement.reduceRiskAfterLoss ? ' Enabled' : ' Disabled'}
            </p>
          </div>
        </div>
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