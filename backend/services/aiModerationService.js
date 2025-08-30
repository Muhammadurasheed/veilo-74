const { GoogleGenerativeAI } = require('@google/generative-ai');
const redisSessionManager = require('./redisSessionManager');

class AIModerationService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Moderation rules and thresholds
    this.moderationRules = {
      crisis_detection: {
        keywords: [
          'suicide', 'kill myself', 'end it all', 'not worth living', 
          'hurt myself', 'self harm', 'cutting', 'overdose',
          'want to die', 'better off dead', 'can\'t take it anymore'
        ],
        severity: 'critical',
        action: 'immediate_intervention'
      },
      harassment: {
        keywords: [
          'hate', 'kill you', 'threat', 'violence', 'attack',
          'racist', 'sexist', 'homophobic', 'transphobic'
        ],
        severity: 'high',
        action: 'warn_and_monitor'
      },
      spam: {
        patterns: [
          /(.)\1{10,}/, // Repeated characters
          /[A-Z]{20,}/, // All caps spam
          /https?:\/\/[^\s]+/gi // URLs (depending on policy)
        ],
        severity: 'medium',
        action: 'auto_filter'
      },
      inappropriate_content: {
        keywords: [
          'explicit', 'sexual', 'drug dealing', 'illegal'
        ],
        severity: 'medium',
        action: 'content_filter'
      }
    };

    // Emergency response protocols
    this.emergencyProtocols = {
      immediate_intervention: {
        notify_moderators: true,
        emergency_contact: true,
        session_pause: false, // Don't pause, provide support
        escalate_to_admin: true,
        auto_response: "I'm concerned about what you've shared. You're not alone, and help is available. A trained moderator will join shortly."
      },
      warn_and_monitor: {
        notify_moderators: true,
        auto_warning: true,
        increase_monitoring: true,
        strike_system: true
      },
      auto_filter: {
        block_message: true,
        warn_user: true,
        log_incident: true
      }
    };
  }

  /**
   * Analyze text content for potential issues
   */
  async analyzeContent(content, context = {}) {
    try {
      const analysis = {
        content,
        timestamp: new Date().toISOString(),
        severity: 'none',
        flags: [],
        action: 'none',
        confidence: 0,
        sessionId: context.sessionId,
        participantId: context.participantId
      };

      // Rule-based detection (fast first pass)
      const ruleBasedResult = this.applyRuleBasedModeration(content);
      analysis.flags.push(...ruleBasedResult.flags);
      
      if (ruleBasedResult.severity !== 'none') {
        analysis.severity = ruleBasedResult.severity;
        analysis.action = ruleBasedResult.action;
        analysis.confidence = ruleBasedResult.confidence;
      }

      // AI-powered analysis for complex cases
      if (content.length > 10 && !ruleBasedResult.definitive) {
        const aiResult = await this.performAIAnalysis(content, context);
        
        // Combine results (take higher severity)
        if (this.getSeverityLevel(aiResult.severity) > this.getSeverityLevel(analysis.severity)) {
          analysis.severity = aiResult.severity;
          analysis.action = aiResult.action;
          analysis.confidence = Math.max(analysis.confidence, aiResult.confidence);
        }
        
        analysis.flags.push(...aiResult.flags);
        analysis.aiAnalysis = aiResult.details;
      }

      // Log the moderation event
      await this.logModerationEvent(analysis);

      return analysis;
    } catch (error) {
      console.error('Content analysis failed:', error);
      return {
        content,
        severity: 'none',
        flags: [],
        action: 'none',
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Apply rule-based moderation (fast screening)
   */
  applyRuleBasedModeration(content) {
    const result = {
      flags: [],
      severity: 'none',
      action: 'none',
      confidence: 0,
      definitive: false
    };

    const lowerContent = content.toLowerCase();

    // Check each rule category
    for (const [category, rule] of Object.entries(this.moderationRules)) {
      if (rule.keywords) {
        for (const keyword of rule.keywords) {
          if (lowerContent.includes(keyword.toLowerCase())) {
            result.flags.push({
              type: category,
              keyword,
              position: lowerContent.indexOf(keyword.toLowerCase())
            });
            
            if (this.getSeverityLevel(rule.severity) > this.getSeverityLevel(result.severity)) {
              result.severity = rule.severity;
              result.action = rule.action;
              result.confidence = 0.8; // High confidence for keyword matches
              result.definitive = rule.severity === 'critical';
            }
          }
        }
      }

      if (rule.patterns) {
        for (const pattern of rule.patterns) {
          if (pattern.test(content)) {
            result.flags.push({
              type: category,
              pattern: pattern.toString(),
              match: content.match(pattern)?.[0]
            });
            
            if (this.getSeverityLevel(rule.severity) > this.getSeverityLevel(result.severity)) {
              result.severity = rule.severity;
              result.action = rule.action;
              result.confidence = 0.7;
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Perform AI-powered content analysis
   */
  async performAIAnalysis(content, context) {
    try {
      const prompt = `
You are an AI moderator for a mental health support sanctuary. Analyze this message for:

1. Crisis indicators (suicidal thoughts, self-harm, immediate danger)
2. Harassment or threats
3. Inappropriate content
4. Spam or manipulation

Message: "${content}"

Context: This is in a live audio sanctuary for mental health support.

Respond with JSON:
{
  "severity": "none|low|medium|high|critical",
  "flags": [{"type": "category", "reason": "explanation"}],
  "action": "none|monitor|warn|filter|intervention",
  "confidence": 0.0-1.0,
  "supportive_response": "Optional helpful response if crisis detected",
  "details": "Brief explanation"
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse JSON response
      const analysis = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
      
      return {
        severity: analysis.severity || 'none',
        flags: analysis.flags || [],
        action: analysis.action || 'none',
        confidence: analysis.confidence || 0,
        supportiveResponse: analysis.supportive_response,
        details: analysis.details
      };
    } catch (error) {
      console.error('AI analysis failed:', error);
      return {
        severity: 'none',
        flags: [],
        action: 'none',
        confidence: 0,
        error: 'AI analysis unavailable'
      };
    }
  }

  /**
   * Execute moderation action
   */
  async executeModerationAction(analysis, sessionId, participantId, io) {
    try {
      const protocol = this.emergencyProtocols[analysis.action];
      if (!protocol) return;

      const actionResults = {
        action: analysis.action,
        executed: [],
        timestamp: new Date().toISOString()
      };

      // Immediate intervention for crisis situations
      if (analysis.action === 'immediate_intervention') {
        // Notify all moderators and admins
        if (protocol.notify_moderators) {
          io.to('moderators').emit('crisis_alert', {
            sessionId,
            participantId,
            content: analysis.content,
            severity: analysis.severity,
            timestamp: new Date().toISOString()
          });
          actionResults.executed.push('moderator_notification');
        }

        // Send supportive auto-response
        if (analysis.aiAnalysis?.supportiveResponse) {
          io.to(`sanctuary_${sessionId}`).emit('system_message', {
            type: 'support',
            message: analysis.aiAnalysis.supportiveResponse,
            timestamp: new Date().toISOString()
          });
          actionResults.executed.push('supportive_response');
        }

        // Log emergency alert
        await redisSessionManager.storeEmergencyAlert(sessionId, {
          type: 'crisis_intervention',
          participantId,
          content: analysis.content,
          severity: 'critical',
          autoResponse: analysis.aiAnalysis?.supportiveResponse
        });
        actionResults.executed.push('emergency_alert_logged');
      }

      // Warning system
      if (analysis.action === 'warn_and_monitor' && protocol.auto_warning) {
        io.to(`sanctuary_${sessionId}`).emit('moderation_warning', {
          participantId,
          type: 'content_warning',
          message: 'Please keep the conversation supportive and appropriate for all participants.',
          timestamp: new Date().toISOString()
        });
        actionResults.executed.push('warning_sent');
      }

      // Content filtering
      if (analysis.action === 'auto_filter' && protocol.block_message) {
        io.to(`sanctuary_${sessionId}`).emit('message_filtered', {
          participantId,
          reason: 'Content filtered by automated moderation',
          timestamp: new Date().toISOString()
        });
        actionResults.executed.push('message_blocked');
      }

      return actionResults;
    } catch (error) {
      console.error('Failed to execute moderation action:', error);
      return { error: error.message };
    }
  }

  /**
   * Analyze participant behavior patterns
   */
  async analyzeParticipantBehavior(sessionId, participantId, timeWindow = 300000) { // 5 minutes
    try {
      const logs = await redisSessionManager.getModerationLogs(sessionId, 100);
      
      const participantLogs = logs.filter(log => 
        log.participantId === participantId &&
        Date.now() - log.timestamp < timeWindow
      );

      const analysis = {
        participantId,
        timeWindow: timeWindow / 1000, // seconds
        messageCount: participantLogs.length,
        flaggedCount: participantLogs.filter(log => log.severity !== 'none').length,
        severityDistribution: {},
        patterns: [],
        riskScore: 0
      };

      // Calculate severity distribution
      participantLogs.forEach(log => {
        analysis.severityDistribution[log.severity] = 
          (analysis.severityDistribution[log.severity] || 0) + 1;
      });

      // Detect patterns
      if (analysis.messageCount > 10) {
        analysis.patterns.push('high_volume');
      }
      
      if (analysis.flaggedCount / analysis.messageCount > 0.3) {
        analysis.patterns.push('frequently_flagged');
      }

      if (analysis.severityDistribution.critical > 0) {
        analysis.patterns.push('crisis_indicators');
      }

      // Calculate risk score (0-100)
      analysis.riskScore = Math.min(100, 
        (analysis.flaggedCount * 10) + 
        (analysis.severityDistribution.critical || 0) * 50 +
        (analysis.severityDistribution.high || 0) * 20 +
        (analysis.patterns.length * 5)
      );

      return analysis;
    } catch (error) {
      console.error('Behavior analysis failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Generate moderation summary for session
   */
  async generateSessionSummary(sessionId) {
    try {
      const logs = await redisSessionManager.getModerationLogs(sessionId);
      
      const summary = {
        sessionId,
        totalMessages: logs.length,
        flaggedMessages: logs.filter(log => log.severity !== 'none').length,
        severityBreakdown: {},
        topFlags: {},
        interventions: logs.filter(log => log.action === 'immediate_intervention').length,
        overallRisk: 'low'
      };

      // Calculate breakdowns
      logs.forEach(log => {
        summary.severityBreakdown[log.severity] = 
          (summary.severityBreakdown[log.severity] || 0) + 1;
          
        log.flags.forEach(flag => {
          summary.topFlags[flag.type] = 
            (summary.topFlags[flag.type] || 0) + 1;
        });
      });

      // Determine overall risk
      if (summary.interventions > 0 || summary.severityBreakdown.critical > 0) {
        summary.overallRisk = 'high';
      } else if (summary.severityBreakdown.high > 3) {
        summary.overallRisk = 'medium';
      }

      return summary;
    } catch (error) {
      console.error('Failed to generate session summary:', error);
      return { error: error.message };
    }
  }

  /**
   * Helper: Get numeric severity level
   */
  getSeverityLevel(severity) {
    const levels = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
    return levels[severity] || 0;
  }

  /**
   * Helper: Log moderation event
   */
  async logModerationEvent(analysis) {
    try {
      await redisSessionManager.logModerationEvent(analysis.sessionId, {
        type: 'content_analysis',
        participantId: analysis.participantId,
        content: analysis.content,
        severity: analysis.severity,
        flags: analysis.flags,
        action: analysis.action,
        confidence: analysis.confidence,
        aiAnalysis: analysis.aiAnalysis
      });
    } catch (error) {
      console.error('Failed to log moderation event:', error);
    }
  }
}

module.exports = new AIModerationService();