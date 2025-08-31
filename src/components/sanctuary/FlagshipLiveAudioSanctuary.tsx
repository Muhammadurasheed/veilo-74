import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAgoraAudio } from '@/hooks/useAgoraAudio';
import { useSanctuarySocket } from '@/hooks/useSanctuarySocket';
import { LiveSanctuaryApi } from '@/services/api';
import { VoiceModulationModal } from './VoiceModulationModal';
import { SanctuaryChat } from './SanctuaryChat';
import { EmergencyProtocols } from './EmergencyProtocols';
import { 
  Mic, MicOff, Volume2, VolumeX, Hand, Users, PhoneOff,
  Settings, AlertTriangle, Shield, Sparkles, Clock,
  MessageSquare, Share2, Calendar, Star, Crown, Zap
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
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [handRaised, setHandRaised] = useState(false);

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
      const response = await LiveSanctuaryApi.getSession(sessionId);
      
      if (response.success && response.data) {
        setSession(response.data.session);
        setParticipants(response.data.session.participants || []);
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
      }),

      onEvent('sanctuary_new_message', (message) => {
        setChatMessages(prev => [...prev, message]);
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

  const handleVoiceChange = (newVoice: { 
    id: string; 
    name: string; 
    voiceId: string; 
    settings: any 
  }) => {
    setVoiceModulation(prev => ({
      ...prev,
      voiceId: newVoice.voiceId,
      voiceName: newVoice.name,
      enabled: true,
      settings: newVoice.settings
    }));
    
    toast({
      title: "Voice Changed",
      description: `Now using ${newVoice.name} voice`,
    });
  };

  const handleToggleVoiceModulation = (enabled: boolean) => {
    setVoiceModulation(prev => ({
      ...prev,
      enabled
    }));
  };

  const handleToggleHand = () => {
    const newState = !handRaised;
    setHandRaised(newState);
    toggleHand(newState);
  };

  const handleSendMessage = (content: string, type = 'text') => {
    // In a real implementation, this would send through socket
    const message = {
      id: `msg_${Date.now()}`,
      participantId: 'current-user',
      participantAlias: 'You',
      content,
      type,
      timestamp: new Date().toISOString(),
      isHost
    };
    setChatMessages(prev => [...prev, message]);
  };

  const handleParticipantAction = (participantId: string, action: string) => {
    switch (action) {
      case 'mute':
        muteParticipant(participantId);
        break;
      case 'kick':
        kickParticipant(participantId);
        break;
      case 'promote':
        promoteToSpeaker(participantId);
        break;
    }
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
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto p-4">
          <div className={`grid gap-6 ${showChat ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} transition-all duration-300`}>
            
            {/* Main Audio Interface */}
            <div className={showChat ? 'lg:col-span-2' : 'lg:col-span-1'}>
              <div className="space-y-6">
                {/* Header */}
                <Card className="border-purple-200 shadow-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-4xl animate-pulse">{session.emoji}</div>
                        <div>
                          <CardTitle className="text-2xl text-purple-800 dark:text-purple-200 flex items-center gap-2">
                            {session.topic}
                            {isHost && <Crown className="h-5 w-5 text-yellow-500" />}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Hosted by {session.hostAlias} • {participants.length} participants
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge variant={connectionQuality === 'excellent' ? 'default' : 'secondary'} className="animate-pulse">
                          <Zap className="h-3 w-3 mr-1" />
                          {connectionQuality}
                        </Badge>
                        {voiceModulation.enabled && (
                          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/50">
                            <Sparkles className="h-3 w-3 mr-1" />
                            {voiceModulation.voiceName}
                          </Badge>
                        )}
                        {emergencyMode && (
                          <Badge variant="destructive" className="animate-pulse">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Emergency Mode
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Main Audio Controls */}
                <Card className="border-purple-200 shadow-xl">
                  <CardContent className="pt-8">
                    <div className="flex justify-center space-x-6 mb-8">
                      <Button
                        size="lg"
                        variant={isMuted ? "destructive" : "default"}
                        onClick={toggleMicrophone}
                        className="px-10 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        {isMuted ? <MicOff className="h-8 w-8 mr-4" /> : <Mic className="h-8 w-8 mr-4" />}
                        {isMuted ? 'Unmute' : 'Mute'}
                      </Button>
                      
                      <Button
                        size="lg"
                        variant={handRaised ? "default" : "outline"}
                        onClick={handleToggleHand}
                        className="px-6 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Hand className={`h-6 w-6 mr-2 ${handRaised ? 'animate-bounce' : ''}`} />
                        {handRaised ? 'Lower Hand' : 'Raise Hand'}
                      </Button>
                    </div>

                    <div className="flex justify-center space-x-4 mb-8">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setShowChat(!showChat)}
                        className="px-6 py-4 shadow-md hover:shadow-lg transition-all"
                      >
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Chat ({chatMessages.length})
                      </Button>

                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setShowVoiceModal(true)}
                        className="px-6 py-4 shadow-md hover:shadow-lg transition-all"
                      >
                        <Sparkles className="h-5 w-5 mr-2" />
                        Voice Settings
                      </Button>

                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={handleLeave}
                        className="px-6 py-4 shadow-md hover:shadow-lg transition-all"
                      >
                        <PhoneOff className="h-5 w-5 mr-2" />
                        Leave
                      </Button>
                    </div>

                    {/* Audio Quality Indicator */}
                    <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4" />
                        Audio: {audioStats.audioLevel}%
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Quality: {audioStats.networkQuality}/6
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Latency: {audioStats.rtt}ms
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Participants Grid */}
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Participants ({participants.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {participants.map((participant) => (
                        <Card key={participant.id} className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                          <div className="flex flex-col items-center space-y-2">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={`/avatars/avatar-${participant.avatarIndex || 1}.svg`} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-indigo-400 text-white">
                                {participant.alias?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                              <p className="text-sm font-semibold truncate max-w-20">{participant.alias}</p>
                              <div className="flex items-center justify-center space-x-1 mt-1">
                                {participant.isHost && <Crown className="h-3 w-3 text-yellow-500" />}
                                {participant.isModerator && <Shield className="h-3 w-3 text-blue-500" />}
                                {participant.isMuted && <MicOff className="h-3 w-3 text-red-500" />}
                                {participant.handRaised && <Hand className="h-3 w-3 text-orange-500 animate-bounce" />}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Emergency Section */}
                <Card className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                      <div className="flex justify-center space-x-4">
                        <Button
                          variant="destructive"
                          onClick={handleEmergencyAlert}
                          className="bg-red-600 hover:bg-red-700 shadow-lg"
                          disabled={emergencyMode}
                        >
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          {emergencyMode ? 'Emergency Alert Sent' : 'Request Emergency Help'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowEmergencyModal(true)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Safety Resources
                        </Button>
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Use emergency features only in genuine crisis situations
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Reactions */}
                <Card className="border-indigo-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      Quick Reactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center flex-wrap gap-3">
                      {['👍', '❤️', '👏', '🤗', '💜', '🙏', '🎉', '✨'].map((emoji) => (
                        <Button
                          key={emoji}
                          variant="outline"
                          size="lg"
                          onClick={() => sendEmojiReaction(emoji)}
                          className="text-3xl h-14 w-14 p-0 hover:scale-110 transition-transform shadow-md"
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Chat Sidebar */}
            {showChat && (
              <div className="lg:col-span-1">
                <SanctuaryChat
                  sessionId={sessionId || ''}
                  currentUser={{
                    id: 'current-user',
                    alias: 'You',
                    isHost,
                    isModerator: false
                  }}
                  participants={participants}
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  onParticipantAction={handleParticipantAction}
                  emergencyMode={emergencyMode}
                  className="h-[calc(100vh-2rem)] sticky top-4"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Modulation Modal */}
      <VoiceModulationModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        currentVoice={{ id: voiceModulation.voiceId, name: voiceModulation.voiceName }}
        onVoiceChange={handleVoiceChange}
        isEnabled={voiceModulation.enabled}
        onToggleEnabled={handleToggleVoiceModulation}
      />

      <EmergencyProtocols
        sessionId={sessionId || ''}
        isHost={isHost}
        emergencyMode={emergencyMode}
        onClose={() => setShowEmergencyModal(false)}
      />
    </>
  );
};