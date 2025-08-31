const ElevenLabsVoiceService = require('../services/elevenLabsVoiceService');
const RedisSessionManager = require('../services/redisSessionManager');

class VoiceHandlers {
  constructor(io) {
    this.io = io;
    this.voiceService = new ElevenLabsVoiceService();
    this.sessionManager = new RedisSessionManager();
  }

  // Initialize voice-related socket handlers
  initializeHandlers(socket) {
    // Voice modulation request
    socket.on('request_voice_modulation', async (data) => {
      try {
        const { sessionId, voiceId, audioData } = data;
        
        // Get session data
        const sessionData = await this.sessionManager.getSessionData(sessionId);
        if (!sessionData) {
          socket.emit('voice_modulation_error', { error: 'Session not found' });
          return;
        }

        // Process voice modulation
        const modulatedAudio = await this.voiceService.modulateVoice(audioData, voiceId);
        
        // Broadcast modulated audio to all participants except sender
        socket.to(`audio_room_${sessionId}`).emit('modulated_audio', {
          participantId: socket.userId,
          audioData: modulatedAudio,
          voiceId,
          timestamp: new Date().toISOString()
        });

        // Update participant voice preference
        await this.sessionManager.updateParticipantVoice(sessionId, socket.userId, voiceId);
        
        console.log(`Voice modulated for ${socket.userId} in session ${sessionId} using voice ${voiceId}`);
        
      } catch (error) {
        console.error('Voice modulation error:', error);
        socket.emit('voice_modulation_error', { 
          error: 'Voice modulation failed',
          fallbackToOriginal: true 
        });
      }
    });

    // Voice preview request
    socket.on('preview_voice', async (data) => {
      try {
        const { voiceId, sampleText = "Hello, this is how I would sound in the sanctuary." } = data;
        
        const previewAudio = await this.voiceService.generateVoicePreview(voiceId, sampleText);
        
        socket.emit('voice_preview', {
          voiceId,
          audioData: previewAudio,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Voice preview error:', error);
        socket.emit('voice_preview_error', { 
          voiceId: data.voiceId,
          error: 'Preview generation failed' 
        });
      }
    });

    // Real-time voice stream handling
    socket.on('voice_stream_start', async (data) => {
      try {
        const { sessionId, voiceId } = data;
        
        // Validate participant can speak
        const canSpeak = await this.sessionManager.canParticipantSpeak(sessionId, socket.userId);
        if (!canSpeak) {
          socket.emit('voice_stream_denied', { reason: 'Not authorized to speak' });
          return;
        }

        // Initialize voice stream
        socket.voiceStreamActive = true;
        socket.currentVoiceId = voiceId;
        
        // Notify other participants
        socket.to(`audio_room_${sessionId}`).emit('participant_speaking_start', {
          participantId: socket.userId,
          participantAlias: socket.userAlias,
          voiceId,
          timestamp: new Date().toISOString()
        });

        // Update session analytics
        await this.sessionManager.incrementActiveSpeakers(sessionId);
        
      } catch (error) {
        console.error('Voice stream start error:', error);
        socket.emit('voice_stream_error', { error: 'Failed to start voice stream' });
      }
    });

    socket.on('voice_stream_data', async (data) => {
      try {
        if (!socket.voiceStreamActive) return;
        
        const { sessionId, audioChunk } = data;
        
        // Process voice modulation in real-time
        const modulatedChunk = await this.voiceService.processAudioStream(
          audioChunk, 
          socket.currentVoiceId
        );
        
        // Broadcast to other participants
        socket.to(`audio_room_${sessionId}`).emit('participant_audio_stream', {
          participantId: socket.userId,
          audioChunk: modulatedChunk,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Voice stream processing error:', error);
        // Fall back to original audio on error
        socket.to(`audio_room_${data.sessionId}`).emit('participant_audio_stream', {
          participantId: socket.userId,
          audioChunk: data.audioChunk,
          fallback: true,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('voice_stream_end', async (data) => {
      try {
        const { sessionId } = data;
        
        socket.voiceStreamActive = false;
        socket.currentVoiceId = null;
        
        // Notify other participants
        socket.to(`audio_room_${sessionId}`).emit('participant_speaking_end', {
          participantId: socket.userId,
          timestamp: new Date().toISOString()
        });

        // Update session analytics
        await this.sessionManager.decrementActiveSpeakers(sessionId);
        
      } catch (error) {
        console.error('Voice stream end error:', error);
      }
    });

    // Voice settings update
    socket.on('update_voice_settings', async (data) => {
      try {
        const { sessionId, settings } = data;
        
        await this.sessionManager.updateParticipantVoiceSettings(
          sessionId, 
          socket.userId, 
          settings
        );
        
        socket.emit('voice_settings_updated', { 
          settings,
          timestamp: new Date().toISOString() 
        });
        
      } catch (error) {
        console.error('Voice settings update error:', error);
        socket.emit('voice_settings_error', { error: 'Failed to update voice settings' });
      }
    });

    // Background noise filtering
    socket.on('toggle_noise_filter', async (data) => {
      try {
        const { sessionId, enabled } = data;
        
        await this.sessionManager.setParticipantNoiseFilter(sessionId, socket.userId, enabled);
        
        socket.emit('noise_filter_updated', { 
          enabled,
          timestamp: new Date().toISOString() 
        });
        
      } catch (error) {
        console.error('Noise filter toggle error:', error);
      }
    });
  }

  // Clean up voice-related data when participant disconnects
  async handleDisconnect(socket, sessionId) {
    try {
      if (socket.voiceStreamActive) {
        // Notify other participants that voice stream ended
        socket.to(`audio_room_${sessionId}`).emit('participant_speaking_end', {
          participantId: socket.userId,
          disconnected: true,
          timestamp: new Date().toISOString()
        });

        // Update session analytics
        await this.sessionManager.decrementActiveSpeakers(sessionId);
      }

      // Clean up voice-related session data
      await this.sessionManager.removeParticipantVoiceData(sessionId, socket.userId);
      
    } catch (error) {
      console.error('Voice cleanup error:', error);
    }
  }
}

module.exports = VoiceHandlers;