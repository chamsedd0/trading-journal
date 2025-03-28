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
  deleteDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, User, Check, CheckCheck, Trash2, MoreVertical } from 'lucide-react';
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
      
      // Only play sound when:
      // 1. We have more messages than before
      // 2. We've loaded messages at least once before (previousMessageCount > 0)
      // 3. There are new unread messages not sent by the current user
      if (messagesList.length > previousMessageCount && previousMessageCount > 0) {
        // Check specifically for new messages from the other user
        const newMessages = snapshot.docChanges()
          .filter(change => change.type === 'added')
          .map(change => change.doc.data())
          .filter(msg => msg.senderId !== user.uid);
          
        if (newMessages.length > 0) {
          console.log("New message detected in conversation, playing sound");
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
      
      // Create the message data
      const messageContent = newMessage.trim();
      const messagePreview = messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '');
      const senderName = user.profile?.fullName || user.displayName || user.email?.split('@')[0] || 'User';
      
      // Check if we should create a notification
      let createNotification = true;
      
      // Check the most recent message in this thread
      if (messages.length > 0) {
        const latestMessage = messages[messages.length - 1];
        
        // If the latest message was from the current user and within the last hour,
        // we don't need to create a notification (avoiding notification spam)
        if (
          latestMessage.senderId === user.uid && 
          latestMessage.createdAt && 
          (Date.now() - latestMessage.createdAt.toMillis() < 3600000) // 1 hour
        ) {
          createNotification = false;
        }
      }
      
      // Add message to the messages collection
      const messageData = {
        senderId: user.uid,
        senderName: senderName,
        receiverId: trader.uid,
        threadId: threadId as string,
        content: messageContent,
        read: false,
        delivered: false,
        createdAt: serverTimestamp()
      };
      
      // Create notification if needed
      if (createNotification) {
        // First create the notification to ensure it has a timestamp
        // that will be picked up by the notification listeners
        const notificationData = {
          type: 'message',
          fromUserId: user.uid,
          fromUserName: senderName,
          fromUserPhoto: user.photoURL || '',
          messageContent: messagePreview,
          read: false,
          createdAt: Timestamp.now() // Use explicit timestamp for immediate notification
        };
        
        // Create notification for the recipient
        await addDoc(collection(db, 'users', trader.uid, 'notifications'), notificationData);
        console.log('Notification created for new message');
        
        // Mark user as having new notifications
        await updateDoc(doc(db, 'users', trader.uid), {
          hasUnreadNotifications: true
        });
      }
      
      // Now send the actual message
      await addDoc(collection(db, 'messages'), messageData);
      console.log('Message added to collection');
      
      // Update thread with last message preview and timestamp
      await updateDoc(doc(db, 'messageThreads', threadId as string), {
        lastMessage: messageContent,
        updatedAt: serverTimestamp()
      });
      console.log('Thread updated with last message');
      
      // Clear input
      setNewMessage('');
      
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
  
  // Add new function to delete/unsend a message
  const deleteMessage = async (messageId: string, isSentByMe: boolean) => {
    if (!user || !threadId) return;
    
    // Only allow deleting your own messages
    if (!isSentByMe) {
      toast.error("You can only delete your own messages");
      return;
    }
    
    try {
      // Delete the message from the database
      const messageRef = doc(db, 'messages', messageId);
      await deleteDoc(messageRef);
      
      // Update the local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      // If this was the last message in the thread, update the thread's last message
      const remainingMessages = messages.filter(m => m.id !== messageId);
      
      if (remainingMessages.length > 0 && messages[messages.length - 1].id === messageId) {
        // Get the new last message
        const newLastMessage = remainingMessages[remainingMessages.length - 1];
        
        // Update the thread with the new last message
        await updateDoc(doc(db, 'messageThreads', threadId as string), {
          lastMessage: newLastMessage.content,
          updatedAt: newLastMessage.createdAt
        });
      } else if (remainingMessages.length === 0) {
        // If there are no messages left, update with empty message
        await updateDoc(doc(db, 'messageThreads', threadId as string), {
          lastMessage: "No messages",
          updatedAt: serverTimestamp()
        });
      }
      
      toast.success("Message deleted");
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };
  
  // Add long press handler for message deletion
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip on server-side
    
    // Long press detection for mobile
    let pressTimer: NodeJS.Timeout;
    let longPressedElement: HTMLElement | null = null;
    
    const startLongPress = (event: Event) => {
      // Cast event to any to access touches property
      const e = event as any;
      if (!e.touches || e.touches.length !== 1) return; // Only handle single touch
      
      const target = e.target as HTMLElement;
      const messageElement = target.closest('.group') as HTMLElement | null;
      
      if (!messageElement) return;
      
      // Check if this is user's own message (has delete button)
      const deleteBtn = messageElement.querySelector('.mobile-delete-btn');
      if (!deleteBtn) return;
      
      // Start timer
      pressTimer = setTimeout(() => {
        longPressedElement = messageElement;
        deleteBtn.classList.add('opacity-100');
        
        // Add haptic feedback if available
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 500); // 500ms long press
    };
    
    const cancelLongPress = () => {
      clearTimeout(pressTimer);
    };
    
    const handleTouchEnd = (event: Event) => {
      cancelLongPress();
      
      // Hide delete button when tapping elsewhere
      if (longPressedElement && event.target) {
        const target = event.target as HTMLElement;
        const clickedInsideMessage = longPressedElement.contains(target);
        const clickedDeleteButton = target.closest('.mobile-delete-btn');
        
        // If clicked outside current message or not on delete button, hide the delete button
        if (!clickedInsideMessage || clickedDeleteButton) {
          const deleteBtn = longPressedElement.querySelector('.mobile-delete-btn');
          if (deleteBtn) {
            deleteBtn.classList.remove('opacity-100');
          }
          longPressedElement = null;
        }
      }
    };
    
    // Add global tap handler to hide delete button when tapping elsewhere
    const handleGlobalTap = (event: Event) => {
      if (longPressedElement && event.target) {
        const target = event.target as HTMLElement;
        const clickedInsideMessage = longPressedElement.contains(target);
        const clickedDeleteButton = target.closest('.mobile-delete-btn');
        
        // If clicked outside current message, hide the delete button
        if (!clickedInsideMessage && !clickedDeleteButton) {
          const deleteBtn = longPressedElement.querySelector('.mobile-delete-btn');
          if (deleteBtn) {
            deleteBtn.classList.remove('opacity-100');
          }
          longPressedElement = null;
        }
      }
    };
    
    // Register events on message container
    const messagesContainer = document.querySelector('.scroll-area');
    if (messagesContainer) {
      messagesContainer.addEventListener('touchstart', startLongPress as EventListener);
      messagesContainer.addEventListener('touchend', handleTouchEnd as EventListener);
      messagesContainer.addEventListener('touchcancel', cancelLongPress as EventListener);
      document.addEventListener('click', handleGlobalTap as EventListener);
    }
    
    return () => {
      if (messagesContainer) {
        messagesContainer.removeEventListener('touchstart', startLongPress as EventListener);
        messagesContainer.removeEventListener('touchend', handleTouchEnd as EventListener);
        messagesContainer.removeEventListener('touchcancel', cancelLongPress as EventListener);
        document.removeEventListener('click', handleGlobalTap as EventListener);
      }
    };
  }, []);
  
  if (loading) {
    return (
      <div className="flex flex-col h-full md:h-full h-screen">
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
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-full bg-background/95 relative p-0 m-0 md:p-4 md:m-4">
      {/* Header - Absolute positioned on mobile */}
      <div className="flex items-center gap-3 py-3 px-4 border-b bg-background/95 z-10 md:static absolute top-0 left-0 right-0">
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
      
      {/* Messages - With padding for absolute header and input */}
      <ScrollArea 
        className="flex-1 overflow-y-auto md:pt-0 md:pb-0 pt-[57px] pb-[76px]" 
        type="always" 
        scrollHideDelay={0}
      >
        <div className="p-0 m-0 md:p-6 md:m-auto max-w-4xl mx-auto">
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
            <div className="space-y-8">
              {/* Group messages by date */}
              {Array.from(new Set(messages.map(m => getMessageDateGroup(m.createdAt))))
                .map((dateGroup, index) => {
                  const dateMessages = messages
                    .filter(m => getMessageDateGroup(m.createdAt) === dateGroup)
                    .sort((a, b) => {
                      if (!a.createdAt || !b.createdAt) return 0;
                      return a.createdAt.toMillis() - b.createdAt.toMillis();
                    });
                  
                  return (
                    <div key={dateGroup || index}>
                      <div className="relative flex items-center justify-center my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-muted-foreground/10"></div>
                        </div>
                        <div className="relative bg-background px-3 py-1 text-xs rounded-full border border-muted-foreground/10 text-muted-foreground">
                          {getDateDisplay(dateGroup)}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {dateMessages.map((message, i) => {
                          const isSentByMe = message.senderId === user?.uid;
                          const isFirstInGroup = i === 0 || dateMessages[i-1].senderId !== message.senderId;
                          const isLastInGroup = i === dateMessages.length - 1 || dateMessages[i+1].senderId !== message.senderId;
                          
                          return (
                            <div 
                              key={message.id} 
                              className={cn(
                                "flex gap-2 group",
                                isSentByMe ? "justify-end" : "justify-start",
                                !isLastInGroup ? "mb-1" : ""
                              )}
                            >
                              {!isSentByMe && isFirstInGroup && (
                                <Avatar className="h-8 w-8 flex-shrink-0 mt-1 border">
                                  <AvatarImage src={trader?.photoURL} />
                                  <AvatarFallback className="bg-primary/10">
                                    {trader?.displayName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              
                              {!isSentByMe && !isFirstInGroup && (
                                <div className="w-8 flex-shrink-0"></div>
                              )}
                              
                              <div className="relative max-w-[85%]">
                                <div 
                                  className={cn(
                                    "rounded-xl px-4 py-2.5 text-sm shadow-sm border",
                                    isSentByMe
                                      ? "bg-primary text-primary-foreground border-primary/30 rounded-tr-none"
                                      : "bg-background rounded-tl-none border-border"
                                  )}
                                >
                                  <div className="whitespace-pre-wrap">{message.content}</div>
                                  
                                  <div 
                                    className={cn(
                                      "text-[10px] mt-1 text-right flex items-center justify-end gap-1",
                                      isSentByMe
                                        ? "text-primary-foreground/70"
                                        : "text-muted-foreground"
                                    )}
                                  >
                                    {formatMessageDate(message.createdAt)}
                                  </div>
                                </div>
                                
                                {/* Delete button for own messages - only show after long press on mobile */}
                                {isSentByMe && (
                                  <button
                                    className={cn(
                                      "absolute -top-2 -right-2 p-1 rounded-full bg-background/95 border border-border shadow-sm",
                                      "hover:bg-destructive/10 hover:border-destructive/30",
                                      "md:opacity-0 md:group-hover:opacity-100 transition-opacity", // Desktop: show on hover
                                      "mobile-delete-btn opacity-0" // Mobile: hidden by default, shown with JS
                                    )}
                                    onClick={() => deleteMessage(message.id, isSentByMe)}
                                    aria-label="Delete message"
                                  >
                                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                  </button>
                                )}
                              </div>
                              
                              {isSentByMe && (
                                <div className="flex items-center self-end mb-1 ml-1">
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
                    </div>
                  );
                })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* This makes the scrollbar invisible */}
        <ScrollBar className="w-0 opacity-0" />
      </ScrollArea>
      
      {/* Message input - Absolute positioned on mobile */}
      <div className="p-3 sm:p-4 border-t bg-background/95 md:static absolute bottom-0 left-0 right-0 z-10">
        <form onSubmit={sendMessage} className="flex gap-2 max-w-3xl mx-auto">
          <Input
            placeholder={`Message ${trader?.displayName || 'trader'}...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 h-12 shadow-sm rounded-full border-muted px-4"
            disabled={sending}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-12 w-12 rounded-full shadow-sm flex-shrink-0"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 