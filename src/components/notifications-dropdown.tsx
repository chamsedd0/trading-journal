'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, X, Check, MessageSquare, 
  Bell, ExternalLink, User, Users
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { 
  collection, query, where, getDocs, 
  doc as firestoreDoc, updateDoc, deleteDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'connectionRequest' | 'message' | 'system';
  fromUid?: string;
  fromName?: string;
  fromPhotoURL?: string;
  createdAt: any;
  read: boolean;
  message?: string;
  docRef?: string;
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);
  const router = useRouter();
  const { user, updateUserProfile } = useAuth();

  // Fetch notifications when the dropdown is opened
  useEffect(() => {
    if (open && user) {
      fetchNotifications();
      // Mark as viewed when opened
      setHasViewedNotifications(true);
    }
  }, [open, user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch connection requests
      const connectionRequestsQuery = query(
        collection(db, "connectionRequests"),
        where("toUid", "==", user.uid),
        where("status", "==", "pending")
      );
      
      const connectionRequestsSnapshot = await getDocs(connectionRequestsQuery);
      
      // Fetch messages where read status is false
      const messagesQuery = query(
        collection(db, "messages"),
        where("participants", "array-contains", user.uid)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      // Process connection requests
      const connectionNotifications: Notification[] = [];
      
      for (const docSnapshot of connectionRequestsSnapshot.docs) {
        const data = docSnapshot.data();
        
        // Fetch user info for the sender
        const userDoc = await getDocs(query(
          collection(db, "users"),
          where("uid", "==", data.fromUid)
        ));
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          
          connectionNotifications.push({
            id: docSnapshot.id,
            type: 'connectionRequest',
            fromUid: data.fromUid,
            fromName: userData.displayName || 'Anonymous User',
            fromPhotoURL: userData.photoURL || '',
            createdAt: data.createdAt,
            read: open, // Mark as read if the dropdown is open
            message: 'wants to connect with you',
            docRef: docSnapshot.id
          });
        }
      }
      
      // Process messages
      const messageNotifications: Notification[] = [];
      
      for (const docSnapshot of messagesSnapshot.docs) {
        const data = docSnapshot.data();
        
        // Only include messages sent by others and that are unread by current user
        if (data.senderId !== user.uid && 
            (!data.read || !data.read[user.uid] || data.read[user.uid] === false)) {
          
          // Fetch user info for the sender
          const userDoc = await getDocs(query(
            collection(db, "users"),
            where("uid", "==", data.senderId)
          ));
          
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            
            // Mark messages as read in the database when notifications are opened
            if (open) {
              const messageRef = firestoreDoc(db, "messages", docSnapshot.id);
              const readUpdate = { [`read.${user.uid}`]: true };
              updateDoc(messageRef, readUpdate).catch(error => {
                console.error("Error marking message as read:", error);
              });
            }
            
            messageNotifications.push({
              id: docSnapshot.id,
              type: 'message',
              fromUid: data.senderId,
              fromName: userData.displayName || 'Anonymous User',
              fromPhotoURL: userData.photoURL || '',
              createdAt: data.timestamp,
              read: open, // Mark as read if the dropdown is open
              message: data.text && data.text.length > 30 ? data.text.substring(0, 30) + '...' : (data.text || 'New message'),
              docRef: docSnapshot.id
            });
          }
        }
      }
      
      // Combine and sort all notifications by date (newest first)
      const allNotifications = [...connectionNotifications, ...messageNotifications]
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
          return dateB.getTime() - dateA.getTime();
        });
      
      // Check if there are new notifications to show the indicator
      const hasNewNotifications = allNotifications.length > 0;
      
      // If we have notifications but the dropdown isn't open, 
      // we need to show the indicator until the user opens the dropdown
      if (!open && hasNewNotifications) {
        setHasViewedNotifications(false);
      }
      
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Run the fetch notifications periodically to check for new ones
  useEffect(() => {
    if (user) {
      // Initial fetch
      fetchNotifications();
      
      // Periodic check every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user]);

  // Mark all notifications as read when dropdown closes
  useEffect(() => {
    if (!open && notifications.length > 0) {
      // Mark all notifications as read in the local state
      setNotifications(prev => prev.map(notification => ({
        ...notification,
        read: true
      })));
    }
  }, [open, notifications.length]);

  const handleAcceptRequest = async (notification: Notification) => {
    if (!user || !notification.fromUid || !notification.docRef) return;
    
    try {
      // Update the request status
      await updateDoc(firestoreDoc(db, "connectionRequests", notification.docRef), {
        status: "accepted",
        updatedAt: serverTimestamp()
      });
      
      // Create connections for both users
      await Promise.all([
        // Add the requester to current user's following list
        addDoc(collection(db, "connections"), {
          userId: user.uid,
          connectedUserId: notification.fromUid,
          createdAt: serverTimestamp()
        }),
        // Add current user to requester's following list
        addDoc(collection(db, "connections"), {
          userId: notification.fromUid,
          connectedUserId: user.uid,
          createdAt: serverTimestamp()
        }),
      ]);
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n.id !== notification.id)
      );
      
      toast.success(`Connection accepted with ${notification.fromName}`);
      
      // Refresh user data in context
      await updateUserProfile({});
    } catch (error) {
      console.error('Error accepting connection request:', error);
      toast.error('Failed to accept connection request');
    }
  };

  const handleRejectRequest = async (notification: Notification) => {
    if (!notification.docRef) return;
    
    try {
      // Delete the connection request
      await deleteDoc(firestoreDoc(db, "connectionRequests", notification.docRef));
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n.id !== notification.id)
      );
      
      toast.success('Connection request rejected');
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      toast.error('Failed to reject request');
    }
  };

  const handleMessageClick = (notification: Notification) => {
    if (!notification.fromUid) return;
    
    // Mark the message as read
    if (notification.docRef) {
      const messageRef = firestoreDoc(db, "messages", notification.docRef);
      const readUpdate = { [`read.${user?.uid}`]: true };
      updateDoc(messageRef, readUpdate).catch(error => {
        console.error("Error marking message as read:", error);
      });
    }
    
    // Navigate to messages with this contact
    router.push(`/dashboard/messages?contact=${notification.fromUid}`);
    setOpen(false);
  };

  // Count unread notifications for the indicator
  const unreadCount = notifications.filter(n => !n.read).length;
  // Only show the indicator if we have unread notifications and haven't viewed them
  const showNotificationIndicator = unreadCount > 0 && !hasViewedNotifications;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="h-5 w-5" />
          {showNotificationIndicator && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/75 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 max-h-[500px] overflow-y-auto" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-medium">Notifications</h4>
          <Badge variant="secondary" className="text-xs">
            {unreadCount} unread
          </Badge>
        </div>
        
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map(notification => (
              <div key={notification.id} className={`p-3 hover:bg-muted/50 transition-colors ${notification.read ? 'opacity-70' : ''}`}>
                {notification.type === 'connectionRequest' ? (
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={notification.fromPhotoURL} alt={notification.fromName} />
                      <AvatarFallback>{notification.fromName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{notification.fromName}</div>
                        <div className="text-xs text-muted-foreground">
                          {notification.createdAt?.toDate ? 
                            formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Recently'}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <UserPlus className="h-3 w-3" /> 
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Button 
                          size="sm" 
                          variant="default" 
                          className="h-7 px-2 text-xs"
                          onClick={() => handleAcceptRequest(notification)}
                        >
                          <Check className="h-3 w-3 mr-1" /> Accept
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 text-xs"
                          onClick={() => handleRejectRequest(notification)}
                        >
                          <X className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : notification.type === 'message' ? (
                  <div 
                    className="flex items-start gap-3 cursor-pointer" 
                    onClick={() => handleMessageClick(notification)}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={notification.fromPhotoURL} alt={notification.fromName} />
                      <AvatarFallback>{notification.fromName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{notification.fromName}</div>
                        <div className="text-xs text-muted-foreground">
                          {notification.createdAt?.toDate ? 
                            formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Recently'}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> 
                        New message: {notification.message}
                      </p>
                      <div className="text-xs text-primary flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3" /> View conversation
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">System Notification</div>
                        <div className="text-xs text-muted-foreground">
                          {notification.createdAt?.toDate ? 
                            formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : 'Recently'}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {notifications.length > 0 && (
          <div className="p-2 border-t text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs w-full"
              onClick={() => {
                router.push('/dashboard/settings?tab=notifications');
                setOpen(false);
              }}
            >
              Notification Settings
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
} 