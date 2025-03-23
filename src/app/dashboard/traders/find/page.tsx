'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { 
  collection, 
  query, 
  getDocs, 
  where,
  updateDoc,
  doc, 
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft, Search, UserPlus, Check, MessageSquare, UserMinus, MoreHorizontal, Filter, X, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  isPublicProfile?: boolean;
}

export default function FindTradersPage() {
  const { user, updateConnectionState } = useAuth();
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    tradingStyle: '_any',
    experience: '_any',
    riskTolerance: '_any',
    preferredMarket: '_any'
  });
  const [processingConnection, setProcessingConnection] = useState<{[key: string]: boolean}>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Fetch all public traders from Firebase
  useEffect(() => {
    const fetchTraders = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // We'll fetch all users who either have isPublicProfile=true or don't have the field set at all
        const usersRef = collection(db, 'users');
        const tradersSnapshot = await getDocs(usersRef);
        
        const tradersData: TraderProfile[] = [];
        
        tradersSnapshot.forEach((doc) => {
          const data = doc.data();
          // Filter out the current user and non-public profiles
          if (data.uid !== user.uid && data.isPublicProfile !== false) {
            // Log trader data to help debug
            console.log('Trader data:', data);
            tradersData.push({
              uid: data.uid,
              displayName: data.displayName || 'Unnamed Trader',
              photoURL: data.photoURL,
              location: data.location || '',
              tradingStyle: data.tradingStyle || '',
              experience: data.experience || '',
              riskTolerance: data.riskTolerance || '',
              preferredMarkets: data.preferredMarkets || [],
              isPublicProfile: data.isPublicProfile
            });
          }
        });
        
        console.log('All traders:', tradersData);
        setTraders(tradersData);
      } catch (error) {
        console.error("Error fetching traders:", error);
        toast.error("Failed to load traders");
      } finally {
        setLoading(false);
      }
    };
    
    fetchTraders();
  }, [user]);
  
  const handleFilterChange = (key: string, value: string) => {
    console.log(`Filter changed: ${key} = ${value}`);
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const filteredTraders = traders.filter(trader => {
    // For debugging
    let include = true;
    
    // Filter by search query (name search)
    if (searchQuery && 
        !trader.displayName.toLowerCase().includes(searchQuery.toLowerCase())) {
      include = false;
    }
    
    // Only apply style filter if not "_any" and the trader has a style
    if (include && filters.tradingStyle !== "_any") {
      if (!trader.tradingStyle || !trader.tradingStyle.toLowerCase().includes(filters.tradingStyle.toLowerCase())) {
        include = false;
      }
    }
    
    // Only apply experience filter if not "_any" and the trader has experience
    if (include && filters.experience !== "_any") {
      if (!trader.experience || !trader.experience.toLowerCase().includes(filters.experience.toLowerCase())) {
        include = false;
      }
    }
    
    // Only apply risk tolerance filter if not "_any" and the trader has risk tolerance
    if (include && filters.riskTolerance !== "_any") {
      if (!trader.riskTolerance || !trader.riskTolerance.toLowerCase().includes(filters.riskTolerance.toLowerCase())) {
        include = false;
      }
    }
    
    // Only apply market filter if not "_any" and the trader has preferred markets
    if (include && filters.preferredMarket !== "_any") {
      const hasMarket = trader.preferredMarkets?.some(market => 
        market.toLowerCase().includes(filters.preferredMarket.toLowerCase())
      );
      if (!hasMarket) {
        include = false;
      }
    }
    
    // Log the result for debugging
    if (!include) {
      console.log('Filtered out trader:', trader.displayName, trader);
      console.log('Current filters:', filters);
    }
    
    return include;
  });
  
  // Log the filtered results
  useEffect(() => {
    console.log('Filtered traders:', filteredTraders.length, filteredTraders);
  }, [filteredTraders]);
  
  // Check if connection already exists or is pending
  const isPendingOrConnected = (traderUid: string) => {
    return (
      user?.profile?.connections?.includes(traderUid) || 
      user?.profile?.outgoingRequests?.includes(traderUid)
    );
  };
  
  // Send a connection request
  const sendConnectionRequest = async (traderId: string) => {
    if (!user) return;
    
    try {
      setProcessingConnection(prev => ({ ...prev, [traderId]: true }));
      
      // 1. Add the trader to the current user's outgoing requests
      await updateDoc(doc(db, 'users', user.uid), {
        outgoingRequests: arrayUnion(traderId)
      });
      
      // 2. Add the current user to the trader's pending connections
      await updateDoc(doc(db, 'users', traderId), {
        pendingConnections: arrayUnion(user.uid)
      });
      
      // 3. Create a notification for the recipient
      const notificationData = {
        type: 'connection_request',
        fromUid: user.uid,
        timestamp: Timestamp.now(),
        read: false
      };
      
      const notificationsRef = collection(db, 'users', traderId, 'notifications');
      await updateDoc(doc(db, 'users', traderId), {
        hasUnreadNotifications: true
      });
      
      // 4. Show success notification
      toast.success('Connection request sent');
      
      // 5. Update the local state to reflect the change
      const currentOutgoingRequests = user.profile?.outgoingRequests || [];
      
      if (!currentOutgoingRequests.includes(traderId)) {
        // Update the local state using the context function
        updateConnectionState({
          outgoingRequests: [...currentOutgoingRequests, traderId]
        });
      }
      
    } catch (error) {
      console.error("Error sending connection request:", error);
      toast.error("Failed to send connection request");
    } finally {
      setProcessingConnection(prev => ({ ...prev, [traderId]: false }));
    }
  };
  
  // Cancel an outgoing request
  const cancelRequest = async (traderId: string) => {
    if (!user) return;
    
    try {
      setProcessingConnection(prev => ({ ...prev, [traderId]: true }));
      
      // Get current connection state
      const currentOutgoingRequests = user.profile?.outgoingRequests || [];
      
      // 1. Remove from outgoing requests
      await updateDoc(doc(db, 'users', user.uid), {
        outgoingRequests: arrayRemove(traderId)
      });
      
      // 2. Remove from other user's pending connections
      await updateDoc(doc(db, 'users', traderId), {
        pendingConnections: arrayRemove(user.uid)
      });
      
      // 3. Update auth context state
      updateConnectionState({
        outgoingRequests: currentOutgoingRequests.filter(id => id !== traderId)
      });
      
      // 4. Show success notification
      toast.success('Connection request canceled');
      
    } catch (error) {
      console.error("Error canceling connection request:", error);
      toast.error("Failed to cancel request");
    } finally {
      setProcessingConnection(prev => ({ ...prev, [traderId]: false }));
    }
  };
  
  // Remove a connection
  const removeConnection = async (traderId: string) => {
    if (!user) return;
    
    try {
      setProcessingConnection(prev => ({ ...prev, [traderId]: true }));
      
      // Get current connection state
      const currentConnections = user.profile?.connections || [];
      
      // 1. Remove from the current user's connections
      await updateDoc(doc(db, 'users', user.uid), {
        connections: arrayRemove(traderId)
      });
      
      // 2. Remove from the other user's connections
      await updateDoc(doc(db, 'users', traderId), {
        connections: arrayRemove(user.uid)
      });
      
      // 3. Update auth context state
      updateConnectionState({
        connections: currentConnections.filter(id => id !== traderId)
      });
      
      // 4. Show success notification
      toast.success('Connection removed');
      
    } catch (error) {
      console.error("Error removing connection:", error);
      toast.error("Failed to remove connection");
    } finally {
      setProcessingConnection(prev => ({ ...prev, [traderId]: false }));
    }
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
          <h1 className="text-2xl font-bold">Find Traders</h1>
        </div>
      </div>
      
      {/* Simplified search with filter toggle */}
      <div className="flex flex-col gap-4">
        <Card className="p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search traders by name..."
                className="pl-9 h-10 bg-background border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={showFilters ? "default" : "outline"} 
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className={showFilters ? "bg-primary text-primary-foreground" : ""}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{showFilters ? "Hide filters" : "Show filters"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Collapsible inline filters */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-border/40">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {/* Trading Style */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Style:</span>
                  <Select
                    value={filters.tradingStyle}
                    onValueChange={(value) => handleFilterChange('tradingStyle', value)}
                  >
                    <SelectTrigger className="h-7 text-xs px-2 min-w-[100px] w-auto border-dashed">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_any">Any style</SelectItem>
                      <SelectItem value="day">Day Trading</SelectItem>
                      <SelectItem value="swing">Swing Trading</SelectItem>
                      <SelectItem value="scalping">Scalping</SelectItem>
                      <SelectItem value="position">Position Trading</SelectItem>
                      <SelectItem value="algorithmic">Algorithmic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Experience */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Experience:</span>
                  <Select
                    value={filters.experience}
                    onValueChange={(value) => handleFilterChange('experience', value)}
                  >
                    <SelectTrigger className="h-7 text-xs px-2 min-w-[100px] w-auto border-dashed">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_any">Any experience</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="1 year">1 Year</SelectItem>
                      <SelectItem value="2 years">2+ Years</SelectItem>
                      <SelectItem value="5 years">5+ Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Risk Tolerance */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Risk:</span>
                  <Select
                    value={filters.riskTolerance}
                    onValueChange={(value) => handleFilterChange('riskTolerance', value)}
                  >
                    <SelectTrigger className="h-7 text-xs px-2 min-w-[100px] w-auto border-dashed">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_any">Any risk level</SelectItem>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Market */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Market:</span>
                  <Select
                    value={filters.preferredMarket}
                    onValueChange={(value) => handleFilterChange('preferredMarket', value)}
                  >
                    <SelectTrigger className="h-7 text-xs px-2 min-w-[100px] w-auto border-dashed">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_any">Any market</SelectItem>
                      <SelectItem value="forex">Forex</SelectItem>
                      <SelectItem value="stocks">Stocks</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="options">Options</SelectItem>
                      <SelectItem value="futures">Futures</SelectItem>
                      <SelectItem value="commodities">Commodities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {Object.values(filters).some(value => value !== '_any') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs ml-auto"
                    onClick={() => {
                      setFilters({
                        tradingStyle: '_any',
                        experience: '_any',
                        riskTolerance: '_any',
                        preferredMarket: '_any'
                      });
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              {/* Active filters */}
              {Object.values(filters).some(value => value !== '_any') && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {filters.tradingStyle !== '_any' && (
                    <Badge variant="outline" className="text-xs h-5 bg-primary/5 hover:bg-primary/10" onClick={() => handleFilterChange('tradingStyle', '_any')}>
                      {filters.tradingStyle}
                      <X className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  )}
                  {filters.experience !== '_any' && (
                    <Badge variant="outline" className="text-xs h-5 bg-primary/5 hover:bg-primary/10" onClick={() => handleFilterChange('experience', '_any')}>
                      {filters.experience}
                      <X className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  )}
                  {filters.riskTolerance !== '_any' && (
                    <Badge variant="outline" className="text-xs h-5 bg-primary/5 hover:bg-primary/10" onClick={() => handleFilterChange('riskTolerance', '_any')}>
                      {filters.riskTolerance}
                      <X className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  )}
                  {filters.preferredMarket !== '_any' && (
                    <Badge variant="outline" className="text-xs h-5 bg-primary/5 hover:bg-primary/10" onClick={() => handleFilterChange('preferredMarket', '_any')}>
                      {filters.preferredMarket}
                      <X className="h-2.5 w-2.5 ml-1" />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
        
        {/* Results */}
        <Card className="shadow-sm border-primary/5">
          <div className="p-1">
            {loading ? (
              // Loading skeletons
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="p-3 m-2 bg-muted/30 rounded-lg animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-muted"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-[150px] bg-muted rounded-md"></div>
                        <div className="h-3 w-[100px] bg-muted rounded-md"></div>
                      </div>
                    </div>
                    <div className="h-9 w-9 bg-muted rounded-md"></div>
                  </div>
                </div>
              ))
            ) : filteredTraders.length > 0 ? (
              filteredTraders.map((trader) => (
                <div 
                  key={trader.uid} 
                  className="m-2 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2">
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <Link href={`/dashboard/traders/${trader.uid}`}>
                        <Avatar className="h-10 w-10 border border-border cursor-pointer">
                          <AvatarImage src={trader.photoURL} alt={trader.displayName} />
                          <AvatarFallback>
                            {trader.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div>
                        <Link 
                          href={`/dashboard/traders/${trader.uid}`}
                          className="hover:text-primary transition-colors"
                        >
                          <h3 className="font-medium">{trader.displayName}</h3>
                        </Link>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {trader.location && (
                            <span className="text-xs text-muted-foreground">{trader.location}</span>
                          )}
                          {trader.tradingStyle && (
                            <Badge variant="outline" className="px-2 py-0 text-xs h-5">{trader.tradingStyle}</Badge>
                          )}
                          {trader.preferredMarkets?.slice(0, 2).map(market => (
                            <Badge key={market} variant="secondary" className="px-2 py-0 text-xs h-5">{market}</Badge>
                          ))}
                          {trader.preferredMarkets && trader.preferredMarkets.length > 2 && (
                            <Badge variant="secondary" className="px-2 py-0 text-xs h-5">+{trader.preferredMarkets.length - 2}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-end">
                      {isPendingOrConnected(trader.uid) ? (
                        user?.profile?.connections?.includes(trader.uid) ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-md">
                                        <MessageSquare className="h-4 w-4 text-primary" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => removeConnection(trader.uid)}
                                        disabled={processingConnection[trader.uid]}
                                      >
                                        <UserMinus className="mr-2 h-4 w-4" />
                                        {processingConnection[trader.uid] ? "Removing..." : "Remove Connection"}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>You are connected</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-md">
                                        <Check className="h-4 w-4 text-primary" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => cancelRequest(trader.uid)}
                                        disabled={processingConnection[trader.uid]}
                                      >
                                        <UserMinus className="mr-2 h-4 w-4" />
                                        {processingConnection[trader.uid] ? "Canceling..." : "Cancel Request"}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Request sent</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-md"
                                onClick={(e) => {
                                  e.preventDefault();
                                  sendConnectionRequest(trader.uid);
                                }}
                                disabled={processingConnection[trader.uid]}
                              >
                                {processingConnection[trader.uid] ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                  <UserPlus className="h-4 w-4 text-primary" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Connect with trader</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <Button 
                        variant="default" 
                        size="icon" 
                        asChild 
                        className="ml-2 rounded-md h-9 w-9 border border-primary/30 bg-primary/10 hover:bg-primary/20"
                      >
                        <Link href={`/dashboard/traders/${trader.uid}`}>
                          <ExternalLink className="h-4 w-4 text-primary" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto bg-muted/30 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No traders found</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1">
                  {traders.length > 0 ? 
                    "No traders match your current filters. Try adjusting your search criteria." : 
                    "No traders available. Check back later as more traders join the platform."}
                </p>
                {traders.length > 0 && Object.values(filters).some(value => value !== '_any') && (
                  <div className="mt-4 flex flex-col items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setSearchQuery('');
                        setFilters({
                          tradingStyle: '_any',
                          experience: '_any',
                          riskTolerance: '_any',
                          preferredMarket: '_any'
                        });
                      }}
                    >
                      <X className="h-3.5 w-3.5 mr-1.5" />
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
} 