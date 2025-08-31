const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const VoiceHandlers = require('./voiceHandlers');
const ModerationHandlers = require('./moderationHandlers');

let io;

const initializeSocket = (server) => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_2,
    process.env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      console.log('🔐 Socket authentication attempt:', {
        hasToken: !!token,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
        socketId: socket.id
      });
      
      if (!token) {
        // Allow anonymous connections for public spaces
        socket.userId = `anonymous_${socket.id}`;
        socket.isAnonymous = true;
        console.log('👤 Anonymous socket connection allowed:', socket.userId);
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔓 JWT decoded successfully:', {
        userId: decoded.user?.id,
        exp: new Date(decoded.exp * 1000)
      });
      
      const user = await User.findOne({ id: decoded.user.id });
      console.log('👤 User lookup result:', {
        found: !!user,
        userId: user?.id,
        role: user?.role,
        alias: user?.alias
      });
      
      if (!user) {
        console.log('❌ User not found in database');
        return next(new Error('Authentication error - user not found'));
      }

      socket.userId = user.id;
      socket.userAlias = user.alias;
      socket.userAvatarIndex = user.avatarIndex;
      socket.userRole = user.role; // Add role to socket for easy access
      socket.isAnonymous = false;
      
      console.log('✅ Socket authenticated successfully:', {
        userId: socket.userId,
        alias: socket.userAlias,
        role: socket.userRole
      });
      
      next();
    } catch (err) {
      console.error('❌ Socket authentication failed:', err.message);
      next(new Error('Authentication error - ' + err.message));
    }
  });

  // Initialize specialized handlers
  const voiceHandlers = new VoiceHandlers(io);
  const moderationHandlers = new ModerationHandlers(io);

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId} (${socket.userAlias || 'Anonymous'}) - Role: ${socket.userRole || 'unknown'}`);

    // Initialize voice and moderation handlers for this socket
    voiceHandlers.initializeHandlers(socket);
    moderationHandlers.initializeHandlers(socket);

    // Handle joining chat sessions
    socket.on('join_chat', async (data) => {
      const { sessionId, userType } = data;
      
      socket.join(`chat_${sessionId}`);
      socket.currentChatSession = sessionId;
      
      // Notify other participants
      socket.to(`chat_${sessionId}`).emit('user_joined', {
        userId: socket.userId,
        userAlias: socket.userAlias,
        userType,
        timestamp: new Date().toISOString()
      });
      
      console.log(`User ${socket.userId} joined chat session ${sessionId}`);
    });

    // Handle chat messages
    socket.on('send_message', async (data) => {
      const { sessionId, content, type = 'text', attachment } = data;
      
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sender: {
          id: socket.userId,
          alias: socket.userAlias || 'Anonymous',
          avatarIndex: socket.userAvatarIndex,
          isExpert: data.isExpert || false
        },
        content,
        type,
        attachment,
        timestamp: new Date().toISOString(),
        sessionId
      };

      // Broadcast to all participants in the session
      io.to(`chat_${sessionId}`).emit('new_message', message);
      
      // TODO: Save message to database
      console.log(`Message sent in session ${sessionId}:`, content);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { sessionId } = data;
      socket.to(`chat_${sessionId}`).emit('user_typing', {
        userId: socket.userId,
        userAlias: socket.userAlias,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { sessionId } = data;
      socket.to(`chat_${sessionId}`).emit('user_typing', {
        userId: socket.userId,
        userAlias: socket.userAlias,
        isTyping: false
      });
    });

    // Handle sanctuary spaces
    socket.on('join_sanctuary', async (data) => {
      const { sanctuaryId, participant } = data;
      
      socket.join(`sanctuary_${sanctuaryId}`);
      socket.currentSanctuary = sanctuaryId;
      
      // Notify other participants
      socket.to(`sanctuary_${sanctuaryId}`).emit('participant_joined', {
        participant: {
          id: socket.userId,
          alias: participant.alias || socket.userAlias || 'Anonymous',
          joinedAt: new Date().toISOString(),
          isAnonymous: socket.isAnonymous || participant.isAnonymous
        }
      });
      
      console.log(`User ${socket.userId} joined sanctuary ${sanctuaryId}`);
    });

    // Handle joining sanctuary as host for real-time inbox updates
    socket.on('join_sanctuary_host', async (data) => {
      const { sanctuaryId, hostToken } = data;
      
      // Verify host authorization
      const SanctuarySession = require('../models/SanctuarySession');
      const HostSession = require('../models/HostSession');
      let session;
      let isAuthorized = false;
      
      console.log(`Attempting host auth for sanctuary ${sanctuaryId}`, { 
        hostToken: hostToken ? 'provided' : 'none',
        userId: socket.userId,
        isAnonymous: socket.isAnonymous
      });
      
      // Check host token first (for anonymous hosts)
      if (hostToken) {
        session = await SanctuarySession.findOne({ 
          id: sanctuaryId,
          hostToken
        });
        
        if (session) {
          isAuthorized = true;
          console.log(`Host authenticated via hostToken for sanctuary ${sanctuaryId}`);
        } else {
          // Check if host session exists in HostSession model
          const hostSession = await HostSession.findOne({
            sanctuaryId,
            hostToken,
            isActive: true,
            expiresAt: { $gt: new Date() }
          });
          
          if (hostSession) {
            session = await SanctuarySession.findOne({ id: sanctuaryId });
            isAuthorized = true;
            console.log(`Host authenticated via HostSession for sanctuary ${sanctuaryId}`);
          }
        }
      }
      
      // Check authenticated user ownership
      if (!isAuthorized && !socket.isAnonymous) {
        session = await SanctuarySession.findOne({
          id: sanctuaryId,
          hostId: socket.userId
        });
        if (session) {
          isAuthorized = true;
          console.log(`Host authenticated via userId for sanctuary ${sanctuaryId}`);
        }
      }
      
      if (session && isAuthorized) {
        socket.join(`sanctuary_host_${sanctuaryId}`);
        socket.currentSanctuaryHost = sanctuaryId;
        
        // Update host session last access
        if (hostToken) {
          await HostSession.updateOne(
            { sanctuaryId, hostToken },
            { lastAccessedAt: new Date() }
          );
        }
        
        // Send current submissions count and session info
        socket.emit('sanctuary_host_joined', {
          sanctuaryId,
          submissionsCount: session.submissions?.length || 0,
          lastActivity: session.submissions?.length > 0 ? 
            session.submissions[session.submissions.length - 1].timestamp : 
            session.createdAt,
          sessionInfo: {
            topic: session.topic,
            description: session.description,
            emoji: session.emoji,
            expiresAt: session.expiresAt,
            mode: session.mode
          }
        });
        
        console.log(`Host ${socket.userId} joined sanctuary host room ${sanctuaryId} with ${session.submissions?.length || 0} submissions`);
      } else {
        console.log(`Host auth failed for sanctuary ${sanctuaryId}`, { 
          sessionFound: !!session,
          isAuthorized 
        });
        socket.emit('sanctuary_host_auth_failed', {
          sanctuaryId,
          error: 'Not authorized as host for this sanctuary'
        });
      }
    });

    socket.on('sanctuary_message', async (data) => {
      const { sanctuaryId, content, type = 'text' } = data;
      
      const message = {
        id: `sanctuary_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        participantId: socket.userId,
        participantAlias: data.participantAlias || socket.userAlias || 'Anonymous',
        content,
        type,
        timestamp: new Date().toISOString()
      };

      // Broadcast to all participants in the sanctuary
      io.to(`sanctuary_${sanctuaryId}`).emit('sanctuary_new_message', message);
      
      console.log(`Sanctuary message in ${sanctuaryId}:`, content);
    });

    // Handle live audio room events
    socket.on('join_audio_room', (data) => {
      const { sessionId, participant } = data;
      
      socket.join(`audio_room_${sessionId}`);
      socket.currentAudioRoom = sessionId;
      
      // Notify others of participant joining
      socket.to(`audio_room_${sessionId}`).emit('audio_participant_joined', {
        participant: {
          id: socket.userId,
          alias: participant.alias || socket.userAlias || 'Anonymous',
          isHost: participant.isHost || false,
          isModerator: participant.isModerator || false,
          joinedAt: new Date().toISOString()
        }
      });
      
      console.log(`User ${socket.userId} joined audio room ${sessionId}`);
    });

    socket.on('raise_hand', (data) => {
      const { sessionId, isRaised } = data;
      
      socket.to(`audio_room_${sessionId}`).emit('hand_raised', {
        participantId: socket.userId,
        participantAlias: socket.userAlias || 'Anonymous',
        isRaised,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('promote_to_speaker', (data) => {
      const { sessionId, participantId } = data;
      
      // Find target user's socket
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId === participantId);
      
      if (targetSocket) {
        targetSocket.emit('promoted_to_speaker', {
          sessionId,
          promotedBy: socket.userId,
          timestamp: new Date().toISOString()
        });
        
        // Notify room
        io.to(`audio_room_${sessionId}`).emit('speaker_promoted', {
          participantId,
          promotedBy: socket.userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('mute_participant', (data) => {
      const { sessionId, participantId } = data;
      
      // Find target user's socket
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId === participantId);
      
      if (targetSocket) {
        targetSocket.emit('force_muted', {
          sessionId,
          mutedBy: socket.userId,
          timestamp: new Date().toISOString()
        });
        
        // Notify room
        io.to(`audio_room_${sessionId}`).emit('participant_muted', {
          participantId,
          mutedBy: socket.userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('kick_participant', (data) => {
      const { sessionId, participantId } = data;
      
      // Find target user's socket
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId === participantId);
      
      if (targetSocket) {
        targetSocket.emit('kicked_from_room', {
          sessionId,
          kickedBy: socket.userId,
          timestamp: new Date().toISOString()
        });
        
        targetSocket.leave(`audio_room_${sessionId}`);
        
        // Notify room
        socket.to(`audio_room_${sessionId}`).emit('participant_kicked', {
          participantId,
          kickedBy: socket.userId,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('send_emoji_reaction', (data) => {
      const { sessionId, emoji } = data;
      
      socket.to(`audio_room_${sessionId}`).emit('emoji_reaction', {
        participantId: socket.userId,
        participantAlias: socket.userAlias || 'Anonymous',
        emoji,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('emergency_alert', (data) => {
      const { sessionId, alertType, message } = data;
      
      // Send to all participants and moderators
      io.to(`audio_room_${sessionId}`).emit('emergency_alert', {
        alertType,
        message,
        fromParticipant: socket.userId,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Emergency alert in ${sessionId}: ${alertType} - ${message}`);
    });

    // Handle voice chat requests
    socket.on('request_voice_chat', (data) => {
      const { targetUserId, sessionId } = data;
      
      // Find target user's socket
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId === targetUserId);
      
      if (targetSocket) {
        targetSocket.emit('voice_chat_request', {
          fromUserId: socket.userId,
          fromUserAlias: socket.userAlias,
          sessionId,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('voice_chat_response', (data) => {
      const { targetUserId, accepted, sessionId } = data;
      
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId === targetUserId);
      
      if (targetSocket) {
        targetSocket.emit('voice_chat_response', {
          fromUserId: socket.userId,
          fromUserAlias: socket.userAlias,
          accepted,
          sessionId,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle connection quality monitoring
    socket.on('ping_sanctuary', (data) => {
      socket.emit('pong_sanctuary', {
        ...data,
        serverTime: new Date().toISOString()
      });
    });

    // Handle message read receipts for sanctuary
    socket.on('sanctuary_message_read', (data) => {
      const { sanctuaryId, messageId, hostToken } = data;
      
      // Verify host and emit read receipt
      socket.to(`sanctuary_${sanctuaryId}`).emit('sanctuary_message_status', {
        messageId,
        status: 'read',
        timestamp: new Date().toISOString()
      });
    });

    // Handle admin panel join for real-time notifications
    socket.on('join_admin_panel', async (data) => {
      console.log('🔑 Admin attempting to join admin panel channel...', {
        socketUserId: socket.userId,
        socketAlias: socket.userAlias,
        data: data
      });
      
      try {
        // Verify admin role - check both socket user and provided data user
        let user = await User.findOne({ id: socket.userId });
        
        // If socket user doesn't match the provided data, check if provided user exists and is admin
        if (!user || user.role !== 'admin') {
          console.log('🔄 Socket user not admin, checking provided user data...');
          if (data?.userId) {
            user = await User.findOne({ id: data.userId, role: 'admin' });
          }
        }
        
        console.log('👤 User lookup result:', {
          socketUserId: socket.userId,
          providedUserId: data?.userId,
          found: !!user,
          userId: user?.id,
          role: user?.role,
          alias: user?.alias,
          email: user?.email
        });
        
        if (user && user.role === 'admin') {
          socket.join('admin_panel');
          
          // Get room info for debugging
          const adminRoom = io.sockets.adapter.rooms.get('admin_panel');
          const connectedAdmins = adminRoom ? adminRoom.size : 0;
          
          console.log(`✅ Admin ${socket.userId} (${user.alias}) successfully joined admin panel`, {
            connectedAdmins,
            roomSize: connectedAdmins,
            timestamp: new Date().toISOString()
          });
          
          // Send confirmation back to client
          socket.emit('admin_panel_joined', { 
            success: true, 
            connectedAdmins,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log(`❌ User ${socket.userId} denied access to admin panel`, {
            userFound: !!user,
            role: user?.role || 'unknown',
            expected: 'admin'
          });
          socket.emit('admin_panel_joined', { 
            success: false, 
            error: 'Insufficient permissions - admin role required' 
          });
        }
      } catch (error) {
        console.error('❌ Error in join_admin_panel:', error);
        socket.emit('admin_panel_joined', { 
          success: false, 
          error: 'Database error occurred' 
        });
      }
    });

    // Handle expert joining for notifications
    socket.on('join_expert_notifications', async (data) => {
      const { expertId } = data;
      if (expertId) {
        socket.join(`expert_${expertId}`);
        console.log(`Expert ${expertId} joined for notifications`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      // Leave current chat session
      if (socket.currentChatSession) {
        socket.to(`chat_${socket.currentChatSession}`).emit('user_left', {
          userId: socket.userId,
          userAlias: socket.userAlias,
          timestamp: new Date().toISOString()
        });
      }
      
      // Leave current sanctuary
      if (socket.currentSanctuary) {
        socket.to(`sanctuary_${socket.currentSanctuary}`).emit('participant_left', {
          participantId: socket.userId,
          participantAlias: socket.userAlias,
          timestamp: new Date().toISOString()
        });
      }

      // Leave current sanctuary host room
      if (socket.currentSanctuaryHost) {
        console.log(`Host ${socket.userId} left sanctuary host room ${socket.currentSanctuaryHost}`);
      }
      
      // Leave current audio room
      if (socket.currentAudioRoom) {
        socket.to(`audio_room_${socket.currentAudioRoom}`).emit('audio_participant_left', {
          participantId: socket.userId,
          participantAlias: socket.userAlias,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle message delivery confirmations
    socket.on('message_delivered', (data) => {
      const { messageId, sessionId } = data;
      socket.to(`chat_${sessionId}`).emit('message_status_update', {
        messageId,
        status: 'delivered',
        userId: socket.userId
      });
    });

    socket.on('message_read', (data) => {
      const { messageId, sessionId } = data;
      socket.to(`chat_${sessionId}`).emit('message_status_update', {
        messageId,
        status: 'read',
        userId: socket.userId
      });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Notification functions for real-time updates
const notifyExpertApplicationSubmitted = (expertData) => {
  console.log('🚀 notifyExpertApplicationSubmitted called with:', expertData);
  if (!io) {
    console.error('❌ Socket.io instance not available for expert application notification');
    return;
  }

  // Get connected admins for debugging
  const adminRoom = io.sockets.adapter.rooms.get('admin_panel');
  const connectedAdmins = adminRoom ? adminRoom.size : 0;
  
  console.log(`📊 Admin panel room status:`, {
    roomName: 'admin_panel',
    connectedAdmins,
    hasRoom: !!adminRoom
  });
  
  if (connectedAdmins === 0) {
    console.warn('⚠️  No admins connected to admin_panel room - notification will not be delivered in real-time');
  }

  // Notify all admins about new expert application
  const notificationData = {
    expert: expertData,
    timestamp: new Date().toISOString(),
    type: 'new_application'
  };
  
  io.to('admin_panel').emit('expert_application_submitted', notificationData);
  
  console.log('✅ Expert application notification sent to admin_panel room:', {
    expertId: expertData.id,
    expertEmail: expertData.email,
    connectedAdmins,
    timestamp: notificationData.timestamp
  });
};

const notifyExpertStatusUpdate = (expertId, status, adminNotes) => {
  if (io) {
    // Notify specific expert about status change
    io.to(`expert_${expertId}`).emit('expert_status_updated', {
      status,
      adminNotes,
      timestamp: new Date().toISOString(),
      type: 'status_update'
    });
    
    // Also notify all admins about the status change
    io.to('admin_panel').emit('expert_status_changed', {
      expertId,
      status,
      adminNotes,
      timestamp: new Date().toISOString(),
      type: 'status_change'
    });
    
    console.log(`Notified expert ${expertId} of status update:`, status);
  }
};

const notifyAdminPanelUpdate = (data) => {
  if (io) {
    io.to('admin_panel').emit('admin_panel_update', {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

// Fix: Export the notification functions
module.exports = { 
  initializeSocket, 
  getIO, 
  notifyExpertApplicationSubmitted,
  notifyExpertStatusUpdate,
  notifyAdminPanelUpdate,
  // Ensure io instance is accessible for notifications
  get socketInstance() { return io; }
};