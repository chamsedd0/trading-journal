'use client';

import { useState, useEffect } from 'react';
import { useAuth, updateUserProfile } from '@/lib/auth-context';
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
  const { user, updateUserProfile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [filteredTraders, setFilteredTraders] = useState<TraderProfile[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<TraderProfile | null>(null);
  const [activeTab, setActiveTab] = useState('discover');
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile({
            uid: user.uid,
            ...userDoc.data() as Omit<TraderProfile, 'uid'>
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const fetchTraders = async () => {
      setLoading(true);
      
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        const tradersRef = collection(db, 'users');
        const q = query(
          tradersRef,
          where('isPublicProfile', '==', true)
        );
        
        // Get all of the user's connections to accurately determine connection status
        const connectionsRef = collection(db, "connections");
        const userConnectionsQuery = query(
          connectionsRef,
          where("userId", "==", user.uid)
        );
        
        const connectionRequestsQuery = query(
          collection(db, "connectionRequests"),
          where("fromUid", "==", user.uid),
          where("status", "==", "pending")
        );
        
        const receivedRequestsQuery = query(
          collection(db, "connectionRequests"),
          where("toUid", "==", user.uid),
          where("status", "==", "pending")
        );
        
        const [connectionsSnapshot, pendingSnapshot, requestsSnapshot, querySnapshot] = await Promise.all([
          getDocs(userConnectionsQuery),
          getDocs(connectionRequestsQuery),
          getDocs(receivedRequestsQuery),
          getDocs(q)
        ]);
        
        // Extract user's connections
        const connections = connectionsSnapshot.docs.map(doc => doc.data().connectedUserId);
        
        // Extract pending requests
        const pendingRequests = pendingSnapshot.docs.map(doc => doc.data().toUid);
        
        // Extract received requests
        const connectionRequests = requestsSnapshot.docs.map(doc => doc.data().fromUid);
        
        const tradersData = querySnapshot.docs
          .map(doc => {
            const data = doc.data();
            // Skip the current user
            if (data.uid === user.uid) return null;
            
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
        setLoading(false);
      } catch (error) {
        console.error('Error fetching traders:', error);
        toast.error('Failed to load traders');
        setLoading(false);
      }
    };
    
    fetchTraders();
  }, [user]);

  useEffect(() => {
    if (traders.length > 0) {
      applyFilters(traders, searchQuery, activeFilter);
    }
  }, [searchQuery, activeFilter, traders]);

  const getConnectionStatus = (traderId: string): 'none' | 'pending' | 'request' | 'connected' => {
    if (!user) return 'none';
    
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
            trader.tradingStyle === user?.tradingStyle
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
    if (!user) return;
    
    try {
      // Create a connection request in the connectionRequests collection
      await addDoc(collection(db, "connectionRequests"), {
        fromUid: user.uid,
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
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    }
  };

  const handleAcceptRequest = async (traderId: string) => {
    if (!user) return;
    
    try {
      // Find the connection request
      const requestsRef = collection(db, "connectionRequests");
      const q = query(
        requestsRef, 
        where("fromUid", "==", traderId),
        where("toUid", "==", user.uid),
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
          userId: user.uid,
          connectedUserId: traderId,
          createdAt: serverTimestamp()
        }),
        // Add user to trader's connections
        addDoc(collection(db, "connections"), {
          userId: traderId,
          connectedUserId: user.uid,
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
    } catch (error) {
      console.error('Error accepting connection request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (traderId: string) => {
    if (!user) return;
    
    try {
      // Remove from connection requests
      const connectionRequests = (user.connectionRequests || []).filter(id => id !== traderId);
      
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
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      toast.error('Failed to reject request');
    }
  };

  const handleRemoveConnection = async (traderId: string) => {
    if (!user) return;
    
    try {
      // Find and delete connections between the users
      const connectionsRef = collection(db, "connections");
      
      const userConnectionQuery = query(
        connectionsRef,
        where("userId", "==", user.uid),
        where("connectedUserId", "==", traderId)
      );
      
      const traderConnectionQuery = query(
        connectionsRef,
        where("userId", "==", traderId),
        where("connectedUserId", "==", user.uid)
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
    } catch (error) {
      console.error('Error removing connection:', error);
      toast.error('Failed to remove connection');
    }
  };

  const renderTraderCard = (trader: TraderProfile) => {
    return (
      <Card key={trader.uid} className="overflow-hidden border-border hover:border-primary/20 transition-all">
        <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3">
          <Avatar className="h-12 w-12 border border-border">
            <AvatarImage src={trader.photoURL} alt={trader.displayName} />
            <AvatarFallback className="bg-muted">
              {trader.displayName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="font-semibold text-foreground truncate">
              {trader.displayName}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> 
              <span className="truncate">{trader.followers?.length || 0} followers</span>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs font-normal">
            {trader.tradingStyle || "Trader"}
          </Badge>
        </CardHeader>
        
        <CardFooter className="p-4 pt-2 grid grid-cols-2 gap-2">
          {trader.connectionStatus === 'connected' ? (
            <>
              <Button 
                variant="outline" 
                className="w-full h-9"
                onClick={() => handleRemoveConnection(trader.uid)}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Connected
              </Button>
              <Button variant="secondary" className="w-full h-9" asChild>
                <Link href={`/dashboard/traders/${trader.uid}`}>
                  View Profile
                </Link>
              </Button>
            </>
          ) : trader.connectionStatus === 'pending' ? (
            <>
              <Button variant="outline" className="w-full h-9" disabled>
                <Clock className="h-3.5 w-3.5 mr-1.5" /> Pending
              </Button>
              <Button variant="secondary" className="w-full h-9" asChild>
                <Link href={`/dashboard/traders/${trader.uid}`}>
                  View Profile
                </Link>
              </Button>
            </>
          ) : trader.connectionStatus === 'request' ? (
            <>
              <Button 
                variant="default"
                className="w-full h-9"
                onClick={() => handleAcceptRequest(trader.uid)}
              >
                <Check className="h-3.5 w-3.5 mr-1.5" /> Accept
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-9"
                onClick={() => handleRejectRequest(trader.uid)}
              >
                <X className="h-3.5 w-3.5 mr-1.5" /> Reject
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                className="w-full h-9"
                onClick={() => handleSendRequest(trader.uid)}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Connect
              </Button>
              <Button variant="secondary" className="w-full h-9" asChild>
                <Link href={`/dashboard/traders/${trader.uid}`}>
                  View Profile
                </Link>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    );
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
            <div className="bg-card rounded-lg p-3 text-center border border-border shadow-sm">
              <div className="text-xs text-muted-foreground font-medium mb-1">Traders</div>
              <div className="text-lg font-bold">{traders.length}</div>
            </div>
            <div className="bg-card rounded-lg p-3 text-center border border-border shadow-sm">
              <div className="text-xs text-muted-foreground font-medium mb-1">Following</div>
              <div className="text-lg font-bold">{user?.following?.length || 0}</div>
            </div>
            <div className="bg-card rounded-lg p-3 text-center border border-border shadow-sm">
              <div className="text-xs text-muted-foreground font-medium mb-1">Followers</div>
              <div className="text-lg font-bold">{user?.followers?.length || 0}</div>
            </div>
            <div className="bg-card rounded-lg p-3 text-center border border-border shadow-sm">
              <div className="text-xs text-muted-foreground font-medium mb-1">Pending</div>
              <div className="text-lg font-bold">
                {(user?.pendingRequests?.length || 0) + (user?.connectionRequests?.length || 0)}
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
              className="pl-9 max-w-md bg-background"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground font-medium">Filter:</span>
            <Select value={activeFilter} onValueChange={handleFilterChange}>
              <SelectTrigger className="w-[180px]">
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden border border-border">
                <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                </CardHeader>
                <CardFooter className="p-4 pt-2 grid grid-cols-2 gap-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredTraders.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg border border-border">
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