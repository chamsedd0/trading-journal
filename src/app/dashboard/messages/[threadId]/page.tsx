'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, User, Check, CheckCheck } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { playMessageSound, initAudio } from '@/lib/notification-sound';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  threadId: string;
  content: string;
  read: boolean;
  delivered: boolean;
  createdAt: Timestamp;
}

interface TraderInfo {
  uid: string;
  displayName: string;
  photoURL?: string;
}

export default function ChatPage() {
  const { threadId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [trader, setTrader] = useState<TraderInfo | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  
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
  
  // Load thread and trader information
  useEffect(() => {
    if (!user || !threadId) return;
    
    const fetchThreadInfo = async () => {
      try {
        // Get thread info to identify the other user
        const threadDoc = await getDoc(doc(db, 'messageThreads', threadId as string));
        
        if (!threadDoc.exists()) {
          toast.error('Conversation not found');
          router.push('/dashboard/messages');
          return;
        }
        
        const threadData = threadDoc.data();
        const otherUserId = threadData.participants.find((id: string) => id !== user.uid);
        
        if (!otherUserId) {
          toast.error('Invalid conversation');
          router.push('/dashboard/messages');
          return;
        }
        
        // Check if these users are connected
        if (!user.profile?.connections?.includes(otherUserId)) {
          console.log("Connection issue:", {
            userConnections: user.profile?.connections,
            otherUserId
          });
          // We'll allow the conversation to proceed anyway
          // toast.error('You can only message connected traders');
          // router.push('/dashboard/messages');
          // return;
        }
        
        // Get trader info
        const traderDoc = await getDoc(doc(db, 'users', otherUserId));
        
        if (!traderDoc.exists()) {
          console.error('Trader not found:', otherUserId);
          toast.error('Could not load trader information');
          // We'll continue without trader info
          setTrader({
            uid: otherUserId,
            displayName: 'Unknown Trader'
          });
        } else {
          const traderData = traderDoc.data();
          setTrader({
            uid: otherUserId,
            displayName: traderData.displayName || 'Unnamed Trader',
            photoURL: traderData.photoURL || ''
          });
        }
        
      } catch (error) {
        console.error('Error loading thread info:', error);
        toast.error('Failed to load conversation');
        router.push('/dashboard/messages');
      }
    };
    
    fetchThreadInfo();
  }, [user, threadId, router]);
  
  // Load and listen for messages
  useEffect(() => {
    if (!user || !threadId || !trader) return;
    
    // Mark messages as read when conversation opens
    const markMessagesAsRead = async () => {
      try {
        // Find unread messages sent to current user
        const unreadQuery = query(
          collection(db, 'messages'),
          where('threadId', '==', threadId),
          where('receiverId', '==', user.uid),
          where('read', '==', false)
        );
        
        const unreadDocs = await getDocs(unreadQuery);
        
        if (unreadDocs.size > 0) {
          const batch = writeBatch(db);
          
          unreadDocs.forEach(doc => {
            batch.update(doc.ref, { read: true });
          });
          
          await batch.commit();
        }
        
        // Mark undelivered messages as delivered
        const undeliveredQuery = query(
          collection(db, 'messages'),
          where('threadId', '==', threadId),
          where('receiverId', '==', user.uid),
          where('delivered', '==', false)
        );
        
        const undeliveredDocs = await getDocs(undeliveredQuery);
        
        if (undeliveredDocs.size > 0) {
          const batch = writeBatch(db);
          
          undeliveredDocs.forEach(doc => {
            batch.update(doc.ref, { delivered: true });
          });
          
          await batch.commit();
        }
      } catch (error) {
        console.error('Error marking messages as read/delivered:', error);
      }
    };
    
    markMessagesAsRead();
    
    // Set up real-time listener for messages
    const messagesQuery = query(
      collection(db, 'messages'),
      where('threadId', '==', threadId as string),
      orderBy('createdAt', 'asc')
    );
    
    console.log('Setting up message listener for thread:', threadId);
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      console.log(`Got ${snapshot.docs.length} messages`);
      const messagesList: Message[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        messagesList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt
        } as Message);
      });
      
      // Play sound for new messages
      if (messagesList.length > previousMessageCount && previousMessageCount > 0) {
        const newMessages = messagesList.filter(msg => msg.senderId !== user.uid && !msg.read);
        if (newMessages.length > 0) {
          playMessageSound();
        }
      }
      
      setPreviousMessageCount(messagesList.length);
      setMessages(messagesList);
      setLoading(false);
      
      // Mark newly received messages as read
      markMessagesAsRead();
    }, error => {
      console.error('Error in message listener:', error);
      setLoading(false);
      toast.error('Failed to load messages');
    });
    
    return () => unsubscribe();
  }, [user, threadId, trader, previousMessageCount]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Send a new message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !threadId || !trader || !newMessage.trim()) return;
    
    try {
      setSending(true);
      console.log('Sending message to thread:', threadId);
      
      // Add message to the messages collection
      const messageData = {
        senderId: user.uid,
        senderName: user.displayName || user.email?.split('@')[0] || 'User',
        receiverId: trader.uid,
        threadId: threadId as string,
        content: newMessage.trim(),
        read: false,
        delivered: false,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'messages'), messageData);
      console.log('Message added to collection');
      
      // Update thread with last message preview and timestamp
      await updateDoc(doc(db, 'messageThreads', threadId as string), {
        lastMessage: newMessage.trim(),
        updatedAt: serverTimestamp()
      });
      console.log('Thread updated with last message');
      
      // Clear input
      setNewMessage('');
      
      // Create notification for the recipient if it's a new message
      if (messages.length === 0) {
        const notificationRef = collection(db, 'users', trader.uid, 'notifications');
        await addDoc(notificationRef, {
          type: 'message',
          fromUserId: user.uid,
          fromUserName: user.profile?.fullName || user.displayName || 'A trader',
          fromUserPhoto: user.photoURL || '',
          messageContent: newMessage.trim().substring(0, 50) + (newMessage.length > 50 ? '...' : ''),
          read: false,
          createdAt: Timestamp.now()
        });
        
        // Mark user as having new notifications
        await updateDoc(doc(db, 'users', trader.uid), {
          hasUnreadNotifications: true
        });
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };
  
  // Format date for message timestamps
  const formatMessageDate = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };
  
  // Group messages by date for date separators
  const getMessageDateGroup = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    return date.toDateString();
  };
  
  // Get date display text
  const getDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };
  
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 py-3 px-4 border-b">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/messages">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse"></div>
          <div className="h-5 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          <div className="space-y-4">
            <div className="w-2/3 p-4 bg-muted rounded-lg animate-pulse"></div>
            <div className="w-2/3 ml-auto p-4 bg-muted rounded-lg animate-pulse"></div>
            <div className="w-1/2 p-4 bg-muted rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-muted rounded animate-pulse"></div>
            <div className="h-10 w-10 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full bg-background/95">
      {/* Header */}
      <div className="flex items-center gap-3 py-3 px-4 border-b bg-background/95 sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="flex-shrink-0" asChild>
          <Link href="/dashboard/messages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        {trader && (
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="h-9 w-9 flex-shrink-0 border">
              <AvatarImage src={trader.photoURL} />
              <AvatarFallback className="bg-primary/10">
                {trader.displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="font-medium text-sm truncate">{trader.displayName}</h2>
            </div>
          </div>
        )}
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-3 sm:p-4 min-h-[300px] max-h-[calc(100vh-160px)]">
        <div className="space-y-4 max-w-3xl mx-auto" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="p-4 bg-muted inline-flex rounded-full mb-4">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">Start a conversation</h3>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base max-w-xs mx-auto">
                Send a message to {trader?.displayName} to start a conversation
              </p>
            </div>
          ) : (
            <>
              {/* Group messages by date */}
              {Array.from(new Set(messages.map(m => getMessageDateGroup(m.createdAt)))).map((dateGroup, index) => {
                const dateMessages = messages.filter(m => getMessageDateGroup(m.createdAt) === dateGroup);
                
                return (
                  <div key={dateGroup || index} className="space-y-4">
                    <div className="relative flex items-center justify-center my-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-muted-foreground/20"></div>
                      </div>
                      <div className="relative bg-background px-2 text-xs text-muted-foreground">
                        {getDateDisplay(dateGroup)}
                      </div>
                    </div>
                    
                    {dateMessages.map((message) => {
                      const isSentByMe = message.senderId === user?.uid;
                      
                      return (
                        <div 
                          key={message.id} 
                          className={cn(
                            "flex gap-2",
                            isSentByMe ? "justify-end" : "justify-start"
                          )}
                        >
                          {!isSentByMe && (
                            <Avatar className="h-8 w-8 flex-shrink-0 mt-1 border ">
                              <AvatarImage src={trader?.photoURL} />
                              <AvatarFallback className="bg-primary/10">
                                {trader?.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div 
                            className={cn(
                              "max-w-[80%] rounded-lg px-3 py-2 text-sm break-words",
                              isSentByMe
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-muted rounded-tl-none"
                            )}
                          >
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            <div 
                              className={cn(
                                "text-[11px] mt-1 text-right",
                                isSentByMe
                                  ? "text-primary-foreground/80"
                                  : "text-muted-foreground"
                              )}
                            >
                              {formatMessageDate(message.createdAt)}
                            </div>
                          </div>
                          
                          {isSentByMe && (
                            <div className="flex items-center self-end ml-1">
                              {message.read ? (
                                <CheckCheck className="h-3 w-3 text-primary" />
                              ) : message.delivered ? (
                                <Check className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <div className="h-3 w-3 rounded-full bg-muted-foreground/30"></div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>
      
      {/* Message input */}
      <div className="p-3 sm:p-4 border-t bg-background/95">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-3xl mx-auto">
          <Input
            placeholder={`Message ${trader?.displayName || 'trader'}...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 h-10 sm:h-11 shadow-sm"
            disabled={sending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-10 w-10 sm:h-11 sm:w-11 shadow-sm flex-shrink-0"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 