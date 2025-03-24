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
  addDoc
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Search, PlusCircle } from 'lucide-react';
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

interface ChatPreview {
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
  
  // Reset dialog search when opening/closing dialog
  useEffect(() => {
    setDialogSearchQuery('');
  }, [showNewChatDialog]);
  
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
          const previews: ChatPreview[] = [];
          
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
            
            previews.push({
              traderId: otherUserId,
              displayName: otherUser.displayName || 'Unnamed Trader',
              photoURL: otherUser.photoURL || '',
              lastMessage: threadData.lastMessage || 'No messages yet',
              timestamp: threadData.updatedAt,
              unreadCount: unreadSnapshot.size
            });
          }
          
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
  }, [user]);
  
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
  
  if (loading) {
    return (
      <div className="flex flex-col space-y-4 p-3 sm:p-4 max-w-screen-lg mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          Messages
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
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
        
        <div className="grid gap-3 mt-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted rounded"></div>
                    <div className="h-3 w-32 bg-muted rounded"></div>
                  </div>
                  <div className="h-5 w-5 rounded-full bg-muted"></div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                    <Card 
                      key={connection.uid} 
                      className="shadow-sm hover:shadow-md transition-all cursor-pointer touch-manipulation"
                      onClick={() => startNewChat(connection.uid)}
                    >
                      <CardContent className="p-3 sm:p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border shadow-sm">
                            <AvatarImage src={connection.photoURL} />
                            <AvatarFallback className="bg-primary/10">
                              {connection.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{connection.displayName}</h3>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
        <div className="text-center py-8 px-4">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium">No messages yet</h3>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base max-w-xs mx-auto">
            You don't have any connections. Connect with traders to start chatting.
          </p>
          <Button 
            className="mt-6 shadow-sm" 
            variant="outline" 
            onClick={() => router.push('/dashboard/traders/find')}
          >
            Find Traders
          </Button>
        </div>
      ) : (
        <div className="grid gap-2 sm:gap-3">
          {filteredChatPreviews.length > 0 && (
            <>
              <h2 className="text-sm font-medium text-muted-foreground px-1 pt-2">
                Recent Conversations
              </h2>
              {filteredChatPreviews.map((chat) => (
                <Link 
                  key={chat.traderId} 
                  href={`/dashboard/messages/${chat.traderId}`}
                  className="block touch-manipulation"
                >
                  <Card className="shadow-sm hover:shadow-md transition-all border-muted/40">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border shadow-sm">
                          <AvatarImage src={chat.photoURL} />
                          <AvatarFallback className="bg-primary/10">
                            {chat.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-sm truncate">{chat.displayName}</h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {formatTimestamp(chat.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-full">
                            {chat.lastMessage}
                          </p>
                        </div>
                        {chat.unreadCount > 0 && (
                          <Badge className="rounded-full bg-primary text-primary-foreground ml-2 flex-shrink-0">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
} 