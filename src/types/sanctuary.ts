// Sanctuary-specific types

export interface AIModerationLog {
  id: string;
  sessionId: string;
  content: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'none' | 'warning' | 'mute' | 'kick' | 'ban';
  timestamp: string;
  moderatorId?: string;
  resolved: boolean;
}

export interface SanctuaryAlert {
  id: string;
  type: 'crisis' | 'conflict' | 'spam' | 'inappropriate';
  sessionId: string;
  participantId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
}

export interface ModerationAction {
  id: string;
  type: 'warning' | 'mute' | 'kick' | 'ban';
  sessionId: string;
  targetId: string;
  moderatorId: string;
  reason: string;
  timestamp: string;
  duration?: number;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  topic?: string;
  currentParticipants: number;
  maxParticipants: number;
  createdAt: string;
  isActive: boolean;
  isPrivate: boolean;
  hostId: string;
  participants: string[];
}

export interface SessionRecording {
  id: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  fileUrl?: string;
  transcriptUrl?: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  isActive: boolean;
}

export interface LiveSanctuarySession {
  id: string;
  topic: string;
  description?: string;
  emoji?: string;
  hostId: string;
  hostAlias: string;
  createdAt: string;
  startTime?: string;
  isActive: boolean;
  status?: 'pending' | 'active' | 'ended';
  mode: 'public' | 'private' | 'invite-only';
  participants: LiveParticipant[];
  maxParticipants: number;
  currentParticipants?: number;
  estimatedDuration?: number;
  tags?: string[];
  language?: string;
  expiresAt?: string;
  allowAnonymous?: boolean;
  recordingConsent?: boolean;
  aiMonitoring?: boolean;
  moderationLevel?: 'low' | 'medium' | 'high' | 'strict';
  emergencyProtocols?: boolean;
  isRecorded?: boolean;
  hostToken?: string;
  agoraChannelName?: string;
  agoraToken?: string;
  audioOnly?: boolean;
  breakoutRooms?: any[];
  moderationEnabled?: boolean;
  emergencyContactEnabled?: boolean;
}

export interface LiveParticipant {
  id: string;
  alias: string;
  avatarIndex?: number;
  joinedAt: string;
  isHost: boolean;
  isMuted: boolean;
  isModerator?: boolean;
  isBlocked?: boolean;
  audioLevel?: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  handRaised?: boolean;
  speakingTime?: number;
  reactions: EmojiReaction[];
  isAnonymous?: boolean;
  micPermission?: 'granted' | 'denied' | 'pending';
}

export interface ChatParticipant {
  id: string;
  alias: string;
  isHost: boolean;
  isAnonymous: boolean;
  joinedAt: string;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

export interface EmojiReaction {
  id: string;
  emoji: string;
  participantId: string;
  timestamp: string;
  duration?: number;
}

// Socket service interface for real-time features
export interface SocketService {
  on(event: string, callback: Function): void;
  off(event: string, callback?: Function): void;
  emit(event: string, data?: any): void;
  disconnect(): void;
}