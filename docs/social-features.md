# Social Features Documentation

## Overview

The Trading Journal application now includes social features that allow traders to connect with each other, share insights, and communicate through a messaging system. This document outlines the features, implementation details, and usage guidelines.

## Features

### Trader Network

- **Find Traders**: Discover other traders using the platform
- **Connection Management**: Send, accept, and reject connection requests
- **Following/Followers**: Follow other traders to see their updates and insights
- **Profile Visibility**: Control what aspects of your profile are visible to others

### Messaging System

- **Real-time Chat**: Direct messaging with other traders
- **Message Status**: Track read/unread status of messages
- **Chat History**: View and search through past conversations
- **Contact Management**: Easily access your frequent contacts

## Implementation Details

### Data Model

The user profile has been extended with the following social fields:

```typescript
// Social connections
followers: string[];         // UIDs of users following this user
following: string[];         // UIDs of users this user is following
connectionRequests: string[]; // Incoming connection requests (UIDs)
pendingRequests: string[];   // Outgoing connection requests (UIDs)

// Social media links
twitterHandle: string;
instagramHandle: string;
discordHandle: string;
tradingViewUsername: string;

// Privacy settings
allowMessagesFromNonConnections: boolean;
isPublicProfile: boolean;
```

The messaging system uses a dedicated messages collection:

```typescript
interface Message {
  id: string;
  conversationId: string;     // Combined UIDs of participants
  senderId: string;           // UID of message sender
  recipientId: string;        // UID of message recipient
  text: string;               // Message content
  timestamp: Date;            // When the message was sent
  read: boolean;              // Whether the message has been read
  participants: string[];     // Array containing both user UIDs
  otherParticipant: string;   // UID of the non-current user
}
```

### Security Rules

Security rules have been implemented to ensure:

1. User profiles are only readable by:
   - The user themselves
   - Other users, if the profile is set to public

2. Messages are only accessible by:
   - The participants in the conversation
   - The sender can create messages
   - The recipient can mark messages as read

## User Experience

### Finding Traders

1. Navigate to the "Find Traders" page from the sidebar
2. Browse through traders or use the search functionality
3. Send connection requests to traders you want to connect with
4. View different tabs for discovery, following, followers, and requests

### Messaging

1. Access the messaging system from the "Messages" link in the sidebar
2. Select a contact from the left sidebar to view your conversation
3. Type messages in the input box and press enter or click send
4. Unread messages are indicated with a badge on the contact list

### Profile Settings

1. Go to your profile page
2. Navigate to the "Social Connections" section
3. Add your social media handles
4. Configure your privacy and connection settings
5. View your network statistics

## Best Practices

1. **Complete Your Profile**: A detailed profile helps other traders find and connect with you.
2. **Be Selective**: Connect with traders who share similar strategies or interests.
3. **Respect Privacy**: Not all traders want to share their full statistics or trades.
4. **Professional Communication**: Keep messages professional and trading-focused.
5. **Regular Updates**: Update your profile regularly to reflect your current trading style and experience.

## Technical Considerations

- The messaging system uses Firestore listeners for real-time updates
- Connection status is cached to minimize database reads
- Network statistics are updated when connection requests are accepted/rejected
- Security rules ensure data is only accessible to authorized users

## Future Enhancements

Planned enhancements to the social features include:

1. **Trade Sharing**: Share specific trades with your connections
2. **Trading Insights**: Post and share trading insights with your network
3. **Group Messaging**: Create group conversations with multiple traders
4. **Performance Comparisons**: Compare your trading performance with connections
5. **Notifications**: Receive notifications for new messages and connection requests 