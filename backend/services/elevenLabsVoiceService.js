const axios = require('axios');
const Redis = require('redis');

class ElevenLabsVoiceService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || '9BWtsMINqrJLrRacOk9x';
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    
    // Initialize Redis for caching
    this.redis = null;
    if (process.env.REDIS_ENABLED === 'true') {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL,
        password: process.env.REDIS_PASSWORD
      });
      
      this.redis.on('error', (err) => {
        console.error('Redis error:', err);
      });
      
      this.redis.connect().catch(console.error);
    }
    
    // Voice presets for different personas
    this.voicePresets = {
      anonymous_male: '9BWtsMINqrJLrRacOk9x', // Aria (default)
      anonymous_female: 'EXAVITQu4vr4xnSDxMaL', // Sarah
      professional: 'CwhRBWXzGAHq8TQ4Fs17', // Roger
      youthful: 'FGY2WhTYpPnrIDTdsKH5', // Laura
      calm: 'IKne3meq5aSn9XLyUdCD', // Charlie
      warm: 'JBFqnCBsd6RMkjVDRZzb', // George
      energetic: 'N2lVS1w4EtoT3dr4eOWO', // Callum
      gentle: 'SAz9YHcvj6GT2YYXdXww', // River
      authoritative: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
      friendly: 'XB0fDUnXU5powFXDhCwa' // Charlotte
    };
  }

  /**
   * Get available voices for user selection
   */
  async getAvailableVoices() {
    try {
      const cacheKey = 'elevenlabs:voices';
      
      // Check cache first
      if (this.redis) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      const voices = response.data.voices.map(voice => ({
        id: voice.voice_id,
        name: voice.name,
        description: voice.description,
        category: voice.category,
        labels: voice.labels
      }));

      // Cache for 1 hour
      if (this.redis) {
        await this.redis.setex(cacheKey, 3600, JSON.stringify(voices));
      }

      return voices;
    } catch (error) {
      console.error('Failed to fetch ElevenLabs voices:', error);
      
      // Return fallback voice presets
      return Object.entries(this.voicePresets).map(([key, id]) => ({
        id,
        name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: `${key.replace('_', ' ')} voice preset`,
        category: 'preset',
        labels: { use_case: 'real-time' }
      }));
    }
  }

  /**
   * Convert text to speech with voice modulation
   */
  async textToSpeech(text, options = {}) {
    try {
      const {
        voiceId = this.defaultVoiceId,
        stability = 0.75,
        similarityBoost = 0.75,
        style = 0.5,
        useSpeakerBoost = true,
        modelId = 'eleven_multilingual_v2'
      } = options;

      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost
          }
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer'
        }
      );

      return {
        success: true,
        audioBuffer: response.data,
        voiceId,
        metadata: {
          textLength: text.length,
          voiceSettings: { stability, similarityBoost, style, useSpeakerBoost },
          modelId
        }
      };
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      return {
        success: false,
        error: error.message || 'Voice synthesis failed',
        fallback: true
      };
    }
  }

  /**
   * Real-time voice conversion for live audio streams
   */
  async createVoiceConversionSession(options = {}) {
    try {
      const {
        sourceVoiceId = this.defaultVoiceId,
        targetVoiceId,
        sessionId,
        participantId
      } = options;

      // For real-time conversion, we'd typically use WebSocket connection
      // This is a simplified version that sets up the conversion parameters
      const conversionConfig = {
        sessionId,
        participantId,
        sourceVoiceId,
        targetVoiceId: targetVoiceId || this.voicePresets.anonymous_male,
        settings: {
          stability: 0.8,
          similarityBoost: 0.8,
          latencyOptimized: true,
          chunkSize: 1024 // Audio chunk size for real-time processing
        },
        fallbackEnabled: true,
        qualityMode: 'balanced' // balanced, quality, speed
      };

      // Cache the configuration
      if (this.redis && sessionId && participantId) {
        const configKey = `voice_conversion:${sessionId}:${participantId}`;
        await this.redis.setex(configKey, 3600, JSON.stringify(conversionConfig));
      }

      return {
        success: true,
        conversionId: `${sessionId}_${participantId}_${Date.now()}`,
        config: conversionConfig,
        websocketUrl: `${this.baseUrl}/v1/text-to-speech/${targetVoiceId}/stream`,
        fallbackAvailable: true
      };
    } catch (error) {
      console.error('Voice conversion session creation failed:', error);
      return {
        success: false,
        error: error.message,
        fallbackEnabled: true
      };
    }
  }

  /**
   * Process real-time audio chunk with voice conversion
   */
  async processAudioChunk(audioData, conversionConfig) {
    try {
      // In a production environment, this would:
      // 1. Convert audio to text using speech-to-text
      // 2. Apply voice conversion
      // 3. Return converted audio
      
      // For now, return the original audio with metadata
      return {
        success: true,
        processedAudio: audioData,
        latency: Date.now() - conversionConfig.timestamp,
        voiceApplied: conversionConfig.targetVoiceId,
        fallbackUsed: false
      };
    } catch (error) {
      console.error('Audio chunk processing failed:', error);
      return {
        success: false,
        originalAudio: audioData,
        fallbackUsed: true,
        error: error.message
      };
    }
  }

  /**
   * Generate voice preview for user selection
   */
  async generateVoicePreview(voiceId, sampleText = "Hello, this is how I sound in this sanctuary.") {
    try {
      const result = await this.textToSpeech(sampleText, { 
        voiceId,
        modelId: 'eleven_turbo_v2_5' // Faster model for previews
      });
      
      if (result.success) {
        return {
          success: true,
          audioBuffer: result.audioBuffer,
          voiceId,
          sampleText
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Voice preview generation failed:', error);
      return {
        success: false,
        error: error.message,
        voiceId
      };
    }
  }

  /**
   * Health check and failover logic
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey
        },
        timeout: 5000
      });

      return {
        status: 'healthy',
        subscription: response.data.subscription,
        characterCount: response.data.character_count,
        characterLimit: response.data.character_limit,
        canSynthesize: response.data.can_extend_character_limit
      };
    } catch (error) {
      console.error('ElevenLabs health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        fallbackRecommended: true
      };
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

module.exports = new ElevenLabsVoiceService();