// src/components/Chat.js
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Chat.css'; // Basic CSS for chat

const SOCKET_SERVER_URL = 'http://localhost:5000'; // Your backend Socket.IO URL

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [typingUsers, setTypingUsers] = useState({}); // { username: true } for general, { username: true } for private
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeChatPartner, setActiveChatPartner] = useState(null); // null for general chat, username for private chat
  const { username: currentUsername, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Function to scroll to the bottom of the messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to fetch messages based on active chat
  const fetchMessages = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      let res;
      if (activeChatPartner) {
        // Fetch private messages
        res = await axios.get(`${SOCKET_SERVER_URL}/api/messages/private/${activeChatPartner}`, {
          headers: { 'x-auth-token': token },
        });
      } else {
        // Fetch general messages
        res = await axios.get(`${SOCKET_SERVER_URL}/api/messages/general`, {
          headers: { 'x-auth-token': token },
        });
      }
      setMessages(res.data);
    } catch (err) {
      console.error('Error fetching messages:', err);
      // Handle unauthorized or other errors (e.g., logout)
      logout();
      navigate('/login');
    }
  }, [activeChatPartner, logout, navigate]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    // Register user with the backend socket server
    newSocket.on('connect', () => {
      if (currentUsername) {
        newSocket.emit('registerUser', currentUsername);
      }
    });

    // Listen for incoming messages (general or private)
    newSocket.on('receiveMessage', (message) => {
      // Only add message if it's for the currently active chat
      const isGeneralMessage = !message.recipient;
      const isPrivateMessageForMe = message.recipient === currentUsername && message.sender === activeChatPartner;
      const isPrivateMessageFromMe = message.sender === currentUsername && message.recipient === activeChatPartner;

      if (
        (isGeneralMessage && !activeChatPartner) || // General message and general chat is active
        (activeChatPartner && (isPrivateMessageForMe || isPrivateMessageFromMe)) // Private message for active chat
      ) {
        setMessages((prevMessages) => [...prevMessages, message]);
        // Clear typing status for the sender once message is received
        setTypingUsers((prev) => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[message.sender];
          return newTypingUsers;
        });
      }
    });

    // Listen for online users list updates
    newSocket.on('onlineUsers', (users) => {
      // Filter out the current user from the online list
      setOnlineUsers(users.filter(user => user !== currentUsername));
    });

    // Listen for typing events
    newSocket.on('userTyping', ({ username: typingUsername, recipient: typingRecipient }) => {
      // Only show typing indicator if it's for the active chat
      if ((!typingRecipient && !activeChatPartner) || // General chat typing
          (typingRecipient === currentUsername && typingUsername === activeChatPartner)) { // Private chat typing
        setTypingUsers((prev) => ({ ...prev, [typingUsername]: true }));
      }
    });

    newSocket.on('userStopTyping', ({ username: stopTypingUsername, recipient: stopTypingRecipient }) => {
      if ((!stopTypingRecipient && !activeChatPartner) ||
          (stopTypingRecipient === currentUsername && stopTypingUsername === activeChatPartner)) {
        setTypingUsers((prev) => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[stopTypingUsername];
          return newTypingUsers;
        });
      }
    });

    // Clean up on component unmount
    return () => {
      newSocket.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUsername, activeChatPartner, logout, navigate]); // Re-run effect if activeChatPartner changes

  // Fetch messages whenever activeChatPartner changes or on initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom of messages whenever messages or typing users update
  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && socket && currentUsername) {
      socket.emit('sendMessage', {
        sender: currentUsername,
        recipient: activeChatPartner, // Will be null for general chat
        content: newMessage
      });
      setNewMessage('');
      // Also send stop typing when message is sent
      socket.emit('stopTyping', {
        username: currentUsername,
        recipient: activeChatPartner
      });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socket && currentUsername) {
      if (!typingTimeoutRef.current) {
        socket.emit('typing', {
          username: currentUsername,
          recipient: activeChatPartner
        });
      }
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', {
          username: currentUsername,
          recipient: activeChatPartner
        });
        typingTimeoutRef.current = null;
      }, 1500); // Send stopTyping after 1.5 seconds of no typing
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSelectChat = (partnerUsername) => {
    setActiveChatPartner(partnerUsername);
    setMessages([]); // Clear messages when switching chat
    setTypingUsers({}); // Clear typing status
    setNewMessage(''); // Clear input field
  };

  const handleGoToGeneralChat = () => {
    setActiveChatPartner(null);
    setMessages([]); // Clear messages
    setTypingUsers({}); // Clear typing status
    setNewMessage(''); // Clear input field
  };

  const currentChatTitle = activeChatPartner ? `Chat with ${activeChatPartner}` : 'General Chat';

  return (
    <div className="chat-app-layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Online Users</h3>
        </div>
        <ul className="online-users-list">
          <li
            className={`online-user-item ${activeChatPartner === null ? 'active-chat' : ''}`}
            onClick={handleGoToGeneralChat}
          >
            # General Chat
          </li>
          {onlineUsers.length === 0 && (
            <li className="no-users-message">No other users online.</li>
          )}
          {onlineUsers.map((user) => (
            <li
              key={user}
              className={`online-user-item ${activeChatPartner === user ? 'active-chat' : ''}`}
              onClick={() => handleSelectChat(user)}
            >
              {user}
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <span>Logged in as: <strong>{currentUsername}</strong></span>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </div>

      <div className="chat-main-area">
        <div className="chat-header">
          <h2>{currentChatTitle}</h2>
        </div>
        <div className="messages-box">
          {messages.length === 0 && <div className="no-messages">No messages yet. Say hello!</div>}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.sender === currentUsername ? 'sent' : 'received'}`}
            >
              <strong>{msg.sender}:</strong> {msg.content}
              <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
          {Object.keys(typingUsers).length > 0 && (
            <div className="typing-indicator">
              {Object.keys(typingUsers).join(', ')} {Object.keys(typingUsers).length > 1 ? 'are' : 'is'} typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="message-input-form">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type your message..."
            className="message-input"
            disabled={!socket || !currentUsername} // Disable if not connected or not logged in
          />
          <button type="submit" className="send-button" disabled={!newMessage.trim() || !socket || !currentUsername}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
