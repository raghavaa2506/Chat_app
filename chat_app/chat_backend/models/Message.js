// models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: String, // Username of the sender
    required: true
  },
  recipient: {
    type: String, // Username of the recipient (for private messages)
    default: null // Null for general chat messages
  },
  content: {
    type: String,
    required: true
  },
  // We can use a combination of sender and recipient (sorted alphabetically)
  // to form a unique conversation ID for private chats.
  // For general chat, this can be 'general'
  conversationId: {
    type: String,
    required: true,
    index: true // Index for faster queries
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);