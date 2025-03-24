'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  collection,
  doc, 
  getDoc, 
  updateDoc, 
  arrayRemove, 
  arrayUnion,
  query,
  where,
  getDocs,
  deleteDoc,
  Timestamp,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Check, X, UserMinus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { playNotificationSound, initAudio } from '@/lib/notification-sound';

interface TraderProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  location?: string;
  tradingStyle?: string;
  experience?: string;
}

export default function ConnectionRequestsPage() {
  const { user, updateConnectionState } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<TraderProfile[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<TraderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<Record<string, boolean>>({});
  
  // Fetch connection requests
  useEffect(() => {
    const fetchRequests = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get the user's pending connection and outgoing requests arrays
        const pendingUids = user.profile?.pendingConnections || [];
        const outgoingUids = user.profile?.outgoingRequests || [];
        
        // Fetch incoming request profiles
        const incomingProfiles: TraderProfile[] = [];
        for (const uid of pendingUids) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            incomingProfiles.push({
              uid: userData.uid,
              displayName: userData.displayName || 'Unnamed Trader',
              photoURL: userData.photoURL,
              location: userData.location,
              tradingStyle: userData.tradingStyle,
              experience: userData.experience
            });
          }
        }
        
        // Fetch outgoing request profiles
        const outgoingProfiles: TraderProfile[] = [];
        for (const uid of outgoingUids) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            outgoingProfiles.push({
              uid: userData.uid,
              displayName: userData.displayName || 'Unnamed Trader',
              photoURL: userData.photoURL,
              location: userData.location,
              tradingStyle: userData.tradingStyle,
              experience: userData.experience
            });
          }
        }
        
        setIncomingRequests(incomingProfiles);
        setOutgoingRequests(outgoingProfiles);
      } catch (error) {
        console.error("Error fetching connection requests:", error);
        toast.error("Failed to load connection requests");
      } finally {
        setLoading(false);
      }
    };
    
    fetchRequests();
  }, [user]);
  
  // Accept a connection request
  const acceptRequest = async (traderId: string) => {
    if (!user) return;
    
    try {
      setProcessingRequest(prev => ({ ...prev, [traderId]: true }));
      console.log(`Accepting request from trader ${traderId}`);
      
      // Get a reference to the batch
      const batch = writeBatch(db);
      
      // 1. Add to current user's connections
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, {
        connections: arrayUnion(traderId),
        pendingConnections: arrayRemove(traderId)
      });
      
      // 2. Add to the trader's connections, remove from outgoingRequests
      const traderRef = doc(db, 'users', traderId);
      batch.update(traderRef, {
        connections: arrayUnion(user.uid),
        outgoingRequests: arrayRemove(user.uid),
        hasUnreadNotifications: true // Mark as having unread notifications
      });
      
      // 3. Create notification for the trader
      const notification = {
        type: 'connection_accepted',
        fromUserId: user.uid,
        fromUserName: user.profile?.fullName || user.displayName || 'A trader',
        fromUserPhoto: user.photoURL || '',
        read: false,
        createdAt: Timestamp.now()
      };
      
      const notificationRef = doc(collection(db, 'users', traderId, 'notifications'));
      batch.set(notificationRef, notification);
      
      // 4. Commit the batch
      await batch.commit();
      
      // 5. Update the local state
      setIncomingRequests(prev => prev.filter(req => req.uid !== traderId));
      
      toast.success('Connection request accepted');
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept connection request');
    } finally {
      setProcessingRequest(prev => ({ ...prev, [traderId]: false }));
    }
  };
  
  // Reject a connection request
  const rejectRequest = async (traderUid: string) => {
    if (!user) return;
    
    try {
      setProcessingRequest(prev => ({ ...prev, [traderUid]: true }));
      
      // Get current pending connections
      const currentPendingConnections = user.profile?.pendingConnections || [];
      
      // 1. Remove from pending connections
      await updateDoc(doc(db, 'users', user.uid), {
        pendingConnections: arrayRemove(traderUid)
      });
      
      // 2. Remove from other user's outgoing requests
      await updateDoc(doc(db, 'users', traderUid), {
        outgoingRequests: arrayRemove(user.uid)
      });
      
      // 3. Update local state
      setIncomingRequests(prev => prev.filter(r => r.uid !== traderUid));
      
      // 4. Update auth context state
      updateConnectionState({
        pendingConnections: currentPendingConnections.filter(id => id !== traderUid)
      });
      
      // 5. Show success toast
      toast.success("Connection request rejected");
      
    } catch (error) {
      console.error("Error rejecting connection request:", error);
      toast.error("Failed to reject request");
    } finally {
      setProcessingRequest(prev => ({ ...prev, [traderUid]: false }));
    }
  };
  
  // Cancel an outgoing request
  const cancelRequest = async (traderUid: string) => {
    if (!user) return;
    
    try {
      setProcessingRequest(prev => ({ ...prev, [traderUid]: true }));
      
      // Get current connection state
      const currentOutgoingRequests = user.profile?.outgoingRequests || [];
      
      // 1. Remove from outgoing requests
      await updateDoc(doc(db, 'users', user.uid), {
        outgoingRequests: arrayRemove(traderUid)
      });
      
      // 2. Remove from other user's pending connections
      await updateDoc(doc(db, 'users', traderUid), {
        pendingConnections: arrayRemove(user.uid)
      });
      
      // 3. Update local state
      setOutgoingRequests(prev => prev.filter(r => r.uid !== traderUid));
      
      // 4. Update auth context state
      updateConnectionState({
        outgoingRequests: currentOutgoingRequests.filter(id => id !== traderUid)
      });
      
      // 5. Show success toast
      toast.success("Connection request canceled");
      
    } catch (error) {
      console.error("Error canceling connection request:", error);
      toast.error("Failed to cancel request");
    } finally {
      setProcessingRequest(prev => ({ ...prev, [traderUid]: false }));
    }
  };
  
  // Initialize audio on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      initAudio();
      // Remove event listeners after initialization
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
    
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);
  
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/traders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Connection Requests</h1>
        </div>
      </div>
      
      <Tabs defaultValue="incoming" className="space-y-6">
        <TabsList className="w-full md:w-[400px]">
          <TabsTrigger value="incoming" className="flex-1">
            Incoming Requests ({incomingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="flex-1">
            Sent Requests ({outgoingRequests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="incoming">
          {loading ? (
            // Loading skeleton for incoming requests
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="w-full p-4 border rounded-md flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            ))
          ) : incomingRequests.length > 0 ? (
            // Actual incoming requests
            incomingRequests.map((trader) => (
              <div 
                key={trader.uid} 
                className="w-full p-4 border rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2 hover:bg-muted/20 transition-colors mb-2"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={trader.photoURL} alt={trader.displayName} />
                    <AvatarFallback>
                      {trader.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{trader.displayName}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {trader.location && (
                        <span className="text-sm text-muted-foreground">{trader.location}</span>
                      )}
                      {trader.tradingStyle && (
                        <Badge variant="outline">{trader.tradingStyle}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2 w-full sm:w-auto justify-end">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          onClick={() => acceptRequest(trader.uid)}
                          disabled={processingRequest[trader.uid]}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Accept</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => rejectRequest(trader.uid)}
                          disabled={processingRequest[trader.uid]}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reject</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))
          ) : (
            // No incoming requests
            <div className="text-center py-12">
              <h3 className="text-lg font-medium">No incoming requests</h3>
              <p className="text-muted-foreground mt-1">
                You don't have any pending connection requests at the moment.
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="outgoing">
          {loading ? (
            // Loading skeleton for outgoing requests
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="w-full p-4 border rounded-md flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                </div>
                <Skeleton className="h-9 w-9" />
              </div>
            ))
          ) : outgoingRequests.length > 0 ? (
            // Actual outgoing requests
            outgoingRequests.map((trader) => (
              <div 
                key={trader.uid} 
                className="w-full p-4 border rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2 hover:bg-muted/20 transition-colors mb-2"
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={trader.photoURL} alt={trader.displayName} />
                    <AvatarFallback>
                      {trader.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{trader.displayName}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {trader.location && (
                        <span className="text-sm text-muted-foreground">{trader.location}</span>
                      )}
                      {trader.tradingStyle && (
                        <Badge variant="outline">{trader.tradingStyle}</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => cancelRequest(trader.uid)}
                        disabled={processingRequest[trader.uid]}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cancel Request</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))
          ) : (
            // No outgoing requests
            <div className="text-center py-12">
              <h3 className="text-lg font-medium">No outgoing requests</h3>
              <p className="text-muted-foreground mt-1">
                You haven't sent any connection requests that are pending.
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/traders/find">
                  Find Traders
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 