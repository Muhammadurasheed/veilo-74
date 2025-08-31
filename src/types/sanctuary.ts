// Sanctuary-specific types and interfaces
import type { User } from './index';

export interface Sanctuary {
  id: string;
  topic: string;
  description?: string;
  emoji?: string;
  hostId: string;
  hostAlias?: string;
  participantCount: number;
  maxParticipants?: number;
  isActive: boolean;
  allowAnonymous: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  hostToken?: string;
  inviteLink?: string;
  tags?: string[];
  language?: string;
  moderationLevel?: string;
  status: 'scheduled' | 'active' | 'ended';
}

export interface SanctuaryParticipant {
  id: string;
  alias: string;
  isHost: boolean;
  isAnonymous: boolean;
  joinedAt: string;
  isMuted?: boolean;
  micPermission?: 'granted' | 'denied' | 'pending';
}

export interface SanctuaryMessage {
  id: string;
  participantId: string;
  participantAlias: string;
  content: string;
  timestamp: string;
  type: "text" | "system" | "emoji-reaction";
}

// Live audio sanctuary types
export interface LiveSanctuarySession extends Sanctuary {
  audioOnly: boolean;
  moderationEnabled: boolean;
  emergencyContactEnabled: boolean;
  scheduledDateTime?: string | Date;
  startedAt?: string;
  endedAt?: string;
  estimatedDuration?: number;
  participants?: LiveParticipant[];
  session?: any; // For backward compatibility
  hostAlias?: string;
  aiMonitoring?: boolean;
  emergencyProtocols?: boolean;
  isRecorded?: boolean;
  startTime?: string;
}

export interface LiveParticipant {
  id: string;
  alias: string;
  isHost: boolean;
  isModerator?: boolean;
  isMuted: boolean;
  isBlocked?: boolean;
  handRaised?: boolean;
  joinedAt: string;
  audioLevel?: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  handRaised?: boolean;
  speakingTime?: number;
  reactions?: EmojiReaction[];
  isAnonymous?: boolean;
  micPermission?: 'granted' | 'denied' | 'pending';
}

export interface ChatParticipant {
  id: string;
  alias: string;
  isHost: boolean;
  isAnonymous: boolean;
  joinedAt: string;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
}

export interface EmojiReaction {
  emoji: string;
  timestamp: string;
}

export interface BreakoutRoom {
  id: string;
  sessionId: string;
  name: string;
  participants: string[];
  currentParticipants?: number;
  maxParticipants: number;
  isActive: boolean;
  createdAt: string;
  topic?: string;
  facilitatorId?: string;
}

export interface SessionRecording {
  id: string;
  sessionId: string;
  title: string;
  filename: string;
  fileUrl: string;
  duration: number;
  size: number;
  recordingUrl: string;
  transcriptUrl?: string;
  processingStatus?: 'processing' | 'completed' | 'failed';
  status: 'processing' | 'ready' | 'failed';
  createdAt: string;
  startTime?: string;
  downloadUrl?: string;
}

export interface AIModerationLog {
  id: string;
  sessionId: string;
  participantId: string;
  content: string;
  flaggedReason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'none' | 'warning' | 'mute' | 'remove';
  timestamp: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface SanctuaryInvitation {
  id: string;
  sessionId: string;
  invitedBy: string;
  invitedByAlias: string;
  inviteToken: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
}

// Session submission types
export interface SanctuarySubmission {
  id: string;
  sessionId: string;
  participantId: string;
  participantAlias: string;
  message: string;
  timestamp: string;
  approved?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
}

// Host dashboard types
export interface HostDashboardData {
  activeSessions: LiveSanctuarySession[];
  totalParticipants: number;
  averageSessionDuration: number;
  recentActivity: SanctuaryMessage[];
  moderationAlerts: AIModerationLog[];
}

// AI Moderation types
export interface ModerationEvent {
  id: string;
  sessionId: string;
  participantId: string;
  type: 'text' | 'audio' | 'behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  resolved: boolean;
  action?: 'warning' | 'mute' | 'remove' | 'ban';
}

export interface SanctuaryAlert {
  id: string;
  sessionId: string;
  type: 'inappropriate_content' | 'harassment' | 'spam' | 'crisis_detection' | 'technical_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  participantId?: string;
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ModerationAction {
  id: string;
  sessionId: string;
  action: 'warn' | 'mute' | 'kick' | 'ban' | 'end_session';
  moderatorId: string;
  targetParticipantId?: string;
  reason: string;
  timestamp: string;
  duration?: number;
}

export interface ModerationSettings {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  autoActions: {
    warning: boolean;
    mute: boolean;
    remove: boolean;
  };
  keywords: string[];
  allowedTopics: string[];
}

// Emergency protocols
export interface EmergencyProtocol {
  id: string;
  name: string;
  trigger: 'keyword' | 'ai_detection' | 'manual';
  actions: string[];
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CrisisEvent {
  id: string;
  sessionId: string;
  participantId: string;
  type: 'suicidal_ideation' | 'self_harm' | 'violence_threat' | 'medical_emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  responders: string[];
  resolved: boolean;
  resolution?: string;
}