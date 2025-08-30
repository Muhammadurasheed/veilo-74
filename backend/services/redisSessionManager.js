const Redis = require('redis');

class RedisSessionManager {
  constructor() {
    this.redis = null;
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      if (process.env.REDIS_ENABLED !== 'true') {
        console.log('📊 Redis disabled, using memory storage');
        return;
      }

      this.redis = Redis.createClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });

      this.redis.on('error', (err) => {
        console.error('❌ Redis error:', err);
      });

      this.redis.on('connect', () => {
        console.log('✅ Redis connected for session management');
      });

      await this.redis.connect();
      this.initialized = true;
    } catch (error) {
      console.error('❌ Redis initialization failed:', error);
      this.redis = null;
    }
  }

  /**
   * Store live sanctuary session state
   */
  async setSessionState(sessionId, state) {
    try {
      if (!this.redis) {
        // Fallback to memory storage (not recommended for production)
        global.sessionStates = global.sessionStates || {};
        global.sessionStates[sessionId] = {
          ...state,
          timestamp: Date.now()
        };
        return true;
      }

      const key = `live_sanctuary:${sessionId}`;
      const data = {
        ...state,
        timestamp: Date.now(),
        lastUpdated: new Date().toISOString()
      };

      await this.redis.setex(key, 86400, JSON.stringify(data)); // 24 hours TTL
      return true;
    } catch (error) {
      console.error('Failed to set session state:', error);
      return false;
    }
  }

  /**
   * Get live sanctuary session state
   */
  async getSessionState(sessionId) {
    try {
      if (!this.redis) {
        // Fallback to memory storage
        global.sessionStates = global.sessionStates || {};
        return global.sessionStates[sessionId] || null;
      }

      const key = `live_sanctuary:${sessionId}`;
      const data = await this.redis.get(key);
      
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get session state:', error);
      return null;
    }
  }

  /**
   * Update participant in session
   */
  async updateParticipant(sessionId, participantId, participantData) {
    try {
      const sessionState = await this.getSessionState(sessionId);
      if (!sessionState) return false;

      // Update or add participant
      const participants = sessionState.participants || [];
      const participantIndex = participants.findIndex(p => p.id === participantId);
      
      if (participantIndex >= 0) {
        participants[participantIndex] = { ...participants[participantIndex], ...participantData };
      } else {
        participants.push({ id: participantId, ...participantData });
      }

      sessionState.participants = participants;
      sessionState.currentParticipants = participants.length;
      
      return await this.setSessionState(sessionId, sessionState);
    } catch (error) {
      console.error('Failed to update participant:', error);
      return false;
    }
  }

  /**
   * Remove participant from session
   */
  async removeParticipant(sessionId, participantId) {
    try {
      const sessionState = await this.getSessionState(sessionId);
      if (!sessionState) return false;

      const participants = (sessionState.participants || []).filter(p => p.id !== participantId);
      sessionState.participants = participants;
      sessionState.currentParticipants = participants.length;
      
      return await this.setSessionState(sessionId, sessionState);
    } catch (error) {
      console.error('Failed to remove participant:', error);
      return false;
    }
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions() {
    try {
      if (!this.redis) {
        global.sessionStates = global.sessionStates || {};
        return Object.keys(global.sessionStates).map(sessionId => ({
          sessionId,
          ...global.sessionStates[sessionId]
        }));
      }

      const keys = await this.redis.keys('live_sanctuary:*');
      const sessions = [];
      
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const sessionData = JSON.parse(data);
          sessions.push({
            sessionId: key.replace('live_sanctuary:', ''),
            ...sessionData
          });
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Failed to get active sessions:', error);
      return [];
    }
  }

  /**
   * Store voice configuration for participant
   */
  async setVoiceConfig(sessionId, participantId, voiceConfig) {
    try {
      const key = `voice_config:${sessionId}:${participantId}`;
      const data = {
        ...voiceConfig,
        timestamp: Date.now(),
        sessionId,
        participantId
      };

      if (!this.redis) {
        global.voiceConfigs = global.voiceConfigs || {};
        global.voiceConfigs[key] = data;
        return true;
      }

      await this.redis.setex(key, 3600, JSON.stringify(data)); // 1 hour TTL
      return true;
    } catch (error) {
      console.error('Failed to set voice config:', error);
      return false;
    }
  }

  /**
   * Get voice configuration for participant
   */
  async getVoiceConfig(sessionId, participantId) {
    try {
      const key = `voice_config:${sessionId}:${participantId}`;
      
      if (!this.redis) {
        global.voiceConfigs = global.voiceConfigs || {};
        return global.voiceConfigs[key] || null;
      }

      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get voice config:', error);
      return null;
    }
  }

  /**
   * Store AI moderation log
   */
  async logModerationEvent(sessionId, event) {
    try {
      const key = `moderation:${sessionId}:${Date.now()}`;
      const data = {
        ...event,
        sessionId,
        timestamp: Date.now(),
        id: key
      };

      if (!this.redis) {
        global.moderationLogs = global.moderationLogs || [];
        global.moderationLogs.push(data);
        return true;
      }

      await this.redis.setex(key, 604800, JSON.stringify(data)); // 7 days TTL
      
      // Also add to session-specific list
      const listKey = `moderation_list:${sessionId}`;
      await this.redis.lpush(listKey, key);
      await this.redis.expire(listKey, 604800); // 7 days TTL
      
      return true;
    } catch (error) {
      console.error('Failed to log moderation event:', error);
      return false;
    }
  }

  /**
   * Get moderation logs for session
   */
  async getModerationLogs(sessionId, limit = 50) {
    try {
      if (!this.redis) {
        global.moderationLogs = global.moderationLogs || [];
        return global.moderationLogs
          .filter(log => log.sessionId === sessionId)
          .slice(0, limit);
      }

      const listKey = `moderation_list:${sessionId}`;
      const keys = await this.redis.lrange(listKey, 0, limit - 1);
      
      const logs = [];
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          logs.push(JSON.parse(data));
        }
      }
      
      return logs;
    } catch (error) {
      console.error('Failed to get moderation logs:', error);
      return [];
    }
  }

  /**
   * Store emergency alert
   */
  async storeEmergencyAlert(sessionId, alert) {
    try {
      const key = `emergency:${sessionId}:${Date.now()}`;
      const data = {
        ...alert,
        sessionId,
        timestamp: Date.now(),
        id: key,
        severity: alert.severity || 'high'
      };

      if (!this.redis) {
        global.emergencyAlerts = global.emergencyAlerts || [];
        global.emergencyAlerts.push(data);
        return true;
      }

      await this.redis.setex(key, 2592000, JSON.stringify(data)); // 30 days TTL
      
      // Add to emergency alerts list
      const listKey = `emergency_list:${sessionId}`;
      await this.redis.lpush(listKey, key);
      await this.redis.expire(listKey, 2592000); // 30 days TTL
      
      return true;
    } catch (error) {
      console.error('Failed to store emergency alert:', error);
      return false;
    }
  }

  /**
   * Performance monitoring and analytics
   */
  async recordPerformanceMetric(sessionId, metric) {
    try {
      const key = `performance:${sessionId}:${new Date().toISOString().split('T')[0]}`;
      const data = {
        sessionId,
        timestamp: Date.now(),
        ...metric
      };

      if (!this.redis) {
        global.performanceMetrics = global.performanceMetrics || [];
        global.performanceMetrics.push(data);
        return true;
      }

      // Store as hash for efficient aggregation
      const field = Date.now().toString();
      await this.redis.hset(key, field, JSON.stringify(data));
      await this.redis.expire(key, 604800); // 7 days TTL
      
      return true;
    } catch (error) {
      console.error('Failed to record performance metric:', error);
      return false;
    }
  }

  /**
   * Cleanup expired sessions and data
   */
  async cleanup() {
    try {
      if (!this.redis) {
        // Memory cleanup
        global.sessionStates = {};
        global.voiceConfigs = {};
        global.moderationLogs = [];
        global.emergencyAlerts = [];
        global.performanceMetrics = [];
        return;
      }

      // Redis automatically handles TTL cleanup
      console.log('🧹 Redis cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup Redis:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.redis) {
        return { status: 'memory_mode', redis: false };
      }

      await this.redis.ping();
      return { status: 'healthy', redis: true };
    } catch (error) {
      return { status: 'unhealthy', redis: false, error: error.message };
    }
  }
}

module.exports = new RedisSessionManager();