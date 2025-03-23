'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Search, UserPlus, UserCheck, UserX, LineChart, Clock, MessageSquare, BarChart3, Check, X, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Define types for our component
interface ExtendedUser {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  following?: string[];
  followers?: string[];
  pendingRequests?: string[];
  connectionRequests?: string[];
  tradingStyle?: string;
}

interface TraderProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio?: string;
  tradingStyle?: string;
  experience?: string;
  followers?: string[];
  following?: string[];
  totalTrades?: number;
  winRate?: number;
  tradingPlan?: {
    concepts: string[];
    entryRules: string[];
    riskManagement: any;
  };
  connectionStatus?: 'none' | 'pending' | 'request' | 'connected';
}

export default function TradersPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [filteredTraders, setFilteredTraders] = useState<TraderProfile[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<TraderProfile | null>(null);
  const [activeTab, setActiveTab] = useState('discover');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const router = useRouter();

  // Cast the user to our extended type
  const extendedUser = user as unknown as ExtendedUser | null;

  // Add a state to track if stats need updating
  const [statsNeedUpdate, setStatsNeedUpdate] = useState(false);

  // Define updateUserProfile function
  const updateUserProfile = async (userData: Partial<ExtendedUser>) => {
    if (!extendedUser) return;
    
    try {
      // Update user document in Firestore
      await updateDoc(doc(db, "users", extendedUser.uid), userData);
      
      // Merge the updates with the local user state
      Object.assign(extendedUser, userData);
      
    } catch (error) {
      console.error('Error updating user profile:', error);
      toast.error('Failed to update user profile');
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!extendedUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', extendedUser.uid));
        if (userDoc.exists()) {
          setUserProfile({
            uid: extendedUser.uid,
            ...userDoc.data() as Omit<TraderProfile, 'uid'>
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [extendedUser]);

  // Define fetchTraders with useCallback outside of useEffect
  const fetchTraders = useCallback(async () => {
    if (!extendedUser) return;
    
    try {
      setLoading(true);
      
      // Fetch all users except current user
      const usersSnapshot = await getDocs(query(
        collection(db, "users"),
        where("uid", "!=", extendedUser.uid)
      ));
      
      // Only fetch connections if stats need updating or it's the first load
      if (statsNeedUpdate || traders.length === 0) {
        // Fetch current user's connections
        const connectionsRef = collection(db, "connections");
        const userConnectionsQuery = query(
          connectionsRef,
          where("userId", "==", extendedUser.uid)
        );
        
        const connectionRequestsQuery = query(
          collection(db, "connectionRequests"),
          where("fromUid", "==", extendedUser.uid),
          where("status", "==", "pending")
        );
        
        const receivedRequestsQuery = query(
          collection(db, "connectionRequests"),
          where("toUid", "==", extendedUser.uid),
          where("status", "==", "pending")
        );
        
        const [connectionsSnapshot, pendingSnapshot, requestsSnapshot] = await Promise.all([
          getDocs(userConnectionsQuery),
          getDocs(connectionRequestsQuery),
          getDocs(receivedRequestsQuery)
        ]);
        
        // Extract user's connections
        const connections = connectionsSnapshot.docs.map(doc => doc.data().connectedUserId);
        
        // Extract pending requests
        const pendingRequests = pendingSnapshot.docs.map(doc => doc.data().toUid);
        
        // Extract received requests
        const connectionRequests = requestsSnapshot.docs.map(doc => doc.data().fromUid);
        
        // Update user object with connection data if needed
        if (extendedUser) {
          updateUserProfile({
            following: connections,
            pendingRequests: pendingRequests,
            connectionRequests: connectionRequests
          });
        }
        
        // Reset the stats update flag
        setStatsNeedUpdate(false);
      }
      
      // Get the latest connection data from user object
      const connections = extendedUser?.following || [];
      const pendingRequests = extendedUser?.pendingRequests || [];
      const connectionRequests = extendedUser?.connectionRequests || [];
      
      // Process the traders data
      const tradersData = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        // Skip the current user
        if (data.uid === extendedUser.uid) return null;
        
        // Create trader profile
        const trader: TraderProfile = {
          uid: data.uid,
          displayName: data.displayName || 'Anonymous Trader',
          email: data.email || '',
          photoURL: data.photoURL || '',
          bio: data.bio || '',
          tradingStyle: data.tradingStyle || '',
          experience: data.experience || '',
          followers: data.followers || [],
          following: data.following || [],
          totalTrades: data.totalTrades || 0,
          winRate: data.winRate || 0,
          tradingPlan: data.tradingPlan || { concepts: [], entryRules: [], riskManagement: {} },
        };
        
        // Set connection status using the connection collection results
        if (connections.includes(trader.uid)) {
          trader.connectionStatus = 'connected';
        } else if (pendingRequests.includes(trader.uid)) {
          trader.connectionStatus = 'pending';
        } else if (connectionRequests.includes(trader.uid)) {
          trader.connectionStatus = 'request';
        } else {
          trader.connectionStatus = 'none';
        }
        
        return trader;
      })
      .filter(Boolean) as TraderProfile[];
      
      // Sort traders by follower count
      tradersData.sort((a, b) => 
        (b.followers?.length || 0) - (a.followers?.length || 0)
      );
      
      setTraders(tradersData);
      applyFilters(tradersData, searchQuery, activeFilter);
    } catch (error) {
      console.error('Error fetching traders:', error);
      toast.error('Failed to load traders');
    } finally {
      setLoading(false);
    }
  }, [extendedUser, statsNeedUpdate, traders.length, searchQuery, activeFilter]);

  // Use fetchTraders in useEffect
  useEffect(() => {
    fetchTraders();
  }, [fetchTraders]);

  useEffect(() => {
    if (traders.length > 0) {
      applyFilters(traders, searchQuery, activeFilter);
    }
  }, [searchQuery, activeFilter, traders]);

  const getConnectionStatus = (traderId: string): 'none' | 'pending' | 'request' | 'connected' => {
    if (!extendedUser) return 'none';
    
    // First check the local state of traders for the most up-to-date status
    const trader = traders.find(t => t.uid === traderId);
    if (trader) {
      return trader.connectionStatus || 'none';
    }
    
    return 'none';
  };

  const applyFilters = (traders: TraderProfile[], query: string, filter: string) => {
    let filtered = [...traders];
    
    // Apply text search filter
    if (query) {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      
      filtered = filtered.filter(trader => {
        if (!trader) return false;
        
        // Check if any search term matches various trader properties
        return searchTerms.some(term => {
          return (
            trader.displayName?.toLowerCase().includes(term) ||
            trader.tradingStyle?.toLowerCase().includes(term) ||
            trader.experience?.toLowerCase().includes(term) ||
            trader.bio?.toLowerCase().includes(term) ||
            trader.email?.toLowerCase().includes(term) ||
            trader.tradingPlan?.concepts?.some(concept => 
              concept.toLowerCase().includes(term)
            )
          );
        });
      });
    }
    
    // Apply category filter
    if (filter && filter !== 'all') {
      switch (filter) {
        case 'following':
          filtered = filtered.filter(trader => 
            trader.connectionStatus === 'connected'
          );
          break;
        case 'similar':
          filtered = filtered.filter(trader => 
            trader.tradingStyle === extendedUser?.tradingStyle
          );
          break;
        case 'day':
          filtered = filtered.filter(trader => 
            trader.tradingStyle?.toLowerCase().includes('day')
          );
          break;
        case 'swing':
          filtered = filtered.filter(trader => 
            trader.tradingStyle?.toLowerCase().includes('swing')
          );
          break;
        case 'position':
          filtered = filtered.filter(trader => 
            trader.tradingStyle?.toLowerCase().includes('position')
          );
          break;
        case 'scalp':
          filtered = filtered.filter(trader => 
            trader.tradingStyle?.toLowerCase().includes('scalp')
          );
          break;
        default:
          // No additional filtering for 'all'
          break;
      }
    }
    
    setFilteredTraders(filtered);
  };

  const handleFilterChange = (value: string) => {
    setActiveFilter(value);
  };

  const handleSendRequest = async (traderId: string) => {
    if (!extendedUser) return;
    
    try {
      setLoadingAction(traderId);
      // Create a connection request in the connectionRequests collection
      await addDoc(collection(db, "connectionRequests"), {
        fromUid: extendedUser.uid,
        toUid: traderId,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      
      // Update the connection status in the UI
      setTraders(prev => 
        prev.map(t => 
          t.uid === traderId 
            ? { ...t, connectionStatus: 'pending' } 
            : t
        )
      );
      
      applyFilters(
        traders.map(t => 
          t.uid === traderId 
            ? { ...t, connectionStatus: 'pending' } 
            : t
        ),
        searchQuery,
        activeFilter
      );
      
      toast.success('Connection request sent');
      
      setStatsNeedUpdate(true); // Mark that stats need updating
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAcceptRequest = async (traderId: string) => {
    if (!extendedUser) return;
    
    try {
      setLoadingAction(traderId);
      // Find the connection request
      const requestsRef = collection(db, "connectionRequests");
      const q = query(
        requestsRef, 
        where("fromUid", "==", traderId),
        where("toUid", "==", extendedUser.uid),
        where("status", "==", "pending")
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('Connection request not found');
        return;
      }
      
      // Update the request status
      await updateDoc(doc(db, "connectionRequests", querySnapshot.docs[0].id), {
        status: "accepted",
        updatedAt: serverTimestamp()
      });
      
      // Create connections for both users
      await Promise.all([
        // Add trader to user's connections
        addDoc(collection(db, "connections"), {
          userId: extendedUser.uid,
          connectedUserId: traderId,
          createdAt: serverTimestamp()
        }),
        // Add user to trader's connections
        addDoc(collection(db, "connections"), {
          userId: traderId,
          connectedUserId: extendedUser.uid,
          createdAt: serverTimestamp()
        }),
      ]);
      
      // Update the connection status in the UI
      setTraders(prev => 
        prev.map(t => 
          t.uid === traderId 
            ? { ...t, connectionStatus: 'connected' } 
            : t
        )
      );
      
      applyFilters(
        traders.map(t => 
          t.uid === traderId 
            ? { ...t, connectionStatus: 'connected' } 
            : t
        ),
        searchQuery,
        activeFilter
      );
      
      toast.success('Connection request accepted');
      
      setStatsNeedUpdate(true); // Mark that stats need updating
    } catch (error) {
      console.error('Error accepting connection request:', error);
      toast.error('Failed to accept request');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRejectRequest = async (traderId: string) => {
    if (!extendedUser) return;
    
    try {
      setLoadingAction(traderId);
      // Remove from connection requests
      const connectionRequests = (extendedUser.connectionRequests || []).filter((id: string) => id !== traderId);
      
      await updateUserProfile({ connectionRequests });
      
      // Update the connection status in the UI
      setTraders(prev => 
        prev.map(t => 
          t.uid === traderId 
            ? { ...t, connectionStatus: 'none' } 
            : t
        )
      );
      
      applyFilters(
        traders.map(t => 
          t.uid === traderId 
            ? { ...t, connectionStatus: 'none' } 
            : t
        ),
        searchQuery,
        activeFilter
      );
      
      toast.success('Connection request rejected');
      
      setStatsNeedUpdate(true); // Mark that stats need updating
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      toast.error('Failed to reject request');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveConnection = async (traderId: string) => {
    if (!extendedUser) return;
    
    try {
      setLoadingAction(traderId);
      // Find and delete connections between the users
      const connectionsRef = collection(db, "connections");
      
      const userConnectionQuery = query(
        connectionsRef,
        where("userId", "==", extendedUser.uid),
        where("connectedUserId", "==", traderId)
      );
      
      const traderConnectionQuery = query(
        connectionsRef,
        where("userId", "==", traderId),
        where("connectedUserId", "==", extendedUser.uid)
      );
      
      const [userConnectionSnapshot, traderConnectionSnapshot] = await Promise.all([
        getDocs(userConnectionQuery),
        getDocs(traderConnectionQuery)
      ]);
      
      // Delete all matching connections
      const deletePromises = [
        ...userConnectionSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        ),
        ...traderConnectionSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        )
      ];
      
      await Promise.all(deletePromises);
      
      // Update the connection status in the UI
      setTraders(prev => 
        prev.map(t => 
          t.uid === traderId 
            ? { ...t, connectionStatus: 'none' } 
            : t
        )
      );
      
      applyFilters(
        traders.map(t => 
          t.uid === traderId 
            ? { ...t, connectionStatus: 'none' } 
            : t
        ),
        searchQuery,
        activeFilter
      );
      
      toast.success('Connection removed');
      
      setStatsNeedUpdate(true); // Mark that stats need updating
    } catch (error) {
      console.error('Error removing connection:', error);
      toast.error('Failed to remove connection');
    } finally {
      setLoadingAction(null);
    }
  };

  const renderTraderCard = (trader: TraderProfile) => {
    return (
      <Card key={trader.uid} className="overflow-hidden hover:shadow-md transition-shadow border-0 bg-card/50 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
              <AvatarImage src={trader.photoURL} alt={trader.displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {trader.displayName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link 
                href={`/dashboard/traders/${trader.uid}`} 
                className="font-medium text-base hover:text-primary transition-colors truncate block"
                title={trader.displayName}
              >
                {trader.displayName}
              </Link>
              <div className="text-xs text-muted-foreground truncate flex items-center mt-1">
                <Users className="h-3 w-3 mr-1 shrink-0" /> 
                {trader.followers?.length || 0} followers
              </div>
            </div>
            <div>
              <Badge variant="outline" className="text-xs font-normal px-2">
                {trader.tradingStyle || "Trader"}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2 mt-2">
            {renderConnectionButton(trader)}
            
            {trader.connectionStatus === 'connected' && (
              <Button variant="outline" size="icon" className="rounded-lg shrink-0" asChild>
                <Link href={`/dashboard/messages?contact=${trader.uid}`}>
                  <MessageSquare className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderConnectionButton = (trader: TraderProfile) => {
    switch (trader.connectionStatus) {
      case 'connected':
        return (
          <Button 
            variant="outline" 
            size="icon"
            className="rounded-lg border-green-500/20 bg-green-500/5 hover:bg-red-500/5 hover:border-red-500/20 transition-colors group"
            onClick={() => handleRemoveConnection(trader.uid)}
            title="Connected - Click to disconnect"
          >
            <CheckCircle className="h-4 w-4 text-green-500 group-hover:hidden" />
            <X className="h-4 w-4 text-red-500 hidden group-hover:block" />
          </Button>
        );
      case 'pending':
        return (
          <Button 
            variant="outline" 
            size="icon"
            className="rounded-lg"
            disabled
            title="Request pending"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
          </Button>
        );
      case 'request':
        return (
          <div className="flex gap-2">
            <Button 
              variant="default" 
              size="icon"
              className="rounded-lg"
              onClick={() => handleAcceptRequest(trader.uid)}
              title="Accept request"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              className="rounded-lg"
              onClick={() => handleRejectRequest(trader.uid)}
              title="Reject request"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      default:
        return (
          <Button 
            variant="outline" 
            size="icon"
            className="rounded-lg transition-colors hover:bg-primary/5"
            onClick={() => handleSendRequest(trader.uid)}
            title="Connect with this trader"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-[340px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-screen-xl py-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Find Traders</h1>
            <p className="text-muted-foreground">
              Connect with other traders, share insights, and learn from each other
            </p>
          </div>
          
          {/* Quick stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-r from-blue-500/5 to-blue-500/10 rounded-lg p-3 text-center border border-blue-500/10">
              <div className="text-muted-foreground text-xs mb-1">Traders</div>
              <div className="text-xl font-bold text-primary/90">{traders.length}</div>
            </div>
            <div className="bg-gradient-to-r from-green-500/5 to-green-500/10 rounded-lg p-3 text-center border border-green-500/10">
              <div className="text-muted-foreground text-xs mb-1">Following</div>
              <div className="text-xl font-bold text-green-500">{extendedUser?.following?.length || 0}</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500/5 to-purple-500/10 rounded-lg p-3 text-center border border-purple-500/10">
              <div className="text-muted-foreground text-xs mb-1">Followers</div>
              <div className="text-xl font-bold text-purple-500">{extendedUser?.followers?.length || 0}</div>
            </div>
            <div className="bg-gradient-to-r from-amber-500/5 to-amber-500/10 rounded-lg p-3 text-center border border-amber-500/10">
              <div className="text-muted-foreground text-xs mb-1">Pending</div>
              <div className="text-xl font-bold text-amber-500">
                {(extendedUser?.pendingRequests?.length || 0) + (extendedUser?.connectionRequests?.length || 0)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, trading style, or concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 max-w-md bg-background/80 backdrop-blur-sm focus-visible:ring-primary/50"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <Select value={activeFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[180px] bg-background/80 backdrop-blur-sm focus-visible:ring-primary/50">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Traders</SelectItem>
                <SelectItem value="following">People You Follow</SelectItem>
                <SelectItem value="similar">Similar Trading Style</SelectItem>
                <SelectItem value="day">Day Traders</SelectItem>
                <SelectItem value="swing">Swing Traders</SelectItem>
                <SelectItem value="position">Position Traders</SelectItem>
                <SelectItem value="scalp">Scalpers</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="p-4 pt-0">
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredTraders.length === 0 ? (
          <div className="text-center py-12 bg-card/30 backdrop-blur-sm rounded-lg border border-border/50">
            <div className="h-20 w-20 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium mb-2">No traders found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {activeFilter === 'all' 
                ? "We couldn't find any traders matching your search. Try adjusting your search criteria."
                : `We couldn't find any traders in the "${activeFilter}" category. Try a different filter.`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTraders.map(trader => renderTraderCard(trader))}
          </div>
        )}
      </div>
    </div>
  );
} 