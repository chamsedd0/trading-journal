'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  updateDoc,
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Search, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { playNotificationSound, initAudio } from '@/lib/notification-sound';

interface ChatPreview {
  threadId: string;
  traderId: string;
  displayName: string;
  photoURL: string;
  lastMessage: string;
  timestamp: Timestamp;
  unreadCount: number;
}

interface TraderConnection {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [connections, setConnections] = useState<TraderConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogSearchQuery, setDialogSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  
  // Reset dialog search when opening/closing dialog
  useEffect(() => {
    setDialogSearchQuery('');
  }, [showNewChatDialog]);
  
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
  
  // Fetch all connections
  useEffect(() => {
    if (!user) return;
    
    const fetchConnections = async () => {
      try {
        const connectionIds = user.profile?.connections || [];
        if (connectionIds.length === 0) {
          setLoading(false);
          return;
        }
        
        const connectionData: TraderConnection[] = [];
        
        // Fetch each connection's data
        for (const connectionId of connectionIds) {
          const traderDoc = await getDoc(doc(db, 'users', connectionId));
          
          if (traderDoc.exists()) {
            const data = traderDoc.data();
            connectionData.push({
              uid: traderDoc.id,
              displayName: data.displayName || 'Unnamed Trader',
              photoURL: data.photoURL || '',
            });
          }
        }
        
        setConnections(connectionData);
      } catch (error) {
        console.error('Error fetching connections:', error);
        toast.error('Failed to load connections');
      }
    };
    
    fetchConnections();
  }, [user]);
  
  // Fetch chat previews
  useEffect(() => {
    if (!user) return;
    
    const fetchChatPreviews = async () => {
      try {
        // Create a query for message threads where the current user is a participant
        const threadQuery = query(
          collection(db, 'messageThreads'),
          where('participants', 'array-contains', user.uid),
          orderBy('updatedAt', 'desc')
        );
        
        // Listen for real-time updates to the chat threads
        const unsubscribe = onSnapshot(threadQuery, async (snapshot) => {
          console.log("Message threads update detected");
          const previews: ChatPreview[] = [];
          let currentTotalUnread = 0;
          let newMessagesDetected = false;
          
          // Check for modified threads - might indicate new messages
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
              console.log("Thread modified:", change.doc.id);
              newMessagesDetected = true;
            }
          });
          
          // Process all threads
          for (const threadDoc of snapshot.docs) {
            const threadData = threadDoc.data();
            const otherUserId = threadData.participants.find((id: string) => id !== user.uid);
            
            if (!otherUserId) continue;
            
            // Get other user's info
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
            if (!otherUserDoc.exists()) continue;
            
            const otherUser = otherUserDoc.data() as { 
              displayName?: string; 
              photoURL?: string;
            };
            
            // Get unread count
            const unreadQuery = query(
              collection(db, 'messages'),
              where('threadId', '==', threadDoc.id),
              where('receiverId', '==', user.uid),
              where('read', '==', false)
            );
            const unreadSnapshot = await getDocs(unreadQuery);
            const unreadCount = unreadSnapshot.size;
            currentTotalUnread += unreadCount;
            
            previews.push({
              threadId: threadDoc.id,
              traderId: otherUserId,
              displayName: otherUser.displayName || 'Unnamed Trader',
              photoURL: otherUser.photoURL || '',
              lastMessage: threadData.lastMessage || 'No messages yet',
              timestamp: threadData.updatedAt,
              unreadCount: unreadCount
            });
          }
          
          // Play sound if:
          // 1. There are more total unread messages than before, OR
          // 2. A thread was modified (indicating a new message) AND there are unread messages
          if ((currentTotalUnread > totalUnread && totalUnread > 0) || 
              (newMessagesDetected && currentTotalUnread > 0)) {
            console.log("New messages detected, playing notification sound");
            playNotificationSound();
            
            // Show toast for new messages
            if (currentTotalUnread > 0) {
              toast.info(`You have ${currentTotalUnread} unread message${currentTotalUnread > 1 ? 's' : ''}`, {
                duration: 4000,
              });
            }
          }
          
          setTotalUnread(currentTotalUnread);
          setChatPreviews(previews);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching chat previews:', error);
        toast.error('Failed to load conversations');
        setLoading(false);
      }
    };
    
    fetchChatPreviews();
  }, [user, totalUnread]);
  
  // Filter chats by search query
  const filteredChatPreviews = chatPreviews.filter(chat => 
    chat.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Filter connections not in current chats
  const filteredConnections = connections.filter(connection => 
    !chatPreviews.some(chat => chat.traderId === connection.uid) &&
    connection.displayName.toLowerCase().includes(dialogSearchQuery.toLowerCase())
  );
  
  // Start a new chat
  const startNewChat = async (traderId: string) => {
    if (!user) return;
    
    try {
      // Check if thread already exists (shouldn't happen with the filtering, but just in case)
      const threadQuery = query(
        collection(db, 'messageThreads'),
        where('participants', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(threadQuery);
      let existingThreadId: string | null = null;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(traderId)) {
          existingThreadId = doc.id;
        }
      });
      
      if (existingThreadId) {
        router.push(`/dashboard/messages/${existingThreadId}`);
        return;
      }
      
      // Create a new message thread
      const threadRef = await addDoc(collection(db, 'messageThreads'), {
        participants: [user.uid, traderId],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastMessage: 'No messages yet',
      });
      
      // Navigate to the new chat
      router.push(`/dashboard/messages/${threadRef.id}`);
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast.error('Failed to start new chat');
    } finally {
      setShowNewChatDialog(false);
    }
  };
  
  // Format timestamp to readable time
  const formatTimestamp = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // This week - show day name
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      // Older - show date
      return date.toLocaleDateString();
    }
  };
  
  // Add a new function to handle conversation deletion
  const deleteConversation = async (threadId: string) => {
    if (!user) return;
    
    // Confirm with the user
    if (!window.confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
      return;
    }
    
    try {
      // First, get the thread to get the messages
      const messagesQuery = query(
        collection(db, 'messages'),
        where('threadId', '==', threadId)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      const batch = writeBatch(db);
      
      // Delete all messages
      messagesSnapshot.forEach((messageDoc) => {
        batch.delete(messageDoc.ref);
      });
      
      // Delete the thread
      batch.delete(doc(db, 'messageThreads', threadId));
      
      await batch.commit();
      
      // Update local state
      setChatPreviews(prev => prev.filter(chat => chat.threadId !== threadId));
      
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col space-y-4 p-3 sm:p-4 max-w-screen-lg mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Messages
        </h1>
        
        <div className="flex gap-2 w-full items-center">
          <div className="h-10 w-10 rounded-md bg-muted animate-pulse"></div>
          
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search conversations..."
              className="w-full pl-10 h-10 shadow-sm"
              disabled
              value=""
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="h-4 w-40 bg-muted rounded animate-pulse"></div>
          </div>
          
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse p-3 sm:p-4 rounded-xl border border-muted/40">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="h-11 w-11 rounded-full bg-muted"></div>
                    {i === 1 && (
                      <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-muted"></div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-24 bg-muted rounded"></div>
                      <div className="h-3 w-10 bg-muted rounded"></div>
                    </div>
                    <div className="h-3 w-full max-w-[200px] bg-muted rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col space-y-4 p-3 sm:p-4 max-w-screen-lg mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        Messages
      </h1>
      
      <div className="flex gap-2 w-full items-center">
        <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="shadow-sm h-10 w-10 flex-shrink-0"
              aria-label="New Message"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-w-[95vw] rounded-lg">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>
                Select a connection to start a conversation
              </DialogDescription>
            </DialogHeader>
            <div className="relative mb-4">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search connections..."
                className="w-full pl-10 h-10"
                value={dialogSearchQuery}
                onChange={(e) => setDialogSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[50vh] sm:h-[300px] pr-4 -mr-4">
              {filteredConnections.length > 0 ? (
                <div className="grid gap-2">
                  {filteredConnections.map((connection) => (
                    <div 
                      key={connection.uid} 
                      className="p-3 rounded-xl border border-muted/40 hover:bg-muted/20 transition-colors cursor-pointer touch-manipulation"
                      onClick={() => startNewChat(connection.uid)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-muted">
                          <AvatarImage src={connection.photoURL} />
                          <AvatarFallback className="bg-primary/10 text-primary-foreground">
                            {connection.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{connection.displayName}</h3>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No connections found</p>
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
        
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations..."
            className="w-full pl-10 h-10 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {chatPreviews.length === 0 && connections.length === 0 ? (
        <div className="text-center py-12 px-6 rounded-lg border border-dashed bg-muted/10 mt-4">
          <div className="flex justify-center items-center w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No messages yet</h3>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-xs mx-auto">
            You don't have any connections. Connect with traders to start messaging.
          </p>
          <div className="flex justify-center gap-3 mt-6">
            <Button 
              className="shadow-sm" 
              variant="outline" 
              onClick={() => router.push('/dashboard/traders/find')}
            >
              Find Traders
            </Button>
            <Button
              className="shadow-sm"
              onClick={() => router.push('/dashboard/traders/connections')}
            >
              View Connections
            </Button>
          </div>
        </div>
      ) : (
        <>
          {filteredChatPreviews.length === 0 ? (
            <div className="text-center py-12 px-6 rounded-lg border border-dashed bg-muted/10 mt-4">
              <div className="flex justify-center items-center w-14 h-14 mx-auto mb-4 rounded-full bg-muted/30">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-base font-medium">No conversations found</h3>
              <p className="text-muted-foreground mt-2 text-sm max-w-xs mx-auto">
                No conversations match your search. Try different keywords or start a new conversation.
              </p>
              <Button 
                className="mt-4 shadow-sm" 
                variant="outline"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="space-y-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground px-1">
                  Recent Conversations
                </h2>
                <span className="text-xs text-muted-foreground px-1">
                  {filteredChatPreviews.length} {filteredChatPreviews.length === 1 ? 'conversation' : 'conversations'}
                </span>
              </div>
              <div className="space-y-2 sm:space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {filteredChatPreviews.map((chat) => (
                  <div key={chat.traderId} className="relative group">
                    <Link 
                      href={`/dashboard/messages/${chat.threadId}`}
                      className="block touch-manipulation"
                    >
                      <div className={`p-3 sm:p-4 rounded-xl border ${chat.unreadCount > 0 ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/20 border-muted/40'} transition-colors`}>
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-11 w-11 border border-muted">
                              <AvatarImage src={chat.photoURL} />
                              <AvatarFallback className="bg-primary/10 text-primary-foreground">
                                {chat.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {chat.unreadCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground ring-2 ring-background">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className={`text-sm ${chat.unreadCount > 0 ? 'font-bold' : 'font-medium'}`}>
                                {chat.displayName}
                              </h3>
                              <span className="text-xs text-muted-foreground whitespace-nowrap ml-2 tabular-nums">
                                {formatTimestamp(chat.timestamp)}
                              </span>
                            </div>
                            <p className={`text-xs sm:text-sm truncate max-w-full ${chat.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {chat.lastMessage}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                    
                    {/* Delete button - appears on hover */}
                    <button 
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-background/90 border border-muted/20 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:border-destructive/30"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteConversation(chat.threadId);
                      }}
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 