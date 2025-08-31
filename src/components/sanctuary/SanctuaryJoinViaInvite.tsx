import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Shield, Users, Clock, AlertCircle, Loader2, 
  CheckCircle2, ArrowRight, Heart, Headphones
} from 'lucide-react';
import { useAuth } from '@/contexts/optimized/AuthContextRefactored';
import { toast } from '@/hooks/use-toast';
import api, { SanctuaryApi } from '@/services/api';

interface InvitationPreview {
  sessionTopic: string;
  sessionDescription: string;
  emoji: string;
  hostAlias: string;
  currentParticipants: number;
  maxParticipants: number;
  expiresAt: string;
  isActive: boolean;
  hasSpace: boolean;
}

const SanctuaryJoinViaInvite = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (inviteCode) {
      loadInvitationPreview();
    }
  }, [inviteCode]);

  const loadInvitationPreview = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/api/sanctuary-invitations/preview/${inviteCode}`);
      
      if (response.data.success) {
        setPreview(response.data.data.preview);
      } else {
        setError(response.data.error || 'Invalid invitation');
      }
    } catch (error: any) {
      console.error('Error loading invitation preview:', error);
      setError(error.response?.data?.error || 'Failed to load invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSanctuary = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to join this sanctuary session.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsJoining(true);
      
      const response = await api.post(`/api/sanctuary-invitations/join/${inviteCode}`);
      
      if (response.data.success) {
        const { session, redirectUrl } = response.data.data;
        
        toast({
          title: 'Welcome to the Sanctuary! 🕊️',
          description: `You've joined "${session.topic}" successfully.`,
        });
        
        // Navigate to the live sanctuary session
        navigate(redirectUrl);
      } else {
        throw new Error(response.data.error || 'Failed to join sanctuary');
      }
    } catch (error: any) {
      console.error('Error joining sanctuary:', error);
      toast({
        title: 'Failed to Join',
        description: error.response?.data?.error || error.message || 'Could not join sanctuary session.',
        variant: 'destructive',
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Loading Invitation</h3>
            <p className="text-muted-foreground">Verifying sanctuary access...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-destructive">Invalid Invitation</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/')} variant="outline">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  const timeRemaining = new Date(preview.expiresAt).getTime() - new Date().getTime();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const isExpiringSoon = hoursRemaining < 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Sanctuary Invitation</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              You've Been Invited
            </h1>
            <p className="text-muted-foreground">
              Join a safe, supportive mental health conversation
            </p>
          </div>

          {/* Invitation Card */}
          <Card className="bg-gradient-to-br from-card to-primary/5 border border-primary/20 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="text-6xl mb-4">{preview.emoji}</div>
              <CardTitle className="text-2xl font-bold">{preview.sessionTopic}</CardTitle>
              <CardDescription className="text-lg">
                {preview.sessionDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Host Info */}
              <div className="flex items-center justify-center space-x-3 p-4 rounded-xl bg-muted/30">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`/avatars/avatar-1.svg`} />
                  <AvatarFallback>{preview.hostAlias.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Hosted by {preview.hostAlias}</p>
                  <p className="text-sm text-muted-foreground">Verified Community Host</p>
                </div>
              </div>

              {/* Session Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="font-semibold text-primary">
                    {preview.currentParticipants}/{preview.maxParticipants}
                  </p>
                  <p className="text-sm text-muted-foreground">Participants</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-accent/10">
                  <Clock className="h-6 w-6 text-accent mx-auto mb-2" />
                  <p className="font-semibold text-accent">
                    {hoursRemaining > 0 ? `${hoursRemaining}h` : 'Ending soon'}
                  </p>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                </div>
              </div>

              {/* Status Alerts */}
              {!preview.isActive && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This sanctuary session is no longer active.
                  </AlertDescription>
                </Alert>
              )}

              {!preview.hasSpace && preview.isActive && (
                <Alert variant="destructive">
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    This sanctuary session is currently full. Please try again later.
                  </AlertDescription>
                </Alert>
              )}

              {isExpiringSoon && preview.isActive && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    This invitation expires soon. Join now to secure your spot.
                  </AlertDescription>
                </Alert>
              )}

              {/* Features */}
              <div className="space-y-3">
                <h4 className="font-semibold text-center">What to Expect</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/20">
                    <Heart className="h-5 w-5 text-red-500" />
                    <span className="text-sm">Supportive, judgment-free environment</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/20">
                    <Shield className="h-5 w-5 text-blue-500" />
                    <span className="text-sm">AI-moderated for safety and respect</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/20">
                    <Headphones className="h-5 w-5 text-green-500" />
                    <span className="text-sm">Audio-only for complete anonymity</span>
                  </div>
                </div>
              </div>

              {/* Join Button */}
              <div className="text-center pt-4">
                {preview.isActive && preview.hasSpace ? (
                  <Button
                    onClick={handleJoinSanctuary}
                    disabled={isJoining || !isAuthenticated}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg px-8 py-6 text-lg font-semibold w-full"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                        Joining Sanctuary...
                      </>
                    ) : (
                      <>
                        <Heart className="mr-3 h-5 w-5" />
                        Join Sanctuary
                        <ArrowRight className="ml-3 h-5 w-5" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button disabled size="lg" variant="outline" className="w-full">
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Cannot Join Session
                  </Button>
                )}
                
                {!isAuthenticated && (
                  <p className="text-sm text-muted-foreground mt-3">
                    You need to sign in to join sanctuary sessions
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-full">
              <Shield className="h-4 w-4" />
              <span>Your identity remains completely anonymous</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SanctuaryJoinViaInvite;