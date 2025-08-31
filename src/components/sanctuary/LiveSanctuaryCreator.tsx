import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  Users, 
  Shield, 
  Clock,
  AlertTriangle
} from 'lucide-react';
import { SanctuaryApi as LiveSanctuaryApi } from '@/services/api';

interface LiveSanctuaryFormData {
  topic: string;
  description?: string;
  emoji: string;
  maxParticipants: number;
  audioOnly: boolean;
  allowAnonymous: boolean;
  moderationEnabled: boolean;
  emergencyContactEnabled: boolean;
  expireHours: number;
}

interface CreationState {
  status: 'idle' | 'creating' | 'success' | 'error';
  sessionId?: string;
  error?: string;
}

const LiveSanctuaryCreator: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [creationState, setCreationState] = useState<CreationState>({ status: 'idle' });

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LiveSanctuaryFormData>({
    defaultValues: {
      topic: '',
      description: '',
      emoji: '🎙️',
      maxParticipants: 50,
      audioOnly: true,
      allowAnonymous: true,
      moderationEnabled: true,
      emergencyContactEnabled: true,
      expireHours: 1,
    },
  });

  // EXACT PATTERN FROM WORKING ANONYMOUS SANCTUARY
  const onSubmit = async (data: LiveSanctuaryFormData) => {
    setIsCreating(true);
    
    try {
      console.log('🎙️ Creating live sanctuary session:', data);
      
      const response = await LiveSanctuaryApi.createSession({
        topic: data.topic,
        description: data.description,
        emoji: data.emoji,
        maxParticipants: data.maxParticipants,
        audioOnly: data.audioOnly,
        allowAnonymous: data.allowAnonymous,
        moderationEnabled: data.moderationEnabled,
        emergencyContactEnabled: data.emergencyContactEnabled,
        expireHours: data.expireHours,
      });

      console.log('📡 Live sanctuary creation response:', response);

      // EXACT PATTERN FROM WORKING ANONYMOUS SANCTUARY
      if (response.success && response.data) {
        // Store host token in localStorage with expiry if this is an anonymous host
        if (response.data.hostToken) {
          const expiryDate = new Date();
          expiryDate.setHours(expiryDate.getHours() + 48); // 48 hours
          
          localStorage.setItem(`live-sanctuary-host-${response.data.id}`, response.data.hostToken);
          localStorage.setItem(`live-sanctuary-host-${response.data.id}-expires`, expiryDate.toISOString());
        }
        
        toast({
          title: 'Live Sanctuary Created',
          description: `Your live audio session "${data.topic}" is now active.`,
        });

        // Navigate using the EXACT SAME PATTERN as anonymous sanctuary
        const sessionId = response.data.id; // SAME AS WORKING ANONYMOUS SANCTUARY
        console.log('✅ Session created successfully, navigating to:', sessionId);
        
        navigate(`/sanctuary/live/${sessionId}?role=host`);
      } else {
        console.error('❌ Invalid response structure:', {
          success: response.success,
          hasData: !!response.data,
          error: response.error,
          fullResponse: response
        });
        
        throw new Error(response.error || 'Failed to create live sanctuary session');
      }
    } catch (error: any) {
      console.error('❌ Live sanctuary creation failed:', error);
      
      toast({
        title: 'Failed to create live sanctuary',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
      
      setCreationState({ 
        status: 'error', 
        error: error.message || 'Unknown error occurred' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const watchedValues = watch();

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="border-purple-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🎙️</div>
          <CardTitle className="text-2xl text-purple-700">Create Live Audio Sanctuary</CardTitle>
          <p className="text-gray-600">
            Start a real-time audio session for meaningful conversations and support
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Topic */}
            <div>
              <Label htmlFor="topic" className="text-sm font-medium">
                Sanctuary Topic *
              </Label>
              <Input
                id="topic"
                {...register('topic', { 
                  required: 'Topic is required',
                  minLength: { value: 3, message: 'Topic must be at least 3 characters' }
                })}
                placeholder="What will you discuss? (e.g., Anxiety Support)"
                className="mt-1"
              />
              {errors.topic && (
                <p className="text-red-500 text-sm mt-1">{errors.topic.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Provide more context about your sanctuary..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Emoji */}
            <div>
              <Label htmlFor="emoji" className="text-sm font-medium">
                Sanctuary Emoji
              </Label>
              <Input
                id="emoji"
                {...register('emoji')}
                placeholder="🎙️"
                className="mt-1 text-center text-2xl"
                maxLength={2}
              />
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Max Participants */}
              <div>
                <Label htmlFor="maxParticipants" className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Max Participants
                </Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  {...register('maxParticipants', { 
                    required: true, 
                    min: { value: 2, message: 'Minimum 2 participants' },
                    max: { value: 100, message: 'Maximum 100 participants' }
                  })}
                  min={2}
                  max={100}
                  className="mt-1"
                />
                {errors.maxParticipants && (
                  <p className="text-red-500 text-sm mt-1">{errors.maxParticipants.message}</p>
                )}
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="expireHours" className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration (Hours)
                </Label>
                <Input
                  id="expireHours"
                  type="number"
                  {...register('expireHours', { 
                    required: true,
                    min: { value: 0.5, message: 'Minimum 30 minutes' },
                    max: { value: 24, message: 'Maximum 24 hours' }
                  })}
                  min={0.5}
                  max={24}
                  step={0.5}
                  className="mt-1"
                />
                {errors.expireHours && (
                  <p className="text-red-500 text-sm mt-1">{errors.expireHours.message}</p>
                )}
              </div>
            </div>

            {/* Settings Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-purple-600" />
                  <Label htmlFor="audioOnly" className="text-sm font-medium">
                    Audio Only Mode
                  </Label>
                </div>
                <Switch
                  id="audioOnly"
                  {...register('audioOnly')}
                  checked={watchedValues.audioOnly}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <Label htmlFor="allowAnonymous" className="text-sm font-medium">
                    Allow Anonymous Participants
                  </Label>
                </div>
                <Switch
                  id="allowAnonymous"
                  {...register('allowAnonymous')}
                  checked={watchedValues.allowAnonymous}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <Label htmlFor="moderationEnabled" className="text-sm font-medium">
                    AI Moderation
                  </Label>
                </div>
                <Switch
                  id="moderationEnabled"
                  {...register('moderationEnabled')}
                  checked={watchedValues.moderationEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <Label htmlFor="emergencyContactEnabled" className="text-sm font-medium">
                    Emergency Contact System
                  </Label>
                </div>
                <Switch
                  id="emergencyContactEnabled"
                  {...register('emergencyContactEnabled')}
                  checked={watchedValues.emergencyContactEnabled}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Creating Live Sanctuary...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Create Live Audio Sanctuary
                </>
              )}
            </Button>
          </form>

          {/* Error State */}
          {creationState.status === 'error' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                {creationState.error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveSanctuaryCreator;