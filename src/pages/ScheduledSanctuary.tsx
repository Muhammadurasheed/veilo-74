import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WaitingRoom } from '@/components/sanctuary/WaitingRoom';
import { ScheduledSanctuaryCreator } from '@/components/sanctuary/ScheduledSanctuaryCreator';
import { FlagshipLiveAudioSanctuary } from '@/components/sanctuary/FlagshipLiveAudioSanctuary';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Mic, 
  Shield,
  Heart,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface ScheduledSanctuaryPageProps {}

// Mock data - replace with API calls
const mockUpcomingSessions = [
  {
    id: 'session_1',
    topic: 'Evening Support Circle',
    description: 'A gentle space for sharing and mutual support',
    emoji: '💝',
    scheduledDateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    duration: 90,
    maxParticipants: 20,
    currentParticipants: 7,
    hostAlias: 'Sarah_M',
    status: 'scheduled' as 'scheduled' | 'starting' | 'live',
    allowAnonymous: true
  },
  {
    id: 'session_2',
    topic: 'Mental Wellness Check-in',
    description: 'Share how you\'re feeling in a judgment-free zone',
    emoji: '🧠',
    scheduledDateTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
    duration: 60,
    maxParticipants: 15,
    currentParticipants: 12,
    hostAlias: 'Alex_K',
    status: 'starting' as 'scheduled' | 'starting' | 'live',
    allowAnonymous: true
  },
  {
    id: 'session_3',
    topic: 'Weekend Motivation Session',
    description: 'Get energized and motivated for the weekend ahead',
    emoji: '🌟',
    scheduledDateTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    duration: 45,
    maxParticipants: 30,
    currentParticipants: 3,
    hostAlias: 'Jordan_P',
    status: 'scheduled' as 'scheduled' | 'starting' | 'live',
    allowAnonymous: true
  }
];

export const ScheduledSanctuaryPage: React.FC<ScheduledSanctuaryPageProps> = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const [showLiveSession, setShowLiveSession] = useState(false);
  const [upcomingSessions] = useState(mockUpcomingSessions);

  // If sessionId is provided, find and show that specific session
  React.useEffect(() => {
    if (sessionId) {
      const session = upcomingSessions.find(s => s.id === sessionId);
      if (session) {
        setSelectedSession(session);
        if (session.status === 'live') {
          setShowLiveSession(true);
        } else {
          setShowWaitingRoom(true);
        }
      }
    }
  }, [sessionId, upcomingSessions]);

  const handleJoinSession = (session: any) => {
    setSelectedSession(session);
    
    if (session.status === 'live') {
      setShowLiveSession(true);
    } else {
      setShowWaitingRoom(true);
    }
  };

  const handleJoinFromWaiting = () => {
    setShowWaitingRoom(false);
    setShowLiveSession(true);
  };

  const handleLeaveSession = () => {
    setShowLiveSession(false);
    setShowWaitingRoom(false);
    setSelectedSession(null);
    navigate('/sanctuary/scheduled');
  };

  const handleSessionCreated = (sessionData: any) => {
    setShowCreateDialog(false);
    toast({
      title: '✨ Sanctuary Created Successfully!',
      description: `Your session "${sessionData.topic}" has been scheduled.`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-100 text-green-800 border-green-200';
      case 'starting': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTimeUntilStart = (scheduledDateTime: string) => {
    const scheduled = new Date(scheduledDateTime);
    const now = new Date();
    const diffMs = scheduled.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    
    if (diffMins <= 0) return 'Starting now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.round(diffMins / 60)}h`;
    return `${Math.round(diffMins / 1440)}d`;
  };

  // Show live session if active
  if (showLiveSession && selectedSession) {
    return (
      <div>Live session placeholder - FlagshipLiveAudioSanctuary component needs completion</div>
    );
  }

  // Show waiting room if session is scheduled
  if (showWaitingRoom && selectedSession) {
    return (
      <WaitingRoom
        sessionData={selectedSession}
        onJoinSession={handleJoinFromWaiting}
        onLeave={() => {
          setShowWaitingRoom(false);
          setSelectedSession(null);
        }}
        currentParticipants={selectedSession.currentParticipants}
      />
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">Scheduled Sanctuaries</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join upcoming sessions or schedule your own safe space for meaningful conversations
          </p>
        </motion.div>

        {/* Create New Session Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Create a New Sanctuary</h3>
                    <p className="text-muted-foreground">Schedule a session for your community</p>
                  </div>
                </div>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Upcoming Sessions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingSessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="hover:shadow-lg transition-all duration-200 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-3xl">{session.emoji}</div>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status === 'live' ? 'Live Now' : 
                         session.status === 'starting' ? 'Starting Soon' : 
                         getTimeUntilStart(session.scheduledDateTime)}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{session.topic}</CardTitle>
                    {session.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {session.description}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Session details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{session.duration}m</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{session.currentParticipants}/{session.maxParticipants}</span>
                      </div>
                    </div>

                    {/* Host info */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span>Hosted by {session.hostAlias}</span>
                    </div>

                    {/* Join button */}
                    <Button
                      onClick={() => handleJoinSession(session)}
                      className="w-full group-hover:bg-primary/90 transition-colors"
                      variant={session.status === 'live' ? 'default' : 'outline'}
                    >
                      {session.status === 'live' ? (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Join Now
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4 mr-2" />
                          Join Session
                        </>
                      )}
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {upcomingSessions.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-12"
            >
              <div className="p-4 bg-muted/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Upcoming Sessions</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to schedule a sanctuary session for your community
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Session
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Create Session Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Create New Sanctuary Session
              </DialogTitle>
            </DialogHeader>
            <ScheduledSanctuaryCreator
              onSessionCreated={handleSessionCreated}
              onClose={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ScheduledSanctuaryPage;