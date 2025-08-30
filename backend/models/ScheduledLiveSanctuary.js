const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const scheduledLiveSanctuarySchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => `scheduled-sanctuary-${nanoid(8)}`,
    unique: true,
    required: true
  },
  
  // Basic session info
  topic: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  description: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  emoji: {
    type: String,
    default: '🎙️'
  },
  
  // Host information
  hostId: {
    type: String,
    required: true
  },
  hostAlias: {
    type: String,
    required: true
  },
  hostEmail: String,
  
  // Scheduling details
  scheduledDateTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
        return date > new Date();
      },
      message: 'Scheduled date must be in the future'
    }
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true,
    min: 15,
    max: 480 // 8 hours max
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  
  // Session configuration
  maxParticipants: {
    type: Number,
    default: 50,
    min: 2,
    max: 200
  },
  allowAnonymous: {
    type: Boolean,
    default: true
  },
  audioOnly: {
    type: Boolean,
    default: true
  },
  moderationEnabled: {
    type: Boolean,
    default: true
  },
  moderationLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'strict'],
    default: 'medium'
  },
  emergencyContactEnabled: {
    type: Boolean,
    default: true
  },
  aiMonitoring: {
    type: Boolean,
    default: true
  },
  voiceModulationEnabled: {
    type: Boolean,
    default: true
  },
  recordingEnabled: {
    type: Boolean,
    default: false
  },
  recordingConsentRequired: {
    type: Boolean,
    default: true
  },
  
  // Access control
  accessMode: {
    type: String,
    enum: ['public', 'invite_only', 'private'],
    default: 'public'
  },
  invitationCode: {
    type: String,
    default: () => nanoid(8).toUpperCase()
  },
  invitationUrl: String, // Generated URL for sharing
  allowEarlyJoin: {
    type: Boolean,
    default: false
  },
  earlyJoinBuffer: {
    type: Number, // minutes before scheduled time
    default: 15,
    min: 0,
    max: 60
  },
  
  // Notification settings
  notificationSettings: {
    sendReminders: { type: Boolean, default: true },
    reminderTimes: [{ type: Number, default: [60, 15] }], // minutes before
    notifyOnRegistration: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true }
  },
  
  // Registration and participants
  registeredParticipants: [{
    userId: String,
    userAlias: String,
    userEmail: String,
    registeredAt: { type: Date, default: Date.now },
    remindersSent: [Date],
    voicePreference: String,
    specialRequests: String
  }],
  registrationRequired: {
    type: Boolean,
    default: false
  },
  registrationDeadline: Date,
  
  // Session state
  status: {
    type: String,
    enum: ['scheduled', 'ready', 'live', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  liveSessionId: String, // Reference to LiveSanctuarySession when goes live
  actualStartTime: Date,
  actualEndTime: Date,
  
  // Agora.io configuration (pre-generated)
  agoraChannelName: {
    type: String,
    required: true,
    unique: true
  },
  agoraAppId: String,
  
  // Metadata
  tags: [String],
  language: {
    type: String,
    default: 'en'
  },
  targetAudience: String,
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all'],
    default: 'all'
  },
  
  // Analytics and tracking
  analytics: {
    totalRegistrations: { type: Number, default: 0 },
    showUpRate: Number,
    avgParticipationTime: Number,
    satisfactionRating: Number,
    completionRate: Number
  },
  
  // Admin and moderation
  moderatorIds: [String],
  adminNotes: String,
  flaggedContent: [String],
  requiresReview: {
    type: Boolean,
    default: false
  },
  reviewedBy: String,
  reviewedAt: Date,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
scheduledLiveSanctuarySchema.index({ scheduledDateTime: 1 });
scheduledLiveSanctuarySchema.index({ hostId: 1, scheduledDateTime: -1 });
scheduledLiveSanctuarySchema.index({ status: 1, scheduledDateTime: 1 });
scheduledLiveSanctuarySchema.index({ accessMode: 1, scheduledDateTime: 1 });
scheduledLiveSanctuarySchema.index({ 'registeredParticipants.userId': 1 });

// Virtual for checking if session is starting soon
scheduledLiveSanctuarySchema.virtual('isStartingSoon').get(function() {
  const now = new Date();
  const bufferTime = this.earlyJoinBuffer * 60 * 1000; // Convert to milliseconds
  const startTime = new Date(this.scheduledDateTime.getTime() - bufferTime);
  return now >= startTime && now < this.scheduledDateTime;
});

// Virtual for checking if session can start
scheduledLiveSanctuarySchema.virtual('canStart').get(function() {
  const now = new Date();
  const startTime = this.scheduledDateTime;
  const gracePeriod = 15 * 60 * 1000; // 15 minutes grace period
  return now >= startTime && now <= new Date(startTime.getTime() + gracePeriod);
});

// Pre-save middleware
scheduledLiveSanctuarySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate invitation URL if not exists
  if (!this.invitationUrl) {
    this.invitationUrl = `/sanctuary/scheduled/${this.id}/join?code=${this.invitationCode}`;
  }
  
  // Update analytics
  this.analytics.totalRegistrations = this.registeredParticipants.length;
  
  next();
});

// Instance methods
scheduledLiveSanctuarySchema.methods.addParticipant = function(participantData) {
  // Check if already registered
  const existing = this.registeredParticipants.find(p => p.userId === participantData.userId);
  if (existing) {
    return { success: false, message: 'Already registered' };
  }
  
  // Check capacity
  if (this.registeredParticipants.length >= this.maxParticipants) {
    return { success: false, message: 'Session is full' };
  }
  
  // Check registration deadline
  if (this.registrationDeadline && new Date() > this.registrationDeadline) {
    return { success: false, message: 'Registration deadline has passed' };
  }
  
  this.registeredParticipants.push({
    ...participantData,
    registeredAt: new Date()
  });
  
  return { success: true, message: 'Successfully registered' };
};

scheduledLiveSanctuarySchema.methods.removeParticipant = function(userId) {
  const index = this.registeredParticipants.findIndex(p => p.userId === userId);
  if (index === -1) {
    return { success: false, message: 'Participant not found' };
  }
  
  this.registeredParticipants.splice(index, 1);
  return { success: true, message: 'Successfully removed' };
};

scheduledLiveSanctuarySchema.methods.canUserJoin = function(userId, inviteCode) {
  // Check if session is live or ready
  if (!['ready', 'live'].includes(this.status)) {
    if (this.status === 'scheduled' && !this.isStartingSoon) {
      return { canJoin: false, reason: 'Session not yet started' };
    }
  }
  
  // Check access mode
  if (this.accessMode === 'private') {
    return { canJoin: false, reason: 'Private session' };
  }
  
  if (this.accessMode === 'invite_only') {
    if (inviteCode !== this.invitationCode) {
      return { canJoin: false, reason: 'Invalid invitation code' };
    }
  }
  
  // Check if registration required
  if (this.registrationRequired) {
    const isRegistered = this.registeredParticipants.some(p => p.userId === userId);
    if (!isRegistered) {
      return { canJoin: false, reason: 'Registration required' };
    }
  }
  
  return { canJoin: true };
};

scheduledLiveSanctuarySchema.methods.transitionToLive = function(liveSessionData) {
  this.status = 'live';
  this.liveSessionId = liveSessionData.id;
  this.actualStartTime = new Date();
  
  return this.save();
};

// Static methods
scheduledLiveSanctuarySchema.statics.getUpcomingSessions = function(limit = 10) {
  return this.find({
    scheduledDateTime: { $gte: new Date() },
    status: { $in: ['scheduled', 'ready'] },
    accessMode: { $ne: 'private' }
  })
  .sort({ scheduledDateTime: 1 })
  .limit(limit);
};

scheduledLiveSanctuarySchema.statics.getSessionsReadyToStart = function() {
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  
  return this.find({
    scheduledDateTime: { 
      $gte: fifteenMinutesAgo,
      $lte: now 
    },
    status: 'scheduled'
  });
};

module.exports = mongoose.model('ScheduledLiveSanctuary', scheduledLiveSanctuarySchema);