'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Users, UserPlus, UsersRound, MessageSquare, Eye, UserMinus, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Define trader profile interface
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

export default function TradersPage() {
  const { user, updateConnectionState } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [connections, setConnections] = useState<TraderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingConnection, setProcessingConnection] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  
  // Count of pending connection requests
  const pendingRequestsCount = user?.profile?.pendingConnections?.length || 0;
  
  // Count of current connections
  const connectionsCount = user?.profile?.connections?.length || 0;
  
  // Fetch connections when on connections tab
  useEffect(() => {
    if (activeTab !== 'connections' || !user) return;
    
    const fetchConnections = async () => {
      try {
        setLoading(true);
        
        // Get the user's connections array
        const connectionUids = user.profile?.connections || [];
        
        if (connectionUids.length === 0) {
          setConnections([]);
          setLoading(false);
          return;
        }
        
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
  }, [user, activeTab]);
  
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
  
  // Actions
  const viewProfile = (traderId: string) => {
    router.push(`/dashboard/traders/profile/${traderId}`);
  };
  
  const openChat = (traderId: string) => {
    router.push(`/dashboard/messages?trader=${traderId}`);
  };
  
  return (
    <div className="space-y-8">
      {/* Page header with title */}
      <div className="flex justify-between items-center py-6 rounded-lg mb-4">
        <h1 className="text-3xl font-bold text-foreground/90">Trader Network</h1>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
          <TabsTrigger value="overview" className="overflow-hidden">Overview</TabsTrigger>
          <TabsTrigger value="connections" className="overflow-hidden">
            <span className="truncate">Connections</span>
            {connectionsCount > 0 && (
              <Badge variant="outline" className="ml-1 shrink-0">{connectionsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="overflow-hidden">
            <span className="truncate">Requests</span>
            {pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="ml-1 shrink-0">{pendingRequestsCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-center">
                  <span>Find Traders</span>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
                <CardDescription>
                  Connect with traders that match your style
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Search for traders based on trading style, experience level, or markets they trade.
                </p>
                <Button asChild className="w-full">
                  <Link href="/dashboard/traders/find">
                    Find Traders
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-center">
                  <span>Connection Requests</span>
                  <UserPlus className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
                <CardDescription>
                  Manage your pending connection requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {pendingRequestsCount > 0 
                    ? `You have ${pendingRequestsCount} pending connection ${pendingRequestsCount === 1 ? 'request' : 'requests'}.`
                    : 'No pending connection requests.'}
                </p>
                <Button 
                  className="w-full hover:text-primary/80" 
                  variant={pendingRequestsCount > 0 ? "default" : "outline"}
                  onClick={() => setActiveTab('requests')}
                >
                  View Requests
                  {pendingRequestsCount > 0 && (
                    <Badge variant="outline" className="ml-2 bg-white/20">{pendingRequestsCount}</Badge>
                  )}
                </Button>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-center">
                  <span>My Connections</span>
                  <UsersRound className="h-5 w-5 text-muted-foreground" />
                </CardTitle>
                <CardDescription>
                  Manage your existing trader connections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {connectionsCount > 0 
                    ? `You're connected with ${connectionsCount} trader${connectionsCount === 1 ? '' : 's'}.`
                    : 'You don\'t have any connections yet.'}
                </p>
                <Button 
                  className="w-full" 
                  variant={connectionsCount > 0 ? "default" : "outline"}
                  onClick={() => setActiveTab('connections')}
                >
                  View Connections
                  {connectionsCount > 0 && (
                    <Badge variant="outline" className="ml-2 bg-black/30">{connectionsCount}</Badge>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="connections" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>My Connections</CardTitle>
              <CardDescription>Traders you're connected with</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              {connectionsCount > 0 && (
                <div className="relative mb-6">
                  <Input
                    type="search"
                    placeholder="Search connections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-md"
                  />
                </div>
              )}
              
              {/* Connections list */}
              {loading ? (
                // Loading skeleton for connections
                <div className="space-y-2">
                  {Array(3).fill(0).map((_, i) => (
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
              ) : connections.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No connections yet</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-4">
                    Find traders with similar interests and connect with them to share insights and strategies.
                  </p>
                  <Button asChild>
                    <Link href="/dashboard/traders/find">
                      Find Traders
                    </Link>
                  </Button>
                </div>
              ) : filteredConnections.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  No results match your search. Try a different search term.
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredConnections.map((trader) => (
                    <div 
                      key={trader.uid} 
                      className="w-full p-3 border rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={trader.photoURL} />
                          <AvatarFallback className="bg-primary/10">
                            {trader.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{trader.displayName}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {trader.tradingStyle && (
                              <Badge variant="outline" className="text-xs bg-muted/30">
                                {trader.tradingStyle}
                              </Badge>
                            )}
                            {trader.preferredMarkets && trader.preferredMarkets.slice(0, 2).map((market) => (
                              <Badge key={market} variant="outline" className="text-xs bg-muted/30">
                                {market}
                              </Badge>
                            ))}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="requests" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Connection Requests</CardTitle>
              <CardDescription>Traders who want to connect with you</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Here we'd have the actual requests UI directly instead of a redirect button */}
              {pendingRequestsCount > 0 ? (
                <p className="text-muted-foreground text-sm mb-4">
                  You have pending connection requests to review
                </p>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                    <UserPlus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No pending requests</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    When other traders send you connection requests, they'll appear here.
                  </p>
                </div>
              )}

              {pendingRequestsCount > 0 && (
                <Button asChild>
                  <Link href="/dashboard/traders/requests">
                    Manage Requests
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 