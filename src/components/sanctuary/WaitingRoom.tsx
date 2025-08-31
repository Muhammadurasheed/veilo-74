import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow, isAfter, differenceInSeconds } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  Users, 
  Mic, 
  Shield, 
  Calendar,
  Timer,
  Bell,
  Check,
  Sparkles,
  Heart,
  MessageCircle
} from 'lucide-react';

interface WaitingRoomProps {
  sessionData: {
    id: string;
    topic: string;
    description?: string;
    emoji: string;
    scheduledDateTime: string;
    duration: number;
    maxParticipants: number;
    hostAlias?: string;
    guidelines?: string;
    allowAnonymous: boolean;
    status: 'scheduled' | 'starting' | 'live';
  };
  onJoinSession?: () => void;
  onLeave?: () => void;
  onNotifyMe?: () => void;
  currentParticipants?: number;
  userHasJoined?: boolean;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  sessionData,
  onJoinSession,
  onLeave,
  onNotifyMe,
  currentParticipants = 0,
  userHasJoined = false
}) => {
  const [timeUntilStart, setTimeUntilStart] = useState<string>('');
  const [isStartingSoon, setIsStartingSoon] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);

  const scheduledTime = new Date(sessionData.scheduledDateTime);
  const endTime = new Date(scheduledTime.getTime() + sessionData.duration * 60 * 1000);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const secondsUntil = differenceInSeconds(scheduledTime, now);

      if (secondsUntil <= 0) {
        setTimeUntilStart('Starting now...');
        setIsStartingSoon(true);
        return;
      }

      if (secondsUntil <= 300) { // 5 minutes
        setIsStartingSoon(true);
        const minutes = Math.floor(secondsUntil / 60);
        const seconds = secondsUntil % 60;
        setTimeUntilStart(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setIsStartingSoon(false);
        setTimeUntilStart(formatDistanceToNow(scheduledTime, { addSuffix: true }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [scheduledTime]);

  const handleNotifyMe = () => {
    setNotificationEnabled(true);
    onNotifyMe?.();
  };

  const getStatusColor = () => {
    if (sessionData.status === 'live') return 'bg-green-500';
    if (isStartingSoon) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const getStatusText = () => {
    if (sessionData.status === 'live') return 'Live Now';
    if (isStartingSoon) return 'Starting Soon';
    return 'Scheduled';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="overflow-hidden shadow-2xl border-0 bg-background/95 backdrop-blur">
          <CardHeader className="relative">
            {/* Status indicator */}
            <div className="absolute top-4 right-4">
              <Badge className={`${getStatusColor()} text-white border-0`}>
                <div className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                {getStatusText()}
              </Badge>
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-center mb-4"
            >
              <div className="text-6xl mb-4">{sessionData.emoji}</div>
              <CardTitle className="text-3xl font-bold text-foreground mb-2">
                {sessionData.topic}
              </CardTitle>
              {sessionData.description && (
                <p className="text-muted-foreground text-lg">
                  {sessionData.description}
                </p>
              )}
            </motion.div>

            {/* Countdown display */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={`text-center p-6 rounded-lg ${
                isStartingSoon 
                  ? 'bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200' 
                  : 'bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Timer className={`h-5 w-5 ${isStartingSoon ? 'text-orange-600' : 'text-blue-600'}`} />
                <span className={`font-medium ${isStartingSoon ? 'text-orange-900' : 'text-blue-900'}`}>
                  {sessionData.status === 'live' ? 'Session is live!' : 'Starts in'}
                </span>
              </div>
              <div className={`text-2xl font-bold ${isStartingSoon ? 'text-orange-800' : 'text-blue-800'}`}>
                {timeUntilStart}
              </div>
              {!isStartingSoon && (
                <div className="text-sm text-muted-foreground mt-1">
                  {format(scheduledTime, 'EEEE, MMMM do \'at\' h:mm a')}
                </div>
              )}
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Session details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Calendar className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Duration</div>
                <div className="text-xs text-muted-foreground">{sessionData.duration} min</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Participants</div>
                <div className="text-xs text-muted-foreground">
                  {currentParticipants}/{sessionData.maxParticipants}
                </div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Mic className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Voice Mode</div>
                <div className="text-xs text-muted-foreground">AI Enhanced</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <Shield className="h-5 w-5 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Privacy</div>
                <div className="text-xs text-muted-foreground">Anonymous</div>
              </div>
            </div>

            {/* Guidelines */}
            {sessionData.guidelines && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="p-4 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <span className="font-medium">Community Guidelines</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {sessionData.guidelines}
                </p>
              </motion.div>
            )}

            {/* Host info */}
            {sessionData.hostAlias && (
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {sessionData.hostAlias.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">Hosted by {sessionData.hostAlias}</div>
                  <div className="text-sm text-muted-foreground">Session moderator</div>
                </div>
              </div>
            )}

            <Separator />

            {/* Action buttons */}
            <div className="space-y-3">
              <AnimatePresence mode="wait">
                {sessionData.status === 'live' || isStartingSoon ? (
                  <motion.div
                    key="join"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Button
                      onClick={onJoinSession}
                      className="w-full h-12 text-lg font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                      size="lg"
                    >
                      <Mic className="h-5 w-5 mr-2" />
                      {userHasJoined ? 'Rejoin Sanctuary' : 'Join Sanctuary'}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="notify"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    <Button
                      onClick={handleNotifyMe}
                      disabled={notificationEnabled}
                      className="w-full h-12 text-lg font-medium"
                      variant={notificationEnabled ? "secondary" : "default"}
                      size="lg"
                    >
                      {notificationEnabled ? (
                        <>
                          <Check className="h-5 w-5 mr-2" />
                          Notification Set
                        </>
                      ) : (
                        <>
                          <Bell className="h-5 w-5 mr-2" />
                          Notify When Starting
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={onJoinSession}
                      variant="outline"
                      className="w-full"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Join Early (Chat Only)
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                onClick={onLeave}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
              >
                Leave Waiting Room
              </Button>
            </div>

            {/* Tips for new users */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">First time here?</span>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your voice will be AI-enhanced to protect your identity</li>
                <li>• You can raise your hand to speak or just listen</li>
                <li>• All conversations are moderated for safety</li>
                <li>• Feel free to leave anytime - no pressure!</li>
              </ul>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};