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
            <div className="flex items-center gap-2">
              <span className="text-primary text-xl font-bold hidden sm:block">TJ</span>
              <h1 className="text-md font-semibold hidden sm:block">Trading Journal</h1>
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
        
        {/* Footer */}
        <footer className="border-t border-border bg-card/40 backdrop-blur-sm py-6 text-sm text-muted-foreground">
          <div className={cn(
            "max-w-6xl mx-auto px-4 md:px-6",
            collapsed ? "md:pl-[24px]" : "md:pl-[24px]",
          )}>
            <div className="flex flex-col gap-5">
              {/* Top section with logo and links */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center">
                    <span className="text-primary text-sm font-bold">TJ</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold">Trading Journal</span>
                    <span className="text-xs opacity-75">Track. Analyze. Improve.</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2">
                  <Link href="/dashboard" className="text-xs hover:text-primary transition-colors">Dashboard</Link>
                  <Link href="/dashboard/journal" className="text-xs hover:text-primary transition-colors">Journal</Link>
                  <Link href="/dashboard/trades" className="text-xs hover:text-primary transition-colors">Trades</Link>
                  <Link href="/dashboard/accounts" className="text-xs hover:text-primary transition-colors">Accounts</Link>
                  <Link href="/dashboard/profile" className="text-xs hover:text-primary transition-colors">Profile</Link>
                </div>
              </div>
              
              {/* Divider */}
              <div className="h-px w-full bg-border/60"></div>
              
              {/* Bottom section with info and social */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                  <Link href="#" className="text-xs hover:text-primary transition-colors">Privacy Policy</Link>
                  <div className="hidden md:block h-3 w-px bg-border"></div>
                  <Link href="#" className="text-xs hover:text-primary transition-colors">Terms of Service</Link>
                </div>
                
                <div className="flex items-center gap-4">
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                    </svg>
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"></path>
                    </svg>
                  </a>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.687 8.687 0 0112 3.475zm-3.633.803a53.896 53.896 0 013.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 014.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.25.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.522 8.522 0 01-2.19-5.705zM12 20.547a8.482 8.482 0 01-5.239-1.8c.152-.315 1.888-3.656 6.703-5.337.022-.01.033-.01.054-.022a35.318 35.318 0 011.823 6.475 8.4 8.4 0 01-3.341.684zm4.761-1.465c-.086-.52-.542-3.015-1.659-6.084 2.679-.423 5.022.271 5.314.369a8.468 8.468 0 01-3.655 5.715z" clipRule="evenodd"></path>
                    </svg>
                  </a>
                </div>
              </div>
              
              {/* Copyright notice */}
              <div className="text-center md:text-right">
                <p className="text-xs opacity-75">© {new Date().getFullYear()} Trading Journal. All rights reserved.</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 