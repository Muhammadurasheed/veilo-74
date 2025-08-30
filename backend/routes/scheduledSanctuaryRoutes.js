const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { validate } = require('../middleware/validation');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const ScheduledLiveSanctuary = require('../models/ScheduledLiveSanctuary');
const LiveSanctuarySession = require('../models/LiveSanctuarySession');
const { generateRtcToken } = require('../utils/agoraTokenGenerator');
const { nanoid } = require('nanoid');

// Create scheduled sanctuary session
router.post('/', 
  authMiddleware,
  validate([
    body('topic').isLength({ min: 3, max: 200 }).trim(),
    body('scheduledDateTime').isISO8601().custom(value => {
      if (new Date(value) <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
      return true;
    }),
    body('estimatedDuration').isInt({ min: 15, max: 480 }),
    body('maxParticipants').optional().isInt({ min: 2, max: 200 }),
    body('accessMode').optional().isIn(['public', 'invite_only', 'private'])
  ]),
  async (req, res) => {
    try {
      const {
        topic,
        description,
        emoji,
        scheduledDateTime,
        estimatedDuration,
        timezone = 'UTC',
        maxParticipants = 50,
        allowAnonymous = true,
        audioOnly = true,
        moderationEnabled = true,
        moderationLevel = 'medium',
        emergencyContactEnabled = true,
        aiMonitoring = true,
        voiceModulationEnabled = true,
        recordingEnabled = false,
        accessMode = 'public',
        allowEarlyJoin = false,
        earlyJoinBuffer = 15,
        registrationRequired = false,
        registrationDeadline,
        tags = [],
        language = 'en',
        targetAudience,
        difficulty = 'all'
      } = req.body;

      console.log('📅 Creating scheduled sanctuary:', {
        topic,
        scheduledDateTime,
        hostId: req.user.id,
        accessMode
      });

      // Generate unique identifiers
      const sessionId = `scheduled-sanctuary-${nanoid(8)}`;
      const channelName = `sanctuary_${sessionId}`;
      const invitationCode = nanoid(8).toUpperCase();

      // Create scheduled session
      const scheduledSession = new ScheduledLiveSanctuary({
        id: sessionId,
        topic: topic.trim(),
        description: description?.trim(),
        emoji: emoji || '🎙️',
        hostId: req.user.id,
        hostAlias: req.user.alias || `Host_${nanoid(4)}`,
        hostEmail: req.user.email,
        scheduledDateTime: new Date(scheduledDateTime),
        estimatedDuration,
        timezone,
        maxParticipants,
        allowAnonymous,
        audioOnly,
        moderationEnabled,
        moderationLevel,
        emergencyContactEnabled,
        aiMonitoring,
        voiceModulationEnabled,
        recordingEnabled,
        recordingConsentRequired: recordingEnabled,
        accessMode,
        invitationCode,
        allowEarlyJoin,
        earlyJoinBuffer,
        registrationRequired,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        agoraChannelName: channelName,
        agoraAppId: process.env.AGORA_APP_ID,
        tags,
        language,
        targetAudience,
        difficulty,
        status: 'scheduled'
      });

      await scheduledSession.save();

      console.log('✅ Scheduled sanctuary created:', {
        sessionId,
        scheduledDateTime,
        invitationCode
      });

      // Return response
      res.success({
        session: {
          id: scheduledSession.id,
          topic: scheduledSession.topic,
          description: scheduledSession.description,
          emoji: scheduledSession.emoji,
          hostId: scheduledSession.hostId,
          hostAlias: scheduledSession.hostAlias,
          scheduledDateTime: scheduledSession.scheduledDateTime,
          estimatedDuration: scheduledSession.estimatedDuration,
          timezone: scheduledSession.timezone,
          maxParticipants: scheduledSession.maxParticipants,
          accessMode: scheduledSession.accessMode,
          invitationCode: scheduledSession.invitationCode,
          invitationUrl: scheduledSession.invitationUrl,
          allowEarlyJoin: scheduledSession.allowEarlyJoin,
          earlyJoinBuffer: scheduledSession.earlyJoinBuffer,
          registrationRequired: scheduledSession.registrationRequired,
          registrationDeadline: scheduledSession.registrationDeadline,
          tags: scheduledSession.tags,
          language: scheduledSession.language,
          status: scheduledSession.status,
          canStart: scheduledSession.canStart,
          isStartingSoon: scheduledSession.isStartingSoon,
          registeredParticipants: scheduledSession.registeredParticipants.length
        }
      }, 'Scheduled sanctuary created successfully');

    } catch (error) {
      console.error('❌ Failed to create scheduled sanctuary:', error);
      res.error('Failed to create scheduled sanctuary: ' + error.message, 500);
    }
  }
);

// Get scheduled sanctuary details
router.get('/:sessionId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { includeParticipants = false } = req.query;
    
    console.log('🔍 Fetching scheduled sanctuary:', sessionId);
    
    const session = await ScheduledLiveSanctuary.findOne({ id: sessionId });
    
    if (!session) {
      return res.error('Scheduled sanctuary not found', 404);
    }

    // Check if user has access to view details
    const isHost = req.user?.id === session.hostId;
    const isAdmin = req.user?.role === 'admin';
    
    const response = {
      id: session.id,
      topic: session.topic,
      description: session.description,
      emoji: session.emoji,
      hostAlias: session.hostAlias,
      scheduledDateTime: session.scheduledDateTime,
      estimatedDuration: session.estimatedDuration,
      timezone: session.timezone,
      maxParticipants: session.maxParticipants,
      allowAnonymous: session.allowAnonymous,
      audioOnly: session.audioOnly,
      moderationEnabled: session.moderationEnabled,
      emergencyContactEnabled: session.emergencyContactEnabled,
      voiceModulationEnabled: session.voiceModulationEnabled,
      recordingEnabled: session.recordingEnabled,
      accessMode: session.accessMode,
      allowEarlyJoin: session.allowEarlyJoin,
      earlyJoinBuffer: session.earlyJoinBuffer,
      registrationRequired: session.registrationRequired,
      registrationDeadline: session.registrationDeadline,
      tags: session.tags,
      language: session.language,
      targetAudience: session.targetAudience,
      difficulty: session.difficulty,
      status: session.status,
      liveSessionId: session.liveSessionId,
      actualStartTime: session.actualStartTime,
      registeredCount: session.registeredParticipants.length,
      canStart: session.canStart,
      isStartingSoon: session.isStartingSoon,
      createdAt: session.createdAt
    };

    // Include sensitive data only for host/admin
    if (isHost || isAdmin) {
      response.hostId = session.hostId;
      response.invitationCode = session.invitationCode;
      response.invitationUrl = session.invitationUrl;
      response.analytics = session.analytics;
      
      if (includeParticipants === 'true') {
        response.registeredParticipants = session.registeredParticipants;
      }
    }

    res.success({ session: response }, 'Scheduled sanctuary retrieved');

  } catch (error) {
    console.error('❌ Failed to fetch scheduled sanctuary:', error);
    res.error('Failed to fetch scheduled sanctuary: ' + error.message, 500);
  }
});

// Register for scheduled sanctuary
router.post('/:sessionId/register', 
  authMiddleware,
  validate([
    body('voicePreference').optional().isString(),
    body('specialRequests').optional().isString().isLength({ max: 500 })
  ]),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { voicePreference, specialRequests } = req.body;
      
      console.log('📝 User registering for sanctuary:', {
        sessionId,
        userId: req.user.id
      });

      const session = await ScheduledLiveSanctuary.findOne({ id: sessionId });
      
      if (!session) {
        return res.error('Scheduled sanctuary not found', 404);
      }

      if (session.status !== 'scheduled') {
        return res.error('Registration not available for this session', 400);
      }

      const result = session.addParticipant({
        userId: req.user.id,
        userAlias: req.user.alias,
        userEmail: req.user.email,
        voicePreference,
        specialRequests
      });

      if (!result.success) {
        return res.error(result.message, 400);
      }

      await session.save();

      console.log('✅ User registered successfully:', {
        sessionId,
        userId: req.user.id,
        totalRegistered: session.registeredParticipants.length
      });

      res.success({
        registered: true,
        totalRegistered: session.registeredParticipants.length,
        maxParticipants: session.maxParticipants
      }, 'Successfully registered for sanctuary');

    } catch (error) {
      console.error('❌ Registration failed:', error);
      res.error('Registration failed: ' + error.message, 500);
    }
  }
);

// Unregister from scheduled sanctuary
router.delete('/:sessionId/register', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await ScheduledLiveSanctuary.findOne({ id: sessionId });
    
    if (!session) {
      return res.error('Scheduled sanctuary not found', 404);
    }

    const result = session.removeParticipant(req.user.id);
    
    if (!result.success) {
      return res.error(result.message, 400);
    }

    await session.save();

    res.success({
      unregistered: true,
      totalRegistered: session.registeredParticipants.length
    }, 'Successfully unregistered from sanctuary');

  } catch (error) {
    console.error('❌ Unregistration failed:', error);
    res.error('Unregistration failed: ' + error.message, 500);
  }
});

// Start scheduled sanctuary (transition to live)
router.post('/:sessionId/start', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('🚀 Starting scheduled sanctuary:', {
      sessionId,
      userId: req.user.id
    });

    const scheduledSession = await ScheduledLiveSanctuary.findOne({ id: sessionId });
    
    if (!scheduledSession) {
      return res.error('Scheduled sanctuary not found', 404);
    }

    // Check authorization
    if (scheduledSession.hostId !== req.user.id && req.user.role !== 'admin') {
      return res.error('Only the host can start this session', 403);
    }

    // Check if can start
    if (!scheduledSession.canStart) {
      return res.error('Session cannot be started yet', 400);
    }

    if (scheduledSession.status !== 'scheduled' && scheduledSession.status !== 'ready') {
      return res.error('Session already started or ended', 400);
    }

    // Generate Agora tokens
    const expireTime = scheduledSession.estimatedDuration * 60; // Convert to seconds
    let agoraToken, hostToken;
    
    try {
      agoraToken = generateRtcToken(scheduledSession.agoraChannelName, 0, 'subscriber', expireTime);
      hostToken = generateRtcToken(scheduledSession.agoraChannelName, req.user.id, 'publisher', expireTime);
    } catch (agoraError) {
      console.warn('⚠️ Agora token generation failed:', agoraError.message);
      agoraToken = `temp_token_${nanoid(16)}`;
      hostToken = `temp_host_token_${nanoid(16)}`;
    }

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + scheduledSession.estimatedDuration);

    // Create live sanctuary session
    const liveSession = new LiveSanctuarySession({
      id: `live-${scheduledSession.id}`,
      topic: scheduledSession.topic,
      description: scheduledSession.description,
      emoji: scheduledSession.emoji,
      hostId: scheduledSession.hostId,
      hostAlias: scheduledSession.hostAlias,
      hostToken,
      agoraChannelName: scheduledSession.agoraChannelName,
      agoraToken,
      expiresAt,
      maxParticipants: scheduledSession.maxParticipants,
      currentParticipants: 1,
      allowAnonymous: scheduledSession.allowAnonymous,
      audioOnly: scheduledSession.audioOnly,
      moderationEnabled: scheduledSession.moderationEnabled,
      moderationLevel: scheduledSession.moderationLevel,
      emergencyContactEnabled: scheduledSession.emergencyContactEnabled,
      aiMonitoring: scheduledSession.aiMonitoring,
      estimatedDuration: scheduledSession.estimatedDuration,
      tags: scheduledSession.tags,
      language: scheduledSession.language,
      isRecorded: scheduledSession.recordingEnabled,
      status: 'active',
      participants: [{
        id: req.user.id,
        alias: scheduledSession.hostAlias,
        isHost: true,
        isModerator: true,
        isMuted: false,
        isBlocked: false,
        handRaised: false,
        joinedAt: new Date(),
        avatarIndex: req.user.avatarIndex || 1,
        connectionStatus: 'connected',
        audioLevel: 0,
        speakingTime: 0
      }]
    });

    await liveSession.save();

    // Update scheduled session
    await scheduledSession.transitionToLive(liveSession);

    console.log('✅ Scheduled sanctuary started as live session:', {
      scheduledId: sessionId,
      liveId: liveSession.id
    });

    res.success({
      liveSession: {
        id: liveSession.id,
        topic: liveSession.topic,
        description: liveSession.description,
        emoji: liveSession.emoji,
        hostId: liveSession.hostId,
        hostAlias: liveSession.hostAlias,
        agoraChannelName: liveSession.agoraChannelName,
        agoraToken: liveSession.agoraToken,
        hostToken: liveSession.hostToken,
        expiresAt: liveSession.expiresAt,
        maxParticipants: liveSession.maxParticipants,
        status: liveSession.status,
        participants: liveSession.participants
      },
      redirectUrl: `/sanctuary/live/${liveSession.id}?role=host`
    }, 'Scheduled sanctuary started successfully');

  } catch (error) {
    console.error('❌ Failed to start scheduled sanctuary:', error);
    res.error('Failed to start sanctuary: ' + error.message, 500);
  }
});

// Join scheduled sanctuary with invitation
router.post('/:sessionId/join', 
  optionalAuthMiddleware,
  validate([
    body('invitationCode').optional().isString(),
    body('alias').optional().isString().isLength({ min: 2, max: 50 }),
    body('isAnonymous').optional().isBoolean()
  ]),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { invitationCode, alias, isAnonymous = false } = req.body;
      
      console.log('🚪 User attempting to join scheduled sanctuary:', {
        sessionId,
        userId: req.user?.id || 'anonymous',
        hasInviteCode: !!invitationCode
      });

      const scheduledSession = await ScheduledLiveSanctuary.findOne({ id: sessionId });
      
      if (!scheduledSession) {
        return res.error('Scheduled sanctuary not found', 404);
      }

      // Check if user can join
      const accessCheck = scheduledSession.canUserJoin(req.user?.id, invitationCode);
      if (!accessCheck.canJoin) {
        return res.error(accessCheck.reason, 403);
      }

      // If session is live, redirect to live session
      if (scheduledSession.status === 'live' && scheduledSession.liveSessionId) {
        return res.success({
          redirectToLive: true,
          liveSessionId: scheduledSession.liveSessionId,
          redirectUrl: `/sanctuary/live/${scheduledSession.liveSessionId}`
        }, 'Session is live, redirecting');
      }

      // If session is not ready yet, show waiting room
      if (scheduledSession.status === 'scheduled' && !scheduledSession.isStartingSoon) {
        const waitTime = Math.ceil((scheduledSession.scheduledDateTime - new Date()) / 60000); // minutes
        
        return res.success({
          waiting: true,
          scheduledDateTime: scheduledSession.scheduledDateTime,
          waitTime,
          session: {
            id: scheduledSession.id,
            topic: scheduledSession.topic,
            description: scheduledSession.description,
            emoji: scheduledSession.emoji,
            hostAlias: scheduledSession.hostAlias,
            estimatedDuration: scheduledSession.estimatedDuration,
            maxParticipants: scheduledSession.maxParticipants,
            registeredCount: scheduledSession.registeredParticipants.length
          }
        }, 'Session not started yet');
      }

      // If ready to join, provide session access
      res.success({
        canJoin: true,
        session: {
          id: scheduledSession.id,
          topic: scheduledSession.topic,
          description: scheduledSession.description,
          emoji: scheduledSession.emoji,
          hostAlias: scheduledSession.hostAlias,
          scheduledDateTime: scheduledSession.scheduledDateTime,
          isStartingSoon: scheduledSession.isStartingSoon,
          canStart: scheduledSession.canStart
        },
        userAccess: {
          isHost: req.user?.id === scheduledSession.hostId,
          isRegistered: scheduledSession.registeredParticipants.some(p => p.userId === req.user?.id),
          canUseVoiceModulation: scheduledSession.voiceModulationEnabled
        }
      }, 'Ready to join sanctuary');

    } catch (error) {
      console.error('❌ Failed to join scheduled sanctuary:', error);
      res.error('Failed to join sanctuary: ' + error.message, 500);
    }
  }
);

// Get upcoming scheduled sanctuaries
router.get('/', 
  validate([
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('page').optional().isInt({ min: 1 }),
    query('accessMode').optional().isIn(['public', 'invite_only']),
    query('language').optional().isString(),
    query('tags').optional().isString()
  ]),
  async (req, res) => {
    try {
      const {
        limit = 20,
        page = 1,
        accessMode,
        language,
        tags
      } = req.query;

      console.log('📋 Fetching upcoming scheduled sanctuaries');

      // Build query
      const query = {
        scheduledDateTime: { $gte: new Date() },
        status: { $in: ['scheduled', 'ready'] }
      };

      if (accessMode) {
        query.accessMode = accessMode;
      } else {
        // Only show public and invite_only by default
        query.accessMode = { $ne: 'private' };
      }

      if (language) {
        query.language = language;
      }

      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        query.tags = { $in: tagArray };
      }

      const sessions = await ScheduledLiveSanctuary.find(query)
        .sort({ scheduledDateTime: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .select({
          id: 1,
          topic: 1,
          description: 1,
          emoji: 1,
          hostAlias: 1,
          scheduledDateTime: 1,
          estimatedDuration: 1,
          timezone: 1,
          maxParticipants: 1,
          allowAnonymous: 1,
          audioOnly: 1,
          moderationEnabled: 1,
          voiceModulationEnabled: 1,
          accessMode: 1,
          registrationRequired: 1,
          tags: 1,
          language: 1,
          targetAudience: 1,
          difficulty: 1,
          status: 1,
          registeredParticipants: 1,
          createdAt: 1
        });

      const total = await ScheduledLiveSanctuary.countDocuments(query);

      const sessionsWithCounts = sessions.map(session => ({
        ...session.toObject(),
        registeredCount: session.registeredParticipants.length,
        registeredParticipants: undefined, // Remove participant details
        isStartingSoon: session.isStartingSoon,
        canStart: session.canStart
      }));

      res.success({
        sessions: sessionsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }, 'Upcoming scheduled sanctuaries retrieved');

    } catch (error) {
      console.error('❌ Failed to fetch scheduled sanctuaries:', error);
      res.error('Failed to fetch scheduled sanctuaries: ' + error.message, 500);
    }
  }
);

module.exports = router;