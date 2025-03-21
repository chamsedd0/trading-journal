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