'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Users, UserPlus, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TradersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Count of pending connection requests
  const pendingRequestsCount = user?.profile?.pendingConnections?.length || 0;
  
  // Count of current connections
  const connectionsCount = user?.profile?.connections?.length || 0;
  
  return (
    <div className="space-y-8">
      {/* Page header with title */}
      <div className="flex justify-between items-center py-6 rounded-lg mb-4">
        <h1 className="text-3xl font-bold text-foreground/90">Trader Network</h1>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">
            My Connections
            {connectionsCount > 0 && (
              <Badge variant="outline" className="ml-2">{connectionsCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingRequestsCount}</Badge>
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
                <Button asChild className="w-full" variant={pendingRequestsCount > 0 ? "default" : "outline"}>
                  <Link href="/dashboard/traders/requests">
                    View Requests
                    {pendingRequestsCount > 0 && (
                      <Badge variant="outline" className="ml-2 bg-white/20">{pendingRequestsCount}</Badge>
                    )}
                  </Link>
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
                <Button asChild className="w-full" variant={connectionsCount > 0 ? "default" : "outline"}>
                  <Link href="/dashboard/traders/connections">
                    View Connections
                    {connectionsCount > 0 && (
                      <Badge variant="outline" className="ml-2 bg-white/20">{connectionsCount}</Badge>
                    )}
                  </Link>
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
              {/* This will be replaced with the actual connections list once we build it */}
              <p className="text-muted-foreground text-sm">
                {connectionsCount > 0 
                  ? 'Here are your trader connections:'
                  : 'You don\'t have any connections yet. Find traders to connect with.'}
              </p>
              <div className="mt-4">
                <Button asChild>
                  <Link href="/dashboard/traders/connections">
                    Manage Connections
                  </Link>
                </Button>
              </div>
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
              {/* This will be replaced with the actual requests list once we build it */}
              <p className="text-muted-foreground text-sm">
                {pendingRequestsCount > 0 
                  ? 'Here are your pending connection requests:'
                  : 'You don\'t have any pending connection requests.'}
              </p>
              <div className="mt-4">
                <Button asChild variant={pendingRequestsCount > 0 ? "default" : "outline"}>
                  <Link href="/dashboard/traders/requests">
                    View Requests
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 