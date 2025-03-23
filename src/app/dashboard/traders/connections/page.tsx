'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  collection,
  doc, 
  getDoc, 
  updateDoc, 
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, UserMinus, MoreHorizontal, MessageSquare, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TraderProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  location?: string;
  tradingStyle?: string;
  experience?: string;
  riskTolerance?: string;
  preferredMarkets?: string[];
}

export default function ConnectionsPage() {
  const { user, updateConnectionState } = useAuth();
  const [connections, setConnections] = useState<TraderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingConnection, setProcessingConnection] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch all connections
  useEffect(() => {
    const fetchConnections = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get the user's connections array
        const connectionUids = user.profile?.connections || [];
        
        // Fetch connection profiles
        const connectionProfiles: TraderProfile[] = [];
        for (const uid of connectionUids) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            connectionProfiles.push({
              uid: userData.uid,
              displayName: userData.displayName || 'Unnamed Trader',
              photoURL: userData.photoURL,
              location: userData.location,
              tradingStyle: userData.tradingStyle,
              experience: userData.experience,
              riskTolerance: userData.riskTolerance,
              preferredMarkets: userData.preferredMarkets || []
            });
          }
        }
        
        setConnections(connectionProfiles);
      } catch (error) {
        console.error("Error fetching connections:", error);
        toast.error("Failed to load connections");
      } finally {
        setLoading(false);
      }
    };
    
    fetchConnections();
  }, [user]);
  
  // Remove a connection
  const removeConnection = async (traderUid: string) => {
    if (!user) return;
    
    try {
      setProcessingConnection(prev => ({ ...prev, [traderUid]: true }));
      
      // Get current connection state
      const currentConnections = user.profile?.connections || [];
      
      // 1. Remove from the current user's connections
      await updateDoc(doc(db, 'users', user.uid), {
        connections: arrayRemove(traderUid)
      });
      
      // 2. Remove from the other user's connections
      await updateDoc(doc(db, 'users', traderUid), {
        connections: arrayRemove(user.uid)
      });
      
      // 3. Update local state
      setConnections(prev => prev.filter(c => c.uid !== traderUid));
      
      // 4. Update auth context state
      updateConnectionState({
        connections: currentConnections.filter(id => id !== traderUid)
      });
      
      // 5. Show success toast
      toast.success("Connection removed");
      
    } catch (error) {
      console.error("Error removing connection:", error);
      toast.error("Failed to remove connection");
    } finally {
      setProcessingConnection(prev => ({ ...prev, [traderUid]: false }));
    }
  };
  
  // Filter connections based on search query
  const filteredConnections = connections.filter(connection => {
    if (!searchQuery) return true;
    
    return (
      connection.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (connection.location && connection.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (connection.tradingStyle && connection.tradingStyle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (connection.preferredMarkets && connection.preferredMarkets.some(market => 
        market.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    );
  });

  // Chat functionality placeholder
  const openChat = (traderId: string) => {
    // In a real implementation, this would navigate to a chat page or open a chat dialog
    toast.info("Chat functionality coming soon!");
  };
  
  // View profile placeholder
  const viewProfile = (traderId: string) => {
    // In a real implementation, this would navigate to the trader's profile
    toast.info("Full profile view coming soon!");
  };
  
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/traders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">My Connections</h1>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Input
          type="search"
          placeholder="Search connections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>
      
      {/* Connections list */}
      {loading ? (
        // Loading skeleton for connections
        <div className="space-y-2">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="w-full p-4 border rounded-md flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredConnections.length > 0 ? (
        // Actual connections
        <div className="space-y-2">
          {filteredConnections.map((trader) => (
            <div
              key={trader.uid}
              className="w-full p-4 border rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center space-x-4 w-full sm:w-auto">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={trader.photoURL} alt={trader.displayName} />
                  <AvatarFallback>
                    {trader.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{trader.displayName}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {trader.location && (
                      <span className="text-sm text-muted-foreground">{trader.location}</span>
                    )}
                    {trader.tradingStyle && (
                      <Badge variant="outline">{trader.tradingStyle}</Badge>
                    )}
                    {trader.preferredMarkets?.slice(0, 2).map(market => (
                      <Badge key={market} variant="secondary">{market}</Badge>
                    ))}
                    {trader.preferredMarkets && trader.preferredMarkets.length > 2 && (
                      <Badge variant="secondary">+{trader.preferredMarkets.length - 2}</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 w-full sm:w-auto justify-end">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => openChat(trader.uid)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Message</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => viewProfile(trader.uid)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View Profile</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => removeConnection(trader.uid)}
                            disabled={processingConnection[trader.uid]}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            <span>{processingConnection[trader.uid] ? 'Removing...' : 'Remove Connection'}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>More options</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // No connections or no search results
        <div className="text-center py-12">
          {connections.length === 0 ? (
            <>
              <h3 className="text-lg font-medium">No connections yet</h3>
              <p className="text-muted-foreground mt-1">
                You haven't connected with any traders yet.
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/traders/find">
                  Find Traders
                </Link>
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-medium">No matching connections</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search query
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
} 