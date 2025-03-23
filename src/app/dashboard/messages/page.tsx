'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Send, Search, Users, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Contact {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  online?: boolean;
  unreadCount?: number;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: Date;
  read: boolean;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesListener = useRef<() => void>();
  const router = useRouter();
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const contactParam = searchParams.get('contact');

  // Fetch contacts (people user is connected with)
  useEffect(() => {
    const fetchContacts = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          setLoading(false);
          return;
        }
        
        const userData = userDoc.data();
        const connections = [...(userData.followers || []), ...(userData.following || [])];
        // Remove duplicates
        const uniqueConnections = [...new Set(connections)];
        
        if (uniqueConnections.length === 0) {
          setLoading(false);
          return;
        }
        
        const contactsData: Contact[] = [];
        
        // Fetch each contact's data
        for (const contactId of uniqueConnections) {
          const contactDoc = await getDoc(doc(db, 'users', contactId));
          
          if (contactDoc.exists()) {
            const contactData = contactDoc.data();
            
            // Get the last message between users if any
            const messagesQuery = query(
              collection(db, 'messages'),
              where('participants', 'array-contains', user.uid),
              where('otherParticipant', '==', contactId),
              orderBy('timestamp', 'desc'),
              limit(1)
            );
            
            const messagesSnapshot = await getDocs(messagesQuery);
            let lastMessage;
            let lastMessageTime;
            let unreadCount = 0;
            
            if (!messagesSnapshot.empty) {
              const messageData = messagesSnapshot.docs[0].data();
              lastMessage = messageData.text;
              lastMessageTime = messageData.timestamp?.toDate();
              
              // Count unread messages
              if (messageData.senderId === contactId && !messageData.read) {
                const unreadQuery = query(
                  collection(db, 'messages'),
                  where('senderId', '==', contactId),
                  where('recipientId', '==', user.uid),
                  where('read', '==', false)
                );
                
                const unreadSnapshot = await getDocs(unreadQuery);
                unreadCount = unreadSnapshot.size;
              }
            }
            
            contactsData.push({
              uid: contactId,
              displayName: contactData.displayName || '',
              email: contactData.email || '',
              photoURL: contactData.photoURL || '',
              lastMessage,
              lastMessageTime,
              online: contactData.online || false,
              unreadCount
            });
          }
        }
        
        // Sort contacts by last message time (most recent first)
        contactsData.sort((a, b) => {
          if (!a.lastMessageTime) return 1;
          if (!b.lastMessageTime) return -1;
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        });
        
        setContacts(contactsData);
        setFilteredContacts(contactsData);
        
        // Check if we need to set a specific contact (from URL param)
        if (contactParam) {
          const contactToSelect = contactsData.find(contact => contact.uid === contactParam);
          if (contactToSelect) {
            setSelectedContact(contactToSelect);
            // Clear the URL parameter after selection to avoid reselection on page refresh
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('contact');
              router.replace(url.pathname + url.search);
            }
          } else if (contactParam) {
            // If contact ID is provided but not found in contacts, we need to fetch it
            fetchAndAddContact(contactParam);
          }
        }
      } catch (error) {
        console.error('Error fetching contacts:', error);
        toast.error('Failed to load contacts');
      } finally {
        setLoading(false);
      }
    };
    
    // Function to fetch and add a contact that may not be in our contacts list yet
    const fetchAndAddContact = async (contactId: string) => {
      if (!user) return;
      
      try {
        const contactDoc = await getDoc(doc(db, 'users', contactId));
        
        if (contactDoc.exists()) {
          const contactData = contactDoc.data();
          
          const newContact: Contact = {
            uid: contactId,
            displayName: contactData.displayName || '',
            email: contactData.email || '',
            photoURL: contactData.photoURL || '',
            online: contactData.online || false
          };
          
          // Add this contact to our contacts list
          setContacts(prev => [newContact, ...prev]);
          setFilteredContacts(prev => [newContact, ...prev]);
          setSelectedContact(newContact);
          
          // Clear the URL parameter
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('contact');
            router.replace(url.pathname + url.search);
          }
        }
      } catch (error) {
        console.error('Error fetching contact:', error);
        toast.error('Failed to load contact');
      }
    };
    
    fetchContacts();
  }, [user, contactParam, router]);

  // Filter contacts based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(contact => 
        contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  // Fetch messages when a contact is selected
  useEffect(() => {
    if (!user || !selectedContact) {
      setMessages([]);
      return;
    }
    
    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        
        // Mark messages as read
        const unreadQuery = query(
          collection(db, 'messages'),
          where('senderId', '==', selectedContact.uid),
          where('recipientId', '==', user.uid),
          where('read', '==', false)
        );
        
        const unreadSnapshot = await getDocs(unreadQuery);
        
        unreadSnapshot.forEach(async (doc) => {
          await updateDoc(doc.ref, {
            read: true
          });
        });
        
        // Create a conversation ID (smaller uid first to ensure consistency)
        const conversationId = [user.uid, selectedContact.uid].sort().join('_');
        
        // Set up listener for messages
        const messagesQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', conversationId),
          orderBy('timestamp', 'asc')
        );
        
        // Detach previous listener if exists
        if (messagesListener.current) {
          messagesListener.current();
        }
        
        messagesListener.current = onSnapshot(messagesQuery, (snapshot) => {
          const messagesData: Message[] = [];
          
          snapshot.forEach(doc => {
            const data = doc.data();
            messagesData.push({
              id: doc.id,
              senderId: data.senderId,
              recipientId: data.recipientId,
              text: data.text,
              timestamp: data.timestamp?.toDate(),
              read: data.read
            });
          });
          
          setMessages(messagesData);
          setLoadingMessages(false);
          
          // Update the contact's unread count
          setContacts(prevContacts => 
            prevContacts.map(contact => 
              contact.uid === selectedContact.uid 
                ? { ...contact, unreadCount: 0 } 
                : contact
            )
          );
          
          // Scroll to bottom of messages
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        });
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
        setLoadingMessages(false);
      }
    };
    
    fetchMessages();
    
    // Cleanup listener on unmount or when selected contact changes
    return () => {
      if (messagesListener.current) {
        messagesListener.current();
      }
    };
  }, [user, selectedContact]);

  // Scroll to bottom of messages when new messages come in
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedContact || !newMessage.trim()) return;
    
    try {
      // Create a conversation ID (smaller uid first to ensure consistency)
      const conversationId = [user.uid, selectedContact.uid].sort().join('_');
      
      // Add message to Firestore
      await addDoc(collection(db, 'messages'), {
        conversationId,
        senderId: user.uid,
        recipientId: selectedContact.uid,
        text: newMessage,
        timestamp: serverTimestamp(),
        read: false,
        participants: [user.uid, selectedContact.uid],
        otherParticipant: selectedContact.uid
      });
      
      // Clear the input
      setNewMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const formatMessageTime = (timestamp: Date | undefined | null) => {
    if (!timestamp || !(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      return 'Just now';
    }
    return formatDistanceToNow(timestamp, { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="h-screen flex">
        <div className="w-80 border-r">
          <div className="p-4">
            <Skeleton className="h-10 w-full mb-4" />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-2 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b">
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="flex-1 p-4">
            <div className="flex justify-center items-center h-full">
              <Skeleton className="h-16 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      <div className="mb-2">
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <p className="text-muted-foreground">
          Chat with your trader connections
        </p>
      </div>
      
      <div className="flex-1 flex border rounded-lg overflow-hidden bg-background">
        {/* Contacts Sidebar */}
        <div className="w-80 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search contacts..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Users className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {contacts.length === 0 
                    ? "Connect with traders to start messaging" 
                    : "No contacts match your search"}
                </p>
                {contacts.length === 0 && (
                  <Button 
                    variant="link" 
                    className="mt-2" 
                    asChild
                  >
                    <a href="/dashboard/traders">Find traders</a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="py-2">
                {filteredContacts.map(contact => (
                  <div key={contact.uid}>
                    <button
                      className={cn(
                        "w-full flex items-start gap-3 p-3 hover:bg-primary/5 transition-colors",
                        selectedContact?.uid === contact.uid && "bg-primary/10"
                      )}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={contact.photoURL || undefined} />
                          <AvatarFallback>{contact.displayName?.charAt(0) || 'T'}</AvatarFallback>
                        </Avatar>
                        {contact.online && (
                          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex justify-between">
                          <span className="font-medium">{contact.displayName}</span>
                          {contact.lastMessageTime && (
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(contact.lastMessageTime, { addSuffix: false })}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground truncate max-w-[180px]">
                            {contact.lastMessage || 'No messages yet'}
                          </span>
                          {contact.unreadCount ? (
                            <span className="inline-flex items-center justify-center h-5 w-5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                              {contact.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                    <Separator />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={selectedContact.photoURL || undefined} />
                  <AvatarFallback>{selectedContact.displayName?.charAt(0) || 'T'}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedContact.displayName}</div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {selectedContact.online ? (
                      <>
                        <Circle className="h-2 w-2 fill-green-500 text-green-500 mr-1" />
                        Online
                      </>
                    ) : (
                      'Offline'
                    )}
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <Skeleton className={`h-12 ${i % 2 === 0 ? 'w-32' : 'w-48'} rounded-lg`} />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-muted-foreground mb-2">No messages yet</p>
                    <p className="text-sm text-muted-foreground">
                      Send a message to start the conversation
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div 
                        key={message.id} 
                        className={cn(
                          "flex",
                          message.senderId === user?.uid ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className="flex items-end gap-2 max-w-[80%]">
                          {message.senderId !== user?.uid && (
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={selectedContact.photoURL || undefined} />
                              <AvatarFallback>{selectedContact.displayName?.charAt(0) || 'T'}</AvatarFallback>
                            </Avatar>
                          )}
                          <div>
                            <div 
                              className={cn(
                                "p-3 rounded-lg",
                                message.senderId === user?.uid 
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-muted"
                              )}
                            >
                              <p className="text-sm">{message.text}</p>
                            </div>
                            <div className="flex items-center mt-1 text-xs text-muted-foreground">
                              <span>{formatMessageTime(message.timestamp)}</span>
                              {message.senderId === user?.uid && (
                                <span className="ml-2">
                                  {message.read ? 'Read' : 'Delivered'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
              
              {/* Message Input */}
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">Select a contact</h3>
              <p className="text-muted-foreground max-w-xs">
                Choose a contact from the list to start messaging
              </p>
              {contacts.length === 0 && (
                <Button 
                  variant="default" 
                  className="mt-4" 
                  asChild
                >
                  <a href="/dashboard/traders">Find traders</a>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 