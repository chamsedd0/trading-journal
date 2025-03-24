'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, UserPlus, Check, Trash2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';
import { playNotificationSound, initAudio } from '@/lib/notification-sound';
import { useIsMobile } from '@/hooks/use-media-query';

// Add this at the top to check if window is defined (for SSR)
const isClient = typeof window !== 'undefined';

interface Notification {
  id: string;
  type: 'connection_request' | 'connection_accepted' | 'message';
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  read: boolean;
  createdAt: Timestamp;
  // Message specific fields
  messageContent?: string;
}

// Function to render notification item (used in both mobile and desktop)
function NotificationItem({
  notification,
  onDelete,
  onClick,
}: {
  notification: Notification;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
}) {
  // Function to format notification time
  const formatNotificationTime = (timestamp: Timestamp) => {
    const now = new Date();
    const notificationDate = timestamp.toDate();
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return notificationDate.toLocaleDateString();
    }
  };
  
  // Get notification message based on type
  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'connection_request':
        return `${notification.fromUserName} sent you a connection request`;
      case 'connection_accepted':
        return `${notification.fromUserName} accepted your connection request`;
      case 'message':
        return `${notification.fromUserName}: ${notification.messageContent}`;
      default:
        return 'You have a new notification';
    }
  };
  
  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'connection_request':
        return <UserPlus className="h-4 w-4 text-primary" />;
      case 'connection_accepted':
        return <Check className="h-4 w-4 text-primary" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };
  
  return (
    <div 
      key={notification.id} 
      className={cn(
        "p-3 flex items-start gap-2 cursor-pointer border-b last:border-0 border-border/50",
        !notification.read && "bg-muted/40"
      )}
      onClick={() => onClick(notification)}
    >
      {/* Message notification */}
      {notification.type === 'message' && (
        <div className="flex items-start gap-2 w-full">
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={notification.fromUserPhoto} />
            <AvatarFallback className="bg-primary/10">
              {notification.fromUserName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex justify-between items-start gap-2">
              <span className="font-medium text-sm">{notification.fromUserName}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatNotificationTime(notification.createdAt)}
              </span>
            </div>
            <div className="flex items-start gap-1">
              <MessageSquare className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground flex-1 line-clamp-2">
                {notification.messageContent || 'Sent you a message'}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Other notification types */}
      {notification.type !== 'message' && (
        <div className="flex-1 space-y-1 w-full">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              {getNotificationIcon(notification.type)}
              <p className="font-semibold text-sm">
                {notification.fromUserName}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatNotificationTime(notification.createdAt)}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {getNotificationMessage(notification)}
          </p>
        </div>
      )}
    </div>
  );
}

// Mobile notification drawer component
function MobileNotificationDrawer({
  notifications,
  hasUnread,
  clearAllNotifications,
  deleteNotification,
  handleNotificationClick,
  markAllAsRead,
}: {
  notifications: Notification[];
  hasUnread: boolean;
  clearAllNotifications: () => void;
  deleteNotification: (id: string) => void;
  handleNotificationClick: (notification: Notification) => void;
  markAllAsRead: () => void;
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // When drawer is opened, mark notifications as read
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && hasUnread) {
      markAllAsRead();
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="h-5 w-5" />
          {(hasUnread || user?.profile?.hasUnreadNotifications) && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/75 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="p-0 w-full max-w-md sm:max-w-lg">
        <SheetHeader className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 mr-1">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </SheetClose>
              <SheetTitle className="text-lg font-semibold m-0">Notifications</SheetTitle>
            </div>
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs" 
                onClick={clearAllNotifications}
              >
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-64px)] w-full">
          <div className="divide-y divide-border/50">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id}
                  notification={notification}
                  onDelete={deleteNotification}
                  onClick={handleNotificationClick}
                />
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="bg-muted/40 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No notifications</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function NotificationDropdown() {
  const { user, setHasUnreadNotifications } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Use the hook for mobile detection
  const isMobile = useIsMobile();
  
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
  
  // Listen for new notifications
  useEffect(() => {
    if (!user) return;
    
    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(20) // Increase limit to ensure we catch all notifications
    );
    
    console.log("Setting up notification listener");
    
    let isFirstLoad = true;
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Check for newly added notifications
      const addedNotifications = snapshot.docChanges()
        .filter(change => change.type === 'added')
        .map(change => ({
          id: change.doc.id,
          ...change.doc.data()
        } as Notification));
        
      console.log(`Notification update: ${snapshot.docs.length} total, ${addedNotifications.length} new`);
      
      // Get all notifications for state
      const allNotifications: Notification[] = [];
      let foundUnread = false;
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<Notification, 'id'>;
        allNotifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt
        });
        
        if (!data.read) {
          foundUnread = true;
        }
      });
      
      // Only play sound if this is not the first load (when component mounts)
      // and we have newly added notifications
      if (!isFirstLoad && addedNotifications.length > 0) {
        console.log("New notification detected", addedNotifications[0]);
        
        // Get the newest notification
        const latestNotification = addedNotifications[0];
        
        // Play sound for the notification
        playNotificationSound();
        
        // Show toast for new notification
        toast.info(getNotificationMessage(latestNotification), {
          description: formatNotificationTime(latestNotification.createdAt),
          duration: 4000,
        });
      }
      
      isFirstLoad = false;
      setNotificationCount(allNotifications.length);
      setNotifications(allNotifications);
      setHasUnread(foundUnread);
    });
    
    return () => unsubscribe();
  }, [user]);
  
  // Mark notifications as read when dropdown is opened
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    if (open && hasUnread && user) {
      markAllAsRead();
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      const unreadNotifications = notifications.filter(n => !n.read);
      
      unreadNotifications.forEach(notification => {
        const notificationRef = doc(db, 'users', user.uid, 'notifications', notification.id);
        batch.update(notificationRef, { read: true });
      });
      
      // Update hasUnreadNotifications flag in user document
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, { hasUnreadNotifications: false });
      
      await batch.commit();
      
      // Also update the user context
      setHasUnreadNotifications(false);
      
      // Update local state
      setHasUnread(false);
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Error marking notifications as read', error);
    }
  };
  
  // Delete a single notification
  const deleteNotification = async (notificationId: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notifications', notificationId));
      
      // Update local state
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification', error);
      toast.error('Failed to delete notification');
    }
  };
  
  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      
      notifications.forEach(notification => {
        const notificationRef = doc(db, 'users', user.uid, 'notifications', notification.id);
        batch.delete(notificationRef);
      });
      
      await batch.commit();
      
      // Update local state
      setNotifications([]);
      setHasUnread(false);
      
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications', error);
      toast.error('Failed to clear notifications');
    }
  };
  
  // Handle notification click based on type
  const handleNotificationClick = async (notification: Notification) => {
    try {
      switch (notification.type) {
        case 'connection_request':
          router.push('/dashboard/traders/requests');
          break;
        
        case 'connection_accepted':
          router.push(`/dashboard/traders/profile/${notification.fromUserId}`);
          break;
        
        case 'message': {
          console.log("Handling message notification click", notification);
          
          // Find the thread with this user
          const threadQuery = query(
            collection(db, 'messageThreads'),
            where('participants', 'array-contains', user?.uid || '')
          );
          
          const threadSnapshot = await getDocs(threadQuery);
          let threadId: string | null = null;
          
          // Find the thread with the notification sender
          threadSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.participants.includes(notification.fromUserId)) {
              threadId = doc.id;
              console.log("Found thread ID:", threadId);
            }
          });
          
          if (threadId) {
            // Mark this specific notification as read before navigating
            await updateDoc(doc(db, 'users', user?.uid || '', 'notifications', notification.id), {
              read: true
            });
            
            router.push(`/dashboard/messages/${threadId}`);
          } else {
            console.error("Thread not found for message notification", notification);
            toast.error('Conversation not found');
            router.push('/dashboard/messages');
          }
          break;
        }
        
        default:
          router.push('/dashboard/messages');
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
      toast.error("Could not process notification");
    }
    
    setIsOpen(false);
  };
  
  // Get notification message based on type
  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'connection_request':
        return `${notification.fromUserName} sent you a connection request`;
      case 'connection_accepted':
        return `${notification.fromUserName} accepted your connection request`;
      case 'message':
        return `${notification.fromUserName}: ${notification.messageContent}`;
      default:
        return 'You have a new notification';
    }
  };
  
  // Format notification time
  const formatNotificationTime = (timestamp: Timestamp) => {
    const now = new Date();
    const notificationDate = timestamp.toDate();
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return notificationDate.toLocaleDateString();
    }
  };
  
  // Render desktop or mobile version based on screen size
  if (isMobile) {
    return (
      <MobileNotificationDrawer
        notifications={notifications}
        hasUnread={hasUnread}
        clearAllNotifications={clearAllNotifications}
        deleteNotification={deleteNotification}
        handleNotificationClick={handleNotificationClick}
        markAllAsRead={markAllAsRead}
      />
    );
  }
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="h-5 w-5" />
          {(hasUnread || user?.profile?.hasUnreadNotifications) && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/75 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px] p-0">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs" 
              onClick={clearAllNotifications}
            >
              Clear all
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px] max-h-[60vh]">
          <DropdownMenuGroup>
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationItem 
                  key={notification.id}
                  notification={notification}
                  onDelete={deleteNotification}
                  onClick={handleNotificationClick}
                />
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No notifications</p>
              </div>
            )}
          </DropdownMenuGroup>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 