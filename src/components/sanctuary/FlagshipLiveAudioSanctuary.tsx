import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAgoraAudio } from '@/hooks/useAgoraAudio';
import { useSanctuarySocket } from '@/hooks/useSanctuarySocket';
import { 
  Mic, MicOff, Volume2, VolumeX, Hand, Users, PhoneOff,
  Settings, AlertTriangle, Shield, Sparkles, Clock,
  MessageSquare, Share2, Calendar, Star
} from 'lucide-react';
import type { LiveSanctuarySession, LiveParticipant } from '@/types/sanctuary';

interface VoiceModulation {
  enabled: boolean;
  voiceId: string;
  voiceName: string;
  settings: {
    stability: number;
    similarity: number;
    style: number;
  };
}

export const FlagshipLiveAudioSanctuary: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [session, setSession] = useState<LiveSanctuarySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [voiceModulation, setVoiceModulation] = useState<VoiceModulation>({
    enabled: false,
    voiceId: 'anonymous_male',
    voiceName: 'Anonymous Voice',
    settings: { stability: 0.75, similarity: 0.75, style: 0.5 }
  });
  const [showChat, setShowChat] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);

  // Agora audio hook
  const {
    isConnected: audioConnected,
    isMuted,
    toggleMicrophone,
    connect: connectAudio,
    disconnect: disconnectAudio,
    audioStats,
    connectionQuality
  } = useAgoraAudio({ sessionId: sessionId || '', uid: Date.now() });

  // Socket connection
  const {
    onEvent,
    sendEmojiReaction,
    toggleHand,
    promoteToSpeaker,
    muteParticipant,
    kickParticipant,
    sendEmergencyAlert
  } = useSanctuarySocket({
    sessionId: sessionId || '',
    participant: {
      id: 'current-user',
      alias: 'User',
      isHost,
      isModerator: false
    }
  });

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/live-sanctuary/${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setSession(data.data.session);
        setParticipants(data.data.session.participants || []);
        setIsHost(searchParams.get('role') === 'host');
      } else {
        toast({
          title: "Session Not Found",
          description: "The audio sanctuary session could not be found.",
          variant: "destructive"
        });
        navigate('/sanctuary');
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to the sanctuary session.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, searchParams, toast, navigate]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Auto-connect audio when session loads
  useEffect(() => {
    if (session && !audioConnected) {
      connectAudio();
    }
  }, [session, audioConnected, connectAudio]);

  // Socket event listeners
  useEffect(() => {
    const cleanup = [
      onEvent('audio_participant_joined', (data) => {
        setParticipants(prev => [...prev, data.participant]);
        toast({
          title: "Participant Joined",
          description: `${data.participant.alias} joined the sanctuary`,
        });
      }),
      
      onEvent('audio_participant_left', (data) => {
        setParticipants(prev => prev.filter(p => p.id !== data.participantId));
      }),
      
      onEvent('emergency_alert', (data) => {
        setEmergencyMode(true);
        toast({
          title: "🚨 Emergency Alert",
          description: "Emergency assistance has been requested",
          variant: "destructive"
        });
      }),
      
      onEvent('hand_raised', (data) => {
        setParticipants(prev => prev.map(p => 
          p.id === data.participantId 
            ? { ...p, handRaised: data.isRaised }
            : p
        ));
      })
    ];

    return () => cleanup.forEach(fn => fn?.());
  }, [onEvent, toast]);

  const handleLeave = async () => {
    try {
      await disconnectAudio();
      navigate('/sanctuary');
      toast({
        title: "Left Sanctuary",
        description: "You have left the audio sanctuary",
      });
    } catch (error) {
      console.error('Failed to leave:', error);
    }
  };

  const handleVoiceChange = (newVoice: { id: string; name: string }) => {
    setVoiceModulation(prev => ({
      ...prev,
      voiceId: newVoice.id,
      voiceName: newVoice.name,
      enabled: true
    }));
    
    toast({
      title: "Voice Changed",
      description: `Now using ${newVoice.name} voice`,
    });
  };

  const handleEmergencyAlert = () => {
    sendEmergencyAlert('crisis', 'Emergency assistance requested');
    setEmergencyMode(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground">Connecting to sanctuary...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Session Not Available</h3>
            <p className="text-muted-foreground mb-4">
              This sanctuary session is no longer active or was not found.
            </p>
            <Button onClick={() => navigate('/sanctuary')}>
              Return to Sanctuaries
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <Card className="border-purple-200 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{session.emoji}</div>
                <div>
                  <CardTitle className="text-xl text-purple-800 dark:text-purple-200">
                    {session.topic}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Hosted by {session.hostAlias} • {participants.length} participants
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant={connectionQuality === 'excellent' ? 'default' : 'secondary'}>
                  {connectionQuality}
                </Badge>
                {voiceModulation.enabled && (
                  <Badge variant="outline" className="bg-purple-50">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Voice Modified
                  </Badge>
                )}
                {emergencyMode && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Emergency Mode
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Audio Controls */}
        <Card className="border-purple-200">
          <CardContent className="pt-6">
            <div className="flex justify-center space-x-4 mb-6">
              <Button
                size="lg"
                variant={isMuted ? "destructive" : "default"}
                onClick={toggleMicrophone}
                className="px-8 py-4 text-lg font-semibold"
              >
                {isMuted ? <MicOff className="h-6 w-6 mr-3" /> : <Mic className="h-6 w-6 mr-3" />}
                {isMuted ? 'Unmute' : 'Mute'}
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowChat(!showChat)}
                className="px-6 py-4"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Chat
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => {/* Voice settings modal */}}
                className="px-6 py-4"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Voice
              </Button>

              <Button
                size="lg"
                variant="destructive"
                onClick={handleLeave}
                className="px-6 py-4"
              >
                <PhoneOff className="h-5 w-5 mr-2" />
                Leave
              </Button>
            </div>

            {/* Audio Quality Indicator */}
            <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
              <span>Audio: {audioStats.audioLevel}%</span>
              <span>Network: {audioStats.networkQuality}/6</span>
              <span>Latency: {audioStats.rtt}ms</span>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Button */}
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/10">
          <CardContent className="pt-4 text-center">
            <Button
              variant="destructive"
              onClick={handleEmergencyAlert}
              className="bg-red-600 hover:bg-red-700"
              disabled={emergencyMode}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {emergencyMode ? 'Emergency Alert Sent' : 'Request Emergency Help'}
            </Button>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Use only in genuine emergencies
            </p>
          </CardContent>
        </Card>

        {/* Quick Reactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Reactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center space-x-3">
              {['👍', '❤️', '👏', '🤗', '💜', '🙏'].map((emoji) => (
                <Button
                  key={emoji}
                  variant="outline"
                  size="lg"
                  onClick={() => sendEmojiReaction(emoji)}
                  className="text-2xl h-12 w-12 p-0"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};