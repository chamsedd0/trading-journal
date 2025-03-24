'use client'

import { createContext, useContext, useEffect, useState } from "react";
import { 
  GoogleAuthProvider, 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential
} from "firebase/auth";
import { auth } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { useRouter } from "next/navigation";

export interface TradingAccount {
  id?: string;
  name?: string;
  initialBalance: number;
  currentBalance: number;
  accountType: 'real' | 'demo' | 'prop-firm-challenge' | 'prop-firm-real';
  broker?: string;
  
  // Prop firm challenge specific fields
  maxLossLimit?: number; // percentage
  maxDailyLoss?: number; // percentage
  personalDailyTarget?: number; // percentage
  profitTargetToPass?: number; // percentage
  
  // Prop firm real specific fields
  monthlyProfitTarget?: number; // percentage
  
  // Added for later functionality
  createdAt?: any;
  updatedAt?: any;
}

export interface TradingPlan {
  concepts: string[];
  entryRules: string[];
  riskManagement: {
    type: 'dynamic' | 'fixed' | 'custom';
    riskPercentage: number;
    customRules?: string[];
  };
}

export interface UserProfile {
  fullName: string;
  setupStep: number;
  setupComplete: boolean;
  accounts?: TradingAccount[];
  tradingPlan?: TradingPlan;
  connections?: string[];
  pendingConnections?: string[];
  outgoingRequests?: string[];
  isPublicProfile?: boolean;
  hasUnreadNotifications?: boolean;
  socialPrivacy?: {
    showPnL?: boolean;
    showTradingStats?: boolean;
  };
}

interface AuthUser extends User {
  profile?: UserProfile;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<UserCredential>;
  signInWithEmail: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  addAccount: (account: Omit<TradingAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateAccount: (accountId: string, data: Partial<TradingAccount>) => Promise<void>;
  completeSetup: () => Promise<void>;
  refreshAuthState: () => Promise<void>;
  updateConnectionState: (updates: {
    connections?: string[],
    pendingConnections?: string[],
    outgoingRequests?: string[]
  }) => void;
  checkNotifications: () => Promise<void>;
  setHasUnreadNotifications: (value: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          // Get user document from Firestore
          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          
          if (userDoc.exists()) {
            // Combine auth user with additional data from Firestore
            const userData = userDoc.data() as UserProfile;
            const enhancedUser = {
              ...authUser,
              profile: userData
            };
            setUser(enhancedUser);
          } else {
            // If the document doesn't exist yet, create a basic profile
            const basicProfile: UserProfile = {
              fullName: authUser.displayName || '',
              setupStep: 1,
              setupComplete: false,
              accounts: []
            };
            
            // Create a basic user document
            await setDoc(doc(db, "users", authUser.uid), {
              ...basicProfile,
              uid: authUser.uid,
              email: authUser.email,
              displayName: authUser.displayName,
              photoURL: authUser.photoURL,
              createdAt: serverTimestamp()
            });
            
            const enhancedUser = {
              ...authUser,
              profile: basicProfile
            };
            setUser(enhancedUser);
          }
        } catch (error) {
          console.error("Error fetching user data", error);
          setUser(authUser as AuthUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if this is a new user
      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create a new user document with basic profile
        const basicProfile: UserProfile = {
          fullName: result.user.displayName || '',
          setupStep: 1,
          setupComplete: false,
          accounts: []
        };
        
        await setDoc(userRef, {
          ...basicProfile,
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: serverTimestamp()
        });
        
        // Redirect to onboarding for new users
        router.push('/onboarding');
      } else if (!userSnap.data().setupComplete) {
        // Redirect to onboarding if setup is not complete
        router.push('/onboarding');
      } else {
        // Redirect to dashboard for existing users
        router.push('/dashboard');
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create a new user document with basic profile
      const basicProfile: UserProfile = {
        fullName: email.split('@')[0],
        setupStep: 1,
        setupComplete: false,
        accounts: []
      };
      
      await setDoc(doc(db, "users", result.user.uid), {
        ...basicProfile,
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || email.split('@')[0],
        createdAt: serverTimestamp()
      });
      
      // Redirect to onboarding
      router.push('/onboarding');
      
      return result;
    } catch (error) {
      console.error("Error signing up with email", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user has completed setup
      const userDoc = await getDoc(doc(db, "users", result.user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (!userData.setupComplete) {
          // Redirect to onboarding if setup is not complete
          router.push('/onboarding');
        } else {
          // Redirect to dashboard
          router.push('/dashboard');
        }
      } else {
        // Create user document if it doesn't exist
        const basicProfile: UserProfile = {
          fullName: email.split('@')[0],
          setupStep: 1,
          setupComplete: false,
          accounts: []
        };
        
        await setDoc(doc(db, "users", result.user.uid), {
          ...basicProfile,
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || email.split('@')[0],
          createdAt: serverTimestamp()
        });
        
        // Redirect to onboarding
        router.push('/onboarding');
      }
      
      return result;
    } catch (error) {
      console.error("Error signing in with email", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    if (!user) throw new Error("No authenticated user");
    
    try {
      setLoading(true);
      
      // Update user document with profile data
      await updateDoc(doc(db, "users", user.uid), {
        ...profileData,
        updatedAt: serverTimestamp()
      });
      
      // Update local user state
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            ...profileData
          } as UserProfile
        };
      });
    } catch (error) {
      console.error("Error updating profile", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async (account: Omit<TradingAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error("No authenticated user");
    
    try {
      setLoading(true);
      
      // Generate a unique ID for the account
      const accountId = crypto.randomUUID();
      
      // Create a new account with current timestamp as string
      const currentTime = new Date();
      
      const newAccount: TradingAccount = {
        ...account,
        id: accountId,
        createdAt: currentTime,
        updatedAt: currentTime
      };
      
      // Get the current user document
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }
      
      // Get the current accounts array or initialize as empty
      const userData = userDoc.data();
      const currentAccounts = userData.accounts || [];
      
      // Add the new account to the accounts array
      await updateDoc(doc(db, "users", user.uid), {
        accounts: [...currentAccounts, newAccount],
        updatedAt: serverTimestamp()
      });
      
      // Update local user state
      setUser(prev => {
        if (!prev || !prev.profile) return prev;
        
        const updatedAccounts = prev.profile.accounts ? [...prev.profile.accounts, newAccount] : [newAccount];
        
        return {
          ...prev,
          profile: {
            ...prev.profile,
            accounts: updatedAccounts
          }
        };
      });
      
      return accountId;
    } catch (error) {
      console.error("Error adding account", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAccount = async (accountId: string, data: Partial<TradingAccount>) => {
    if (!user) throw new Error("No authenticated user");
    
    try {
      setLoading(true);
      
      // Get the current user document
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }
      
      // Get the current accounts array
      const userData = userDoc.data();
      const currentAccounts = userData.accounts || [];
      
      // Create a current timestamp to use inside the array
      const currentTime = new Date();
      
      // Find and update the specific account
      const updatedAccounts = currentAccounts.map((acc: TradingAccount) => {
        if (acc.id === accountId) {
          return { 
            ...acc, 
            ...data, 
            updatedAt: currentTime 
          };
        }
        return acc;
      });
      
      // Update the user document with the modified accounts array
      await updateDoc(doc(db, "users", user.uid), {
        accounts: updatedAccounts,
        updatedAt: serverTimestamp()
      });
      
      // Update local user state
      setUser(prev => {
        if (!prev || !prev.profile || !prev.profile.accounts) return prev;
        
        const localUpdatedAccounts = prev.profile.accounts.map(account => {
          if (account.id === accountId) {
            return { ...account, ...data, updatedAt: currentTime };
          }
          return account;
        });
        
        return {
          ...prev,
          profile: {
            ...prev.profile,
            accounts: localUpdatedAccounts
          }
        };
      });
    } catch (error) {
      console.error("Error updating account", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async () => {
    if (!user) throw new Error("No authenticated user");
    
    try {
      setLoading(true);
      
      // Update user document with setupComplete flag
      await updateDoc(doc(db, "users", user.uid), {
        setupComplete: true,
        setupStep: 6,
        updatedAt: serverTimestamp()
      });
      
      // Wait for Firebase to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Note: We avoid modifying local state here since it can lead to race conditions
      // The component should handle reloading the document if needed
    } catch (error) {
      console.error("Error completing setup", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshAuthState = async () => {
    if (!user) return;
    
    try {
      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        // Combine auth user with additional data from Firestore
        const userData = userDoc.data();
        const enhancedUser = {
          ...user,
          profile: {
            ...user.profile,
            fullName: userData.fullName,
            setupStep: userData.setupStep,
            setupComplete: userData.setupComplete,
            accounts: userData.accounts || [],
            tradingPlan: userData.tradingPlan,
            connections: userData.connections || [],
            pendingConnections: userData.pendingConnections || [],
            outgoingRequests: userData.outgoingRequests || [],
            isPublicProfile: userData.isPublicProfile,
            hasUnreadNotifications: userData.hasUnreadNotifications || false,
            socialPrivacy: userData.socialPrivacy || {
              showPnL: true,
              showTradingStats: true
            }
          }
        };
        setUser(enhancedUser);
      }
    } catch (error) {
      console.error("Error refreshing auth state", error);
    }
  };

  // Add new function for updating connection state
  const updateConnectionState = (updates: {
    connections?: string[],
    pendingConnections?: string[],
    outgoingRequests?: string[]
  }) => {
    if (!user) return;
    
    setUser(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        profile: {
          ...prev.profile,
          connections: updates.connections !== undefined ? 
            updates.connections : 
            prev.profile?.connections || [],
          pendingConnections: updates.pendingConnections !== undefined ? 
            updates.pendingConnections : 
            prev.profile?.pendingConnections || [],
          outgoingRequests: updates.outgoingRequests !== undefined ? 
            updates.outgoingRequests : 
            prev.profile?.outgoingRequests || []
        } as UserProfile
      };
    });
  };

  // Check for unread notifications
  const checkNotifications = async () => {
    if (!user) return;
    
    try {
      // Update the user document with hasUnreadNotifications flag
      const notificationsRef = collection(db, "users", user.uid, "notifications");
      const q = query(notificationsRef, where("read", "==", false), limit(1));
      const querySnapshot = await getDocs(q);
      
      const hasUnread = !querySnapshot.empty;
      
      if (hasUnread !== user.profile?.hasUnreadNotifications) {
        await updateDoc(doc(db, "users", user.uid), {
          hasUnreadNotifications: hasUnread
        });
        
        // Update local state
        setUser(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            profile: {
              ...prev.profile,
              hasUnreadNotifications: hasUnread
            } as UserProfile
          };
        });
      }
    } catch (error) {
      console.error("Error checking notifications", error);
    }
  };
  
  // Set hasUnreadNotifications flag
  const setHasUnreadNotifications = async (value: boolean) => {
    if (!user) return;
    
    try {
      // Update the user document with hasUnreadNotifications flag
      await updateDoc(doc(db, "users", user.uid), {
        hasUnreadNotifications: value
      });
      
      // Update local state
      setUser(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          profile: {
            ...prev.profile,
            hasUnreadNotifications: value
          } as UserProfile
        };
      });
    } catch (error) {
      console.error("Error setting hasUnreadNotifications", error);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        signInWithGoogle, 
        signUpWithEmail,
        signInWithEmail,
        logout,
        updateProfile,
        addAccount,
        updateAccount,
        completeSetup,
        refreshAuthState,
        updateConnectionState,
        checkNotifications,
        setHasUnreadNotifications
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Helper function to refresh auth state from outside components
export async function refreshAuthState() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("refreshAuthState must be used within an AuthProvider");
  }
  return context.refreshAuthState();
} 