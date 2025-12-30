# WebSocket Direct Messaging (DM) Implementation Guide

This guide provides a complete, step-by-step documentation of how WebSocket-based direct messaging is implemented in the Top Tutors Connect project. Use this guide to quickly implement or replicate the real-time messaging feature.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Database Schema](#database-schema)
6. [Step-by-Step Implementation](#step-by-step-implementation)
7. [Complete Code Examples](#complete-code-examples)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

The project uses **Socket.IO** for real-time bidirectional communication between the client and server. This enables:

- ✅ Real-time message delivery
- ✅ Instant message notifications
- ✅ Read receipts
- ✅ Online/offline status (can be extended)
- ✅ Typing indicators (can be extended)
- ✅ Media file sharing with real-time updates

### Technology Stack

- **Backend**: Socket.IO v4.8.1
- **Frontend**: socket.io-client
- **Authentication**: JWT tokens
- **Database**: PostgreSQL (for message persistence)

---

## Architecture

### High-Level Flow

```
┌─────────────┐                    ┌─────────────┐
│   Client    │                    │   Server    │
│  (React)    │                    │  (Node.js)  │
└──────┬──────┘                    └──────┬──────┘
       │                                   │
       │  1. Connect with JWT token       │
       │──────────────────────────────────>│
       │                                   │
       │  2. Authenticate & Join Rooms     │
       │<──────────────────────────────────│
       │                                   │
       │  3. Send Message (HTTP + Socket)  │
       │──────────────────────────────────>│
       │                                   │
       │  4. Save to Database              │
       │                                   │
       │  5. Emit to Room/Users            │
       │<──────────────────────────────────│
       │                                   │
       │  6. Real-time Update              │
       │<──────────────────────────────────│
```

### Room Structure

The system uses two types of rooms:

1. **Conversation Rooms**: `room_{conversationId}`
   - All participants in a conversation join this room
   - Messages are broadcast to this room
   - Used for conversation-specific events

2. **User Rooms**: `user_{userId}`
   - Each user has their own room
   - Used as a fallback to ensure message delivery
   - Useful when user hasn't joined conversation room yet

---

## Backend Implementation

### Step 1: Install Dependencies

```bash
cd Backend
npm install socket.io
```

### Step 2: Setup Socket.IO Server

**File**: `Backend/server.js`

```javascript
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getUserConversationIds } from "./models/messagingModel.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Create HTTP server (required for Socket.IO)
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Configure for production: ["https://yourdomain.com"]
    methods: ["GET", "POST"]
  },
});

// Make io accessible in routes/controllers
app.set("io", io);

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      return next(new Error("Authentication token required"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to socket
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    
    next();
  } catch (err) {
    console.error("Socket authentication error:", err);
    next(new Error("Authentication failed"));
  }
});

// Socket.IO Connection Handler
io.on("connection", async (socket) => {
  const userId = socket.userId;
  console.log(`🔌 User ${userId} connected: ${socket.id}`);

  // Auto-join user to all their conversation rooms
  try {
    const conversationIds = await getUserConversationIds(userId);
    conversationIds.forEach((conversationId) => {
      socket.join(`room_${conversationId}`);
    });
    console.log(`➡️ User ${userId} auto-joined ${conversationIds.length} conversation rooms`);
  } catch (err) {
    console.error(`Error auto-joining conversations for user ${userId}:`, err);
  }

  // Join user-specific room (for direct messaging)
  socket.join(`user_${userId}`);

  // Manual join conversation (for new conversations)
  socket.on("join_conversation", (conversationId) => {
    socket.join(`room_${conversationId}`);
    console.log(`➡️ User ${userId} joined room_${conversationId}`);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`❌ User ${userId} disconnected: ${socket.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO listening on ${PORT}`);
});
```

### Step 3: Emit Messages from Controller

**File**: `Backend/controllers/messageController.js`

```javascript
import { getOrCreateConversation, saveMessage } from "../models/messagingModel.js";

const sendMessage = async (req, res) => {
  const { text, receiverId, conversationId } = req.body;
  const senderId = req.user.id;
  const io = req.app.get("io"); // Get Socket.IO instance
  const file = req.file; // For media uploads

  // Validate input
  if (!text && !file) {
    return res.status(400).json({ 
      success: false, 
      error: "Text or file is required" 
    });
  }

  if (!receiverId) {
    return res.status(400).json({ 
      success: false, 
      error: "Receiver ID is required" 
    });
  }

  try {
    // Handle file upload if present
    let mediaUrl = null;
    let mediaType = null;
    let s3Key = null;
    
    if (file) {
      const uploadResult = await uploadMedia(file);
      mediaUrl = uploadResult.url;
      mediaType = uploadResult.mediaType;
      s3Key = uploadResult.key;
    }

    // Get or create conversation
    const isNewConversation = !conversationId;
    const finalConversationId = conversationId 
      ? conversationId 
      : await getOrCreateConversation(senderId, receiverId);

    // Save message to database
    const newMessage = await saveMessage(
      finalConversationId,
      senderId,
      receiverId,
      text || null,
      mediaUrl,
      mediaType,
      s3Key
    );

    // If new conversation, auto-join both users to the room
    if (isNewConversation) {
      const sockets = await io.fetchSockets();
      sockets.forEach(socket => {
        if (socket.userId === senderId || socket.userId === receiverId) {
          socket.join(`room_${finalConversationId}`);
          console.log(`➡️ Socket ${socket.id} auto-joined room_${finalConversationId}`);
        }
      });
    }

    // Emit message to conversation room
    io.to(`room_${finalConversationId}`).emit("newMessage", newMessage);

    // Emit to receiver's user room (fallback)
    io.to(`user_${receiverId}`).emit("newMessage", newMessage);

    // Emit to sender's user room (for consistency)
    io.to(`user_${senderId}`).emit("newMessage", newMessage);

    // Return response
    res.json({
      success: true,
      message: "Message sent",
      data: {
        id: newMessage.id,
        conversation_id: newMessage.conversation_id,
        sender_id: newMessage.sender_id,
        receiver_id: newMessage.receiver_id,
        text: newMessage.message_text,
        media_url: newMessage.media_url,
        media_type: newMessage.media_type,
        created_at: newMessage.created_at,
      },
    });

  } catch (err) {
    console.error("❌ Message error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

// Mark messages as read and emit read receipt
const markAsRead = async (req, res) => {
  const { conversationId } = req.body;
  const userId = req.user.id;
  const io = req.app.get("io");

  try {
    await markMessagesAsRead(conversationId, userId);

    // Emit read receipt to conversation room
    if (io) {
      io.to(`room_${conversationId}`).emit("read_receipt", { 
        conversationId, 
        userId 
      });
    }

    res.json({ success: true, message: "Messages marked as read" });
  } catch (err) {
    console.error("❌ Mark as read error:", err);
    res.status(500).json({ success: false, error: "Failed to mark read" });
  }
};

export default { sendMessage, markAsRead, /* ... other methods */ };
```

---

## Frontend Implementation

### Step 1: Install Dependencies

```bash
cd Frontend
npm install socket.io-client
```

### Step 2: Create Socket Service

**File**: `Frontend/src/services/chatSocket.js`

```javascript
import { io } from "socket.io-client";

let socketInstance = null;

/**
 * Get Socket.IO base URL
 */
function getSocketBaseUrl() {
  // Check for custom socket URL in environment
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  // Development mode
  if (import.meta.env.DEV) {
    return "http://localhost:4000";
  }

  // Production: derive from API URL
  const apiBase = import.meta.env.VITE_API_URL || 
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:4000");
  
  // Remove /api suffix if present
  return apiBase.replace(/\/api$/, "");
}

/**
 * Connect to Socket.IO server
 * @param {string} token - JWT authentication token
 * @returns {Socket} Socket.IO instance
 */
export function connectChatSocket(token) {
  if (!token) return null;

  // Create socket instance if it doesn't exist
  if (!socketInstance) {
    const socketUrl = getSocketBaseUrl();
    socketInstance = io(socketUrl, {
      autoConnect: false, // Don't connect immediately
      transports: ["websocket", "polling"], // Fallback to polling if websocket fails
      reconnection: true, // Auto-reconnect on disconnect
      reconnectionDelay: 1000, // Wait 1s before first reconnect attempt
      reconnectionDelayMax: 5000, // Max 5s between reconnect attempts
      reconnectionAttempts: 5, // Try 5 times before giving up
      auth: {
        token: token, // Send token in auth object
      },
    });
  }

  // Connect if not already connected
  if (socketInstance && !socketInstance.connected) {
    socketInstance.auth = { token }; // Update token
    socketInstance.connect();
  }

  return socketInstance;
}

/**
 * Disconnect from Socket.IO server
 */
export function disconnectChatSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

/**
 * Get current socket instance
 * @returns {Socket|null} Socket.IO instance or null
 */
export function getChatSocket() {
  return socketInstance;
}
```

### Step 3: Use Socket in React Component

**File**: `Frontend/src/pages/student/Messages.jsx` (Example)

```javascript
import { useState, useEffect, useRef } from "react";
import { connectChatSocket, disconnectChatSocket } from "../../services/chatSocket.js";
import { sendMessage as sendMessageAPI, getMessages } from "../../services/messagesService.js";

function Messages() {
  const [messages, setMessages] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [conversationIds, setConversationIds] = useState({});
  const socketRef = useRef(null);
  const token = localStorage.getItem("token");
  const currentUserId = JSON.parse(localStorage.getItem("user"))?.id;

  // Step 1: Connect Socket when component mounts
  useEffect(() => {
    if (!token) return;

    // Connect to socket
    const socket = connectChatSocket(token);
    socketRef.current = socket;

    // Handle connection event
    const handleConnect = () => {
      console.log("Socket connected");
    };

    // Handle new message event
    const handleNewMessage = (messageData) => {
      const message = messageData;
      const conversationId = message.conversation_id || message.conversationId;

      // Get sender and receiver IDs
      const senderId = String(message.sender_id);
      const receiverId = String(message.receiver_id);
      const currentUserIdStr = String(currentUserId);

      // Determine the other participant
      const otherParticipantId = 
        senderId === currentUserIdStr ? receiverId : senderId;

      // Don't process if message is from/to current user incorrectly
      if (!otherParticipantId || otherParticipantId === currentUserIdStr) {
        return;
      }

      // Update conversation IDs mapping
      if (conversationId && otherParticipantId) {
        setConversationIds((prev) => {
          if (prev[otherParticipantId] === conversationId) {
            return prev; // Already mapped
          }
          return {
            ...prev,
            [otherParticipantId]: conversationId,
          };
        });
      }

      // Transform message to frontend format
      const transformedMessage = {
        id: message.id,
        conversationId: conversationId,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
        content: message.message_text || message.text,
        mediaUrl: message.media_url,
        mediaType: message.media_type,
        createdAt: message.created_at || message.createdAt,
        senderName: message.sender_name || `User ${message.sender_id}`,
        isRead: message.is_read || false,
      };

      // Check if message should be added to current conversation
      const currentSelection = selectedTutor;
      const currentConversationId = currentSelection
        ? conversationIds[currentSelection.id]
        : null;
      
      const participantMatchesSelection = 
        currentSelection && currentSelection.id === otherParticipantId;
      
      const shouldAppendToActiveConversation =
        conversationId === currentConversationId ||
        (participantMatchesSelection && !currentConversationId);

      // Add message to current conversation if active
      if (shouldAppendToActiveConversation) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((existing) => existing.id === transformedMessage.id)) {
            return prev;
          }
          return [...prev, transformedMessage];
        });

        // Mark as read if conversation is active
        if (conversationId) {
          markAsRead(conversationId).catch(() => {});
        }
      }

      // Update tutors list with new message info
      setTutors((prev) => {
        const existingParticipant = prev.find(
          (p) => String(p.id) === String(otherParticipantId)
        );

        if (existingParticipant) {
          // Update existing participant
          return prev.map((participant) => {
            if (String(participant.id) === String(otherParticipantId)) {
              const isActiveParticipant = 
                currentSelection?.id === participant.id;
              
              return {
                ...participant,
                lastMessage: transformedMessage.content,
                lastMessageTime: formatTime(transformedMessage.createdAt),
                unreadCount: isActiveParticipant 
                  ? 0 
                  : (participant.unreadCount || 0) + 1,
              };
            }
            return participant;
          });
        } else {
          // Add new participant if not in list
          if (String(otherParticipantId) !== String(currentUserId)) {
            return [
              ...prev,
              {
                id: parseInt(otherParticipantId),
                name: transformedMessage.senderName,
                email: "",
                role: "tutor",
                lastMessage: transformedMessage.content,
                lastMessageTime: formatTime(transformedMessage.createdAt),
                unreadCount: 1,
                conversationId: conversationId,
              },
            ];
          }
          return prev;
        }
      });
    };

    // Register event listeners
    socket.on("connect", handleConnect);
    socket.on("newMessage", handleNewMessage);

    // Cleanup on unmount
    return () => {
      socket.off("connect", handleConnect);
      socket.off("newMessage", handleNewMessage);
      disconnectChatSocket();
      socketRef.current = null;
    };
  }, [token, currentUserId]);

  // Step 2: Join conversation room when tutor is selected
  useEffect(() => {
    if (!socketRef.current || !selectedTutor) return;

    const conversationId = conversationIds[selectedTutor.id];
    if (conversationId) {
      // Emit join_conversation event
      socketRef.current.emit("join_conversation", conversationId);
      console.log(`Joined conversation room: ${conversationId}`);
    }
  }, [selectedTutor, conversationIds]);

  // Step 3: Send message function
  const sendMessage = async (text, file = null) => {
    if (!selectedTutor) return;

    try {
      // Get or create conversation ID
      let conversationId = conversationIds[selectedTutor.id];
      
      if (!conversationId) {
        // Fetch conversation ID from API
        const response = await getConversationId(selectedTutor.id);
        conversationId = response.conversationId;
        setConversationIds((prev) => ({
          ...prev,
          [selectedTutor.id]: conversationId,
        }));
      }

      // Send message via API (which will emit via Socket.IO)
      const formData = new FormData();
      formData.append("text", text);
      formData.append("receiverId", selectedTutor.id);
      if (conversationId) {
        formData.append("conversationId", conversationId);
      }
      if (file) {
        formData.append("file", file);
      }

      const response = await sendMessageAPI(formData);
      const sentMessage = response.data;

      // Join conversation room if not already joined
      if (socketRef.current && conversationId) {
        socketRef.current.emit("join_conversation", conversationId);
      }

      // Optionally add message to local state immediately (optimistic update)
      // The real message will come via Socket.IO event
      
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Step 4: Mark messages as read
  const markAsRead = async (conversationId) => {
    try {
      await markMessagesAsReadAPI(conversationId);
      // Read receipt will be emitted via Socket.IO
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  return (
    <div>
      {/* Your message UI here */}
    </div>
  );
}

export default Messages;
```

---

## Database Schema

### Required Tables

```sql
-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  is_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  receiver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message_text TEXT,
  media_url TEXT,
  media_type VARCHAR(20),
  s3_key TEXT, -- For S3 storage
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  is_system_message BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
```

---

## Step-by-Step Implementation

### Complete Implementation Checklist

#### Backend Setup

1. ✅ **Install Socket.IO**
   ```bash
   npm install socket.io
   ```

2. ✅ **Create HTTP Server**
   - Use `createServer` from `http` module
   - Don't use `app.listen()` directly

3. ✅ **Initialize Socket.IO**
   - Create `Server` instance
   - Configure CORS
   - Attach to HTTP server

4. ✅ **Setup Authentication Middleware**
   - Use `io.use()` for authentication
   - Verify JWT token
   - Attach user info to socket

5. ✅ **Handle Connections**
   - Auto-join user to conversation rooms
   - Join user-specific room
   - Handle manual room joins

6. ✅ **Emit Messages**
   - After saving to database
   - Emit to conversation room
   - Emit to user rooms (fallback)

#### Frontend Setup

1. ✅ **Install Socket.IO Client**
   ```bash
   npm install socket.io-client
   ```

2. ✅ **Create Socket Service**
   - Connection function
   - Disconnection function
   - Singleton pattern

3. ✅ **Connect on Component Mount**
   - Get JWT token
   - Call `connectChatSocket()`
   - Store socket reference

4. ✅ **Listen for Events**
   - `connect` event
   - `newMessage` event
   - `read_receipt` event (optional)

5. ✅ **Join Conversation Rooms**
   - Emit `join_conversation` when conversation selected
   - Track joined conversations

6. ✅ **Handle Real-time Updates**
   - Update messages state
   - Update conversation list
   - Update unread counts

7. ✅ **Cleanup on Unmount**
   - Remove event listeners
   - Disconnect socket

---

## Complete Code Examples

### Backend: Complete Server Setup

```javascript
// Backend/server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getUserConversationIds } from "./models/messagingModel.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.set("io", io);

// Authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Token required"));
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
});

// Connection handler
io.on("connection", async (socket) => {
  const userId = socket.userId;
  
  // Auto-join conversation rooms
  try {
    const conversationIds = await getUserConversationIds(userId);
    conversationIds.forEach(id => socket.join(`room_${id}`));
  } catch (err) {
    console.error("Error joining rooms:", err);
  }
  
  // Join user room
  socket.join(`user_${userId}`);
  
  // Manual join
  socket.on("join_conversation", (conversationId) => {
    socket.join(`room_${conversationId}`);
  });
  
  socket.on("disconnect", () => {
    console.log(`User ${userId} disconnected`);
  });
});

server.listen(4000, () => {
  console.log("Server + Socket.IO listening on 4000");
});
```

### Frontend: Complete Component Example

```javascript
// Frontend/src/pages/Messages.jsx
import { useState, useEffect, useRef } from "react";
import { connectChatSocket, disconnectChatSocket } from "../services/chatSocket.js";

function Messages() {
  const [messages, setMessages] = useState([]);
  const socketRef = useRef(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;

    const socket = connectChatSocket(token);
    socketRef.current = socket;

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
      disconnectChatSocket();
    };
  }, [token]);

  return <div>{/* UI */}</div>;
}
```

---

## Testing

### Test Socket Connection

```javascript
// In browser console
const socket = io("http://localhost:4000", {
  auth: { token: "your_jwt_token" }
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("newMessage", (message) => {
  console.log("New message:", message);
});
```

### Test Message Sending

```bash
# Send message via API
curl -X POST http://localhost:4000/api/message/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test message",
    "receiverId": 2
  }'
```

---

## Troubleshooting

### Issue: Socket Not Connecting

**Symptoms**: `socket.connected` is false

**Solutions**:
1. Check token is valid
2. Verify CORS configuration
3. Check server is running
4. Verify Socket.IO URL is correct

### Issue: Messages Not Received

**Solutions**:
1. Verify user joined conversation room
2. Check message is being emitted correctly
3. Verify event name matches (`newMessage`)
4. Check browser console for errors

### Issue: Authentication Fails

**Solutions**:
1. Verify JWT_SECRET matches
2. Check token format in handshake
3. Verify token hasn't expired
4. Check server logs for auth errors

### Issue: Duplicate Messages

**Solutions**:
1. Check for duplicate event listeners
2. Verify message ID uniqueness
3. Add duplicate check in state update

---

## Best Practices

### 1. Connection Management

- ✅ Connect once per user session
- ✅ Reuse socket instance (singleton pattern)
- ✅ Disconnect on logout/unmount
- ✅ Handle reconnection automatically

### 2. Room Management

- ✅ Auto-join on connection
- ✅ Manual join for new conversations
- ✅ Track joined rooms to avoid duplicates

### 3. Message Handling

- ✅ Save to database first
- ✅ Then emit via Socket.IO
- ✅ Handle optimistic updates carefully
- ✅ Prevent duplicate messages

### 4. Error Handling

- ✅ Handle connection errors
- ✅ Handle authentication errors
- ✅ Handle message send failures
- ✅ Log errors for debugging

### 5. Performance

- ✅ Limit message history
- ✅ Use pagination for old messages
- ✅ Clean up event listeners
- ✅ Monitor socket connections

### 6. Security

- ✅ Always authenticate connections
- ✅ Verify user permissions
- ✅ Validate message data
- ✅ Rate limit message sending

---

## Environment Variables

### Backend (.env)

```env
# JWT Secret (required for socket authentication)
JWT_SECRET=your_very_secure_secret_key_here

# Port
PORT=4000
```

### Frontend (.env)

```env
# Socket.IO URL (optional, auto-detected if not set)
VITE_SOCKET_URL=http://localhost:4000

# API URL (used to derive socket URL if VITE_SOCKET_URL not set)
VITE_API_URL=http://localhost:4000/api
```

---

## Additional Features (Can Be Extended)

### Typing Indicators

**Backend**:
```javascript
socket.on("typing", ({ conversationId, isTyping }) => {
  socket.to(`room_${conversationId}`).emit("user_typing", {
    userId: socket.userId,
    isTyping
  });
});
```

**Frontend**:
```javascript
socket.emit("typing", { conversationId, isTyping: true });
socket.on("user_typing", ({ userId, isTyping }) => {
  // Update UI
});
```

### Online/Offline Status

**Backend**:
```javascript
const onlineUsers = new Set();

io.on("connection", (socket) => {
  onlineUsers.add(socket.userId);
  io.emit("user_online", socket.userId);
  
  socket.on("disconnect", () => {
    onlineUsers.delete(socket.userId);
    io.emit("user_offline", socket.userId);
  });
});
```

### Message Reactions

**Backend**:
```javascript
socket.on("message_reaction", ({ messageId, reaction }) => {
  // Save reaction to database
  io.to(`room_${conversationId}`).emit("reaction_added", {
    messageId,
    userId: socket.userId,
    reaction
  });
});
```

---

## Quick Reference

### Backend Events

- `connection` - User connects
- `disconnect` - User disconnects
- `join_conversation` - Join a conversation room
- `newMessage` - New message received (emitted)
- `read_receipt` - Read receipt (emitted)

### Frontend Events

- `connect` - Socket connected
- `disconnect` - Socket disconnected
- `newMessage` - New message received
- `read_receipt` - Read receipt received

### Socket Methods

- `socket.join(room)` - Join a room
- `socket.leave(room)` - Leave a room
- `io.to(room).emit(event, data)` - Emit to room
- `socket.emit(event, data)` - Emit to socket
- `socket.on(event, handler)` - Listen for event

---

## File Structure

```
Backend/
├── server.js                    # Socket.IO server setup
├── controllers/
│   └── messageController.js    # Message handling + Socket emits
├── models/
│   └── messagingModel.js       # Database operations
└── routes/
    └── messageRoute.js         # API routes

Frontend/
├── src/
│   ├── services/
│   │   └── chatSocket.js       # Socket.IO client service
│   └── pages/
│       ├── student/
│       │   └── Messages.jsx    # Student messages page
│       ├── tutor/
│       │   └── Messages.jsx    # Tutor messages page
│       └── admin/
│           └── Messages.jsx    # Admin messages page
```

---

## Summary

This implementation provides:

1. ✅ **Real-time messaging** via Socket.IO
2. ✅ **JWT authentication** for secure connections
3. ✅ **Room-based messaging** for conversations
4. ✅ **Fallback delivery** via user rooms
5. ✅ **Media support** with real-time updates
6. ✅ **Read receipts** functionality
7. ✅ **Auto-reconnection** on disconnect
8. ✅ **Scalable architecture** for multiple users

**Key Points to Remember**:

- Always authenticate socket connections
- Save messages to database before emitting
- Use rooms for conversation-specific events
- Use user rooms as fallback for delivery
- Clean up event listeners on unmount
- Handle reconnection automatically
- Prevent duplicate messages

---

**Last Updated**: December 2024
**Version**: 1.0

