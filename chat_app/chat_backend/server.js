require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const Message = require('./models/Message');
const User = require('./models/user'); // Import User model to get username from ID

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000", // Your React app's origin
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json()); // For parsing JSON request bodies

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// --- Socket.IO Logic for Multi-User Chat ---
// Store connected users: Map<userId, socketId>
const onlineUsers = new Map(); // Stores userId -> socketId
const socketIdToUser = new Map(); // Stores socketId -> userId (for disconnect)

// Helper to get conversation ID for private chats
const getConversationId = (user1, user2) => {
  // Sort usernames alphabetically to ensure a consistent conversation ID
  return [user1, user2].sort().join('_');
};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // When a user logs in or connects, they send their username
  // This event should be emitted by the client after successful login/auth
  socket.on('registerUser', async (username) => {
    if (username) {
      onlineUsers.set(username, socket.id);
      socketIdToUser.set(socket.id, username);
      console.log(`${username} registered with socket ID: ${socket.id}`);
      // Broadcast updated online users list to all connected clients
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }
  });

  // Handle incoming messages (general or private)
  socket.on('sendMessage', async ({ sender, recipient, content }) => {
    try {
      let conversationId;
      if (recipient) {
        // Private message
        conversationId = getConversationId(sender, recipient);
      } else {
        // General chat message
        conversationId = 'general';
      }

      const newMessage = new Message({
        sender,
        recipient: recipient || null, // Store recipient for private messages
        content,
        conversationId
      });
      await newMessage.save();

      const messageData = {
        sender,
        recipient: recipient || null,
        content,
        timestamp: newMessage.timestamp,
        conversationId
      };

      if (recipient) {
        // Private message: emit only to sender and recipient
        const recipientSocketId = onlineUsers.get(recipient);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receiveMessage', messageData);
        }
        // Also emit to the sender's socket so they see their own message
        socket.emit('receiveMessage', messageData);
      } else {
        // General message: emit to all in the 'general' room (or all connected sockets)
        // For simplicity, we'll just emit to everyone for general chat
        io.emit('receiveMessage', messageData);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Handle user typing (optional)
  socket.on('typing', ({ username: typingUsername, recipient: typingRecipient }) => {
    if (typingRecipient) {
      const recipientSocketId = onlineUsers.get(typingRecipient);
      if (recipientSocketId) {
        // Emit typing event to the recipient only
        io.to(recipientSocketId).emit('userTyping', { username: typingUsername, recipient: typingRecipient });
      }
    } else {
      // General chat typing, emit to all
      socket.broadcast.emit('userTyping', { username: typingUsername });
    }
  });

  socket.on('stopTyping', ({ username: stopTypingUsername, recipient: stopTypingRecipient }) => {
    if (stopTypingRecipient) {
      const recipientSocketId = onlineUsers.get(stopTypingRecipient);
      if (recipientSocketId) {
        // Emit stop typing event to the recipient only
        io.to(recipientSocketId).emit('userStopTyping', { username: stopTypingUsername, recipient: stopTypingRecipient });
      }
    } else {
      // General chat stop typing, emit to all
      socket.broadcast.emit('userStopTyping', { username: stopTypingUsername });
    }
  });


  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const disconnectedUser = socketIdToUser.get(socket.id);
    if (disconnectedUser) {
      onlineUsers.delete(disconnectedUser);
      socketIdToUser.delete(socket.id);
      console.log(`${disconnectedUser} disconnected.`);
      // Broadcast updated online users list
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));