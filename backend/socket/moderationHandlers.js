const AIModerationService = require('../services/aiModerationService');
const RedisSessionManager = require('../services/redisSessionManager');

class ModerationHandlers {
  constructor(io) {
    this.io = io;
    this.moderationService = new AIModerationService();
    this.sessionManager = new RedisSessionManager();
  }

  // Initialize moderation-related socket handlers
  initializeHandlers(socket) {
    // Real-time content moderation for chat messages
    socket.on('sanctuary_message', async (data) => {
      try {
        const { sanctuaryId, content, type = 'text' } = data;
        
        // AI moderation check
        const moderationResult = await this.moderationService.moderateContent(content, {
          participantId: socket.userId,
          sessionId: sanctuaryId,
          contentType: type,
          participantHistory: await this.sessionManager.getParticipantHistory(sanctuaryId, socket.userId)
        });

        const message = {
          id: `sanctuary_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          participantId: socket.userId,
          participantAlias: data.participantAlias || socket.userAlias || 'Anonymous',
          content,
          type,
          timestamp: new Date().toISOString(),
          moderationScore: moderationResult.overallScore,
          flagged: moderationResult.shouldFlag
        };

        // Store message for analysis
        await this.sessionManager.addMessage(sanctuaryId, message);

        // Handle based on moderation result
        if (moderationResult.shouldBlock) {
          // Block message entirely
          socket.emit('message_blocked', {
            messageId: message.id,
            reason: moderationResult.reason,
            alternatives: moderationResult.suggestedAlternatives
          });

          // Alert moderators
          this.io.to(`sanctuary_moderators_${sanctuaryId}`).emit('content_blocked', {
            participantId: socket.userId,
            content,
            reason: moderationResult.reason,
            severity: moderationResult.severity,
            timestamp: new Date().toISOString()
          });

        } else if (moderationResult.shouldFlag) {
          // Send message but flag for review
          this.io.to(`sanctuary_${sanctuaryId}`).emit('sanctuary_new_message', message);

          // Alert moderators
          this.io.to(`sanctuary_moderators_${sanctuaryId}`).emit('content_flagged', {
            message,
            moderationResult,
            requiresReview: true
          });

          // Auto-escalate high severity flags
          if (moderationResult.severity === 'critical') {
            this.handleCriticalAlert(sanctuaryId, socket, moderationResult);
          }

        } else {
          // Send message normally
          this.io.to(`sanctuary_${sanctuaryId}`).emit('sanctuary_new_message', message);
        }

        console.log(`Message moderated for ${socket.userId} in ${sanctuaryId}: ${moderationResult.overallScore}/100`);

      } catch (error) {
        console.error('Message moderation error:', error);
        // On error, send message with manual review flag
        const message = {
          id: `sanctuary_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          participantId: socket.userId,
          participantAlias: data.participantAlias || socket.userAlias || 'Anonymous',
          content: data.content,
          type: data.type || 'text',
          timestamp: new Date().toISOString(),
          requiresManualReview: true
        };
        
        this.io.to(`sanctuary_${data.sanctuaryId}`).emit('sanctuary_new_message', message);
      }
    });

    // Voice transcription for AI moderation
    socket.on('voice_transcription', async (data) => {
      try {
        const { sessionId, transcription, confidence } = data;
        
        if (confidence < 0.7) return; // Only moderate high-confidence transcriptions
        
        const moderationResult = await this.moderationService.moderateContent(transcription, {
          participantId: socket.userId,
          sessionId,
          contentType: 'voice_transcription',
          confidence
        });

        if (moderationResult.shouldFlag || moderationResult.severity === 'critical') {
          // Alert moderators
          this.io.to(`sanctuary_moderators_${sessionId}`).emit('voice_content_flagged', {
            participantId: socket.userId,
            participantAlias: socket.userAlias,
            transcription,
            moderationResult,
            timestamp: new Date().toISOString()
          });

          // Critical content handling
          if (moderationResult.severity === 'critical') {
            await this.handleCriticalAlert(sessionId, socket, moderationResult);
          }
        }

        // Store transcription for session analytics
        await this.sessionManager.addVoiceTranscription(sessionId, {
          participantId: socket.userId,
          transcription,
          moderationScore: moderationResult.overallScore,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Voice moderation error:', error);
      }
    });

    // Crisis detection and emergency alerts
    socket.on('emergency_alert', async (data) => {
      try {
        const { sessionId, alertType, message } = data;
        
        // Log emergency alert
        await this.sessionManager.logEmergencyAlert(sessionId, {
          reporterId: socket.userId,
          alertType,
          message,
          timestamp: new Date().toISOString()
        });

        // Immediate response for different alert types
        switch (alertType) {
          case 'mental_health_crisis':
            await this.handleMentalHealthCrisis(sessionId, socket, message);
            break;
          case 'harassment':
            await this.handleHarassmentAlert(sessionId, socket, message);
            break;
          case 'spam_disruption':
            await this.handleSpamAlert(sessionId, socket, message);
            break;
          default:
            await this.handleGenericAlert(sessionId, socket, alertType, message);
        }

        // Send to all participants and moderators
        this.io.to(`sanctuary_${sessionId}`).emit('emergency_alert', {
          alertType,
          message,
          fromParticipant: socket.userId,
          timestamp: new Date().toISOString(),
          alertId: `alert_${Date.now()}`
        });

        console.log(`Emergency alert in ${sessionId}: ${alertType} - ${message}`);

      } catch (error) {
        console.error('Emergency alert error:', error);
      }
    });

    // Moderator actions
    socket.on('moderator_action', async (data) => {
      try {
        const { sessionId, action, targetParticipantId, reason } = data;
        
        // Verify moderator permissions
        const isModerator = await this.sessionManager.isParticipantModerator(sessionId, socket.userId);
        if (!isModerator) {
          socket.emit('moderator_action_denied', { reason: 'Insufficient permissions' });
          return;
        }

        // Execute moderator action
        switch (action) {
          case 'warn_participant':
            await this.warnParticipant(sessionId, targetParticipantId, reason);
            break;
          case 'temporary_mute':
            await this.temporaryMuteParticipant(sessionId, targetParticipantId, reason);
            break;
          case 'remove_participant':
            await this.removeParticipant(sessionId, targetParticipantId, reason);
            break;
          case 'ban_participant':
            await this.banParticipant(sessionId, targetParticipantId, reason);
            break;
        }

        // Log moderator action
        await this.sessionManager.logModeratorAction(sessionId, {
          moderatorId: socket.userId,
          action,
          targetParticipantId,
          reason,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Moderator action error:', error);
      }
    });

    // Real-time session analytics
    socket.on('request_session_analytics', async (data) => {
      try {
        const { sessionId } = data;
        
        // Verify permissions
        const canView = await this.sessionManager.canViewAnalytics(sessionId, socket.userId);
        if (!canView) {
          socket.emit('analytics_access_denied');
          return;
        }

        const analytics = await this.sessionManager.getSessionAnalytics(sessionId);
        
        socket.emit('session_analytics', {
          sessionId,
          analytics,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Analytics request error:', error);
      }
    });
  }

  // Handle critical alerts requiring immediate intervention
  async handleCriticalAlert(sessionId, socket, moderationResult) {
    try {
      // Immediately notify all moderators
      this.io.to(`sanctuary_moderators_${sessionId}`).emit('critical_alert', {
        participantId: socket.userId,
        participantAlias: socket.userAlias,
        severity: moderationResult.severity,
        reason: moderationResult.reason,
        detectedPatterns: moderationResult.detectedPatterns,
        recommendedActions: moderationResult.recommendedActions,
        timestamp: new Date().toISOString(),
        requiresImmediateAction: true
      });

      // Auto-trigger emergency protocols if self-harm detected
      if (moderationResult.detectedPatterns.includes('self_harm') || 
          moderationResult.detectedPatterns.includes('suicide_ideation')) {
        
        await this.triggerCrisisIntervention(sessionId, socket.userId);
      }

      // Log critical alert for analysis
      await this.sessionManager.logCriticalAlert(sessionId, {
        participantId: socket.userId,
        moderationResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Critical alert handling error:', error);
    }
  }

  // Trigger crisis intervention protocols
  async triggerCrisisIntervention(sessionId, participantId) {
    try {
      // Send crisis resources to participant
      const targetSocket = Array.from(this.io.sockets.sockets.values())
        .find(s => s.userId === participantId);

      if (targetSocket) {
        targetSocket.emit('crisis_intervention', {
          resources: await this.moderationService.getCrisisResources(),
          supportMessage: 'We care about your wellbeing. Help is available.',
          timestamp: new Date().toISOString()
        });
      }

      // Alert session moderators
      this.io.to(`sanctuary_moderators_${sessionId}`).emit('crisis_intervention_triggered', {
        participantId,
        resources: await this.moderationService.getCrisisResources(),
        timestamp: new Date().toISOString()
      });

      console.log(`Crisis intervention triggered for participant ${participantId} in session ${sessionId}`);

    } catch (error) {
      console.error('Crisis intervention error:', error);
    }
  }

  // Handle mental health crisis alerts
  async handleMentalHealthCrisis(sessionId, socket, message) {
    // Immediate moderator notification
    this.io.to(`sanctuary_moderators_${sessionId}`).emit('mental_health_crisis', {
      participantId: socket.userId,
      participantAlias: socket.userAlias,
      message,
      timestamp: new Date().toISOString(),
      priority: 'urgent'
    });

    // Trigger crisis intervention
    await this.triggerCrisisIntervention(sessionId, socket.userId);
  }

  // Handle harassment alerts
  async handleHarassmentAlert(sessionId, socket, message) {
    this.io.to(`sanctuary_moderators_${sessionId}`).emit('harassment_alert', {
      reporterId: socket.userId,
      message,
      timestamp: new Date().toISOString(),
      priority: 'high'
    });
  }

  // Handle spam/disruption alerts
  async handleSpamAlert(sessionId, socket, message) {
    this.io.to(`sanctuary_moderators_${sessionId}`).emit('spam_alert', {
      reporterId: socket.userId,
      message,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    });
  }

  // Handle generic alerts
  async handleGenericAlert(sessionId, socket, alertType, message) {
    this.io.to(`sanctuary_moderators_${sessionId}`).emit('generic_alert', {
      reporterId: socket.userId,
      alertType,
      message,
      timestamp: new Date().toISOString(),
      priority: 'low'
    });
  }
}

module.exports = ModerationHandlers;