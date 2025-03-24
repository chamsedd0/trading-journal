'use client';

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { LayoutSkeleton } from "@/components/skeletons/layout-skeleton";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { playNotificationSound, initAudio } from '@/lib/notification-sound';
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy, limit, Timestamp, doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading, logout, checkNotifications } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastNotificationTimestamp, setLastNotificationTimestamp] = useState<Timestamp | null>(null);
  
  // Initialize audio context on page load for user interaction
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
  
  // Global notification listener for the entire dashboard
  useEffect(() => {
    if (!user) return;
    
    // Listen for notifications across the app
    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(
      notificationsRef,
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    let isFirstLoad = true;
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Get new notifications
      const unreadNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const newNotifications = snapshot.docChanges()
        .filter(change => change.type === 'added')
        .map(change => change.doc.data());
      
      // Only process after first load to avoid playing sounds on app startup
      if (!isFirstLoad && newNotifications.length > 0) {
        console.log("Dashboard detected new notification:", newNotifications[0]);
        
        // Update user's hasUnreadNotifications flag
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { 
            hasUnreadNotifications: true 
          });
          
          // Play notification sound
          playNotificationSound();
          
          // Show toast for the notification
          const latestNotification = newNotifications[0];
          let message = '';
          const type = latestNotification.type;
          
          if (type === 'connection_request') {
            message = `${latestNotification.fromUserName} sent you a connection request`;
          } else if (type === 'connection_accepted') {
            message = `${latestNotification.fromUserName} accepted your connection request`;
          } else if (type === 'message') {
            message = `New message from ${latestNotification.fromUserName}`;
            if (latestNotification.messageContent) {
              message += `: ${latestNotification.messageContent.substring(0, 30)}${latestNotification.messageContent.length > 30 ? '...' : ''}`;
            }
          }
          
          toast.info(message, {
            duration: 4000,
          });
        } catch (error) {
          console.error("Error updating unread notifications state:", error);
        }
      }
      
      isFirstLoad = false;
      setNotificationCount(unreadNotifications.length);
    });
    
    return () => unsubscribe();
  }, [user]);

  // NEW: Global listener for new messages
  useEffect(() => {
    if (!user) return;
    
    // Create a listener for all messages where the current user is the receiver
    const messagesRef = collection(db, 'messages');
    const messagesQuery = query(
      messagesRef,
      where('receiverId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      // Check for new messages (added documents)
      const newMessages = snapshot.docChanges().filter(change => change.type === 'added');
      
      if (newMessages.length > 0) {
        console.log(`Global listener: ${newMessages.length} new messages detected`);
        
        // Get current pathname to check if we're in a conversation
        const pathname = window.location.pathname;
        const inConversation = pathname.includes('/dashboard/messages/') && 
                              pathname !== '/dashboard/messages';
        
        // Only play sound if we're not currently in that conversation
        if (!inConversation) {
          playNotificationSound();
          
          // Show a toast for the new message
          const latestMessage = newMessages[0].doc.data();
          toast.info(`New message from ${latestMessage.senderName || 'a trader'}`, {
            duration: 4000,
          });
        }
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  // Check for saved sidebar state in localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed');
    if (savedCollapsed !== null) {
      setCollapsed(savedCollapsed === 'true');
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed.toString());
  }, [collapsed]);
  
  useEffect(() => {
    // Redirect if user is not logged in
    if (!loading && !user) {
      router.push('/auth/login');
    }
    
    // Redirect if user has not completed setup
    if (!loading && user && user.profile?.setupComplete === false) {
      router.push('/onboarding');
    }
    
    // Close mobile sidebar when pathname changes
    setMobileOpen(false);
  }, [user, loading, router, pathname]);
  
  // Check for unread notifications when layout loads
  useEffect(() => {
    if (user) {
      checkNotifications();
    }
  }, [user, checkNotifications]);
  
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };
  
  if (loading) {
    return <LayoutSkeleton />;
  }
  
  if (!user) {
    return null; // The useEffect will redirect
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-all duration-300 ease"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "bg-background border-r transition-all z-50 sticky top-0 h-screen",
        collapsed ? "w-[70px]" : "w-64",
        mobileOpen ? "fixed inset-y-0 left-0" : "hidden md:flex",
      )}>
        <div className={cn(
          "p-4 flex-1 h-full flex flex-col",
          collapsed ? "items-center" : ""
        )}>
          <DashboardNav collapsed={collapsed} setCollapsed={setCollapsed} />
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden md:flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn(
                "transition-all duration-300",
                pathname === "/dashboard" ? "fill-primary" : "fill-muted-foreground"
              )}>
                <path d="M3.01001 11.22V15.71C3.01001 20.2 4.81001 22 9.30001 22H14.69C19.18 22 20.98 20.2 20.98 15.71V11.22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 12C13.83 12 15.18 10.51 15 8.68L14.34 2H9.67L9 8.68C8.82 10.51 10.17 12 12 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M18.31 12C20.33 12 21.81 10.36 21.61 8.35L21.33 5.6C20.97 3 19.97 2 17.35 2H14.3L15 9.01C15.17 10.66 16.66 12 18.31 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.64 12C7.29 12 8.78 10.66 8.94 9.01L9.16 6.8L9.64 2H6.59C3.97 2 2.97 3 2.61 5.6L2.34 8.35C2.14 10.36 3.62 12 5.64 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17C10.33 17 9.5 17.83 9.5 19.5V22H14.5V19.5C14.5 17.83 13.67 17 12 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h1 className="text-lg font-semibold">Trading Journal</h1>
            </div>
            {/* Mobile header - hidden on all screens */}
            <div className="hidden">
              <span className="text-primary text-xl font-bold">TJ</span>
              <span className="font-medium">Trading Journal</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationDropdown />
            <Link href="/dashboard/profile">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </Link>
          </div>
        </header>
        
        <main className={cn(
          "flex-1 overflow-y-auto transition-all",
          collapsed ? "md:pl-[70px]" : "md:pl-64",
          "p-4 md:p-6"
        )}>
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 