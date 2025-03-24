'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Bell } from 'lucide-react';
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

export function NotificationDropdown() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Listen for new notifications
  useEffect(() => {
    if (!user) return;
    
    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(
      notificationsRef,
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications: Notification[] = [];
      let foundUnread = false;
      
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<Notification, 'id'>;
        newNotifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt
        });
        
        if (!data.read) {
          foundUnread = true;
        }
      });
      
      setNotifications(newNotifications);
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
  const handleNotificationClick = (notification: Notification) => {
    switch (notification.type) {
      case 'connection_request':
        router.push('/dashboard/traders/requests');
        break;
      case 'connection_accepted':
        router.push(`/dashboard/traders/${notification.fromUserId}`);
        break;
      case 'message':
        // This will be implemented when chat system is ready
        toast.info('Chat system coming soon!');
        break;
    }
    
    setIsOpen(false);
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
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/75 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
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
                <DropdownMenuItem 
                  key={notification.id} 
                  className={cn(
                    "p-3 flex items-start gap-2 cursor-pointer",
                    !notification.read && "bg-muted/40"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Avatar className="h-9 w-9 flex-shrink-0">
                    <AvatarImage src={notification.fromUserPhoto} />
                    <AvatarFallback>
                      {notification.fromUserName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
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
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p>Delete notification</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getNotificationMessage(notification)}
                    </p>
                  </div>
                </DropdownMenuItem>
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