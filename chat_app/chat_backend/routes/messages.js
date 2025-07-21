const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const authMiddleware = require('../middleware/authMiddleware');

// Helper to get conversation ID (must match server.js logic)
const getConversationId = (user1, user2) => {
  return [user1, user2].sort().join('_');
};

// Get all general messages (for initial load of general chat)
router.get('/general', authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: 'general' }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get private messages between two users
router.get('/private/:otherUsername', authMiddleware, async (req, res) => {
  try {
    // req.user.username will be set by authMiddleware after token verification
    const currentUser = req.user.username; // Assuming username is stored in JWT payload
    const otherUser = req.params.otherUsername;

    const conversationId = getConversationId(currentUser, otherUser);

    const messages = await Message.find({ conversationId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
