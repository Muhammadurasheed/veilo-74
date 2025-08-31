import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles, Volume2, Settings, Waves, Mic,
  User, Users, Bot, Baby, Zap, Shield
} from 'lucide-react';

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  voiceId: string;
  category: 'anonymous' | 'character' | 'professional';
  premium?: boolean;
}

interface VoiceSettings {
  stability: number;
  similarity: number;
  style: number;
  speakerBoost: boolean;
}

interface VoiceModulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVoice: { id: string; name: string };
  onVoiceChange: (voice: { id: string; name: string; voiceId: string; settings: VoiceSettings }) => void;
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'original',
    name: 'Original Voice',
    description: 'Your natural voice without modulation',
    icon: <Mic className="h-5 w-5" />,
    voiceId: 'original',
    category: 'professional'
  },
  {
    id: 'anonymous_male',
    name: 'Anonymous Male',
    description: 'Professional male voice for privacy',
    icon: <User className="h-5 w-5" />,
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
    category: 'anonymous'
  },
  {
    id: 'anonymous_female',
    name: 'Anonymous Female',
    description: 'Professional female voice for privacy',
    icon: <Users className="h-5 w-5" />,
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    category: 'anonymous'
  },
  {
    id: 'warm_companion',
    name: 'Warm Companion',
    description: 'Gentle, supportive voice for comfort',
    icon: <Shield className="h-5 w-5" />,
    voiceId: 'pFZP5JQG7iQjIQuC4Bku', // Lily
    category: 'character'
  },
  {
    id: 'wise_mentor',
    name: 'Wise Mentor',
    description: 'Experienced, calming guidance voice',
    icon: <Sparkles className="h-5 w-5" />,
    voiceId: 'JBFqnCBsd6RMkjVDRZzb', // George
    category: 'character'
  },
  {
    id: 'energetic_friend',
    name: 'Energetic Friend',
    description: 'Upbeat, encouraging voice',
    icon: <Zap className="h-5 w-5" />,
    voiceId: 'TX3LPaxmHKxFdv7VOQHJ', // Liam
    category: 'character',
    premium: true
  },
  {
    id: 'ai_assistant',
    name: 'AI Assistant',
    description: 'Neutral, robotic voice',
    icon: <Bot className="h-5 w-5" />,
    voiceId: 'cgSgspJ2msm6clMCkdW9', // Jessica
    category: 'character',
    premium: true
  }
];

export const VoiceModulationModal: React.FC<VoiceModulationModalProps> = ({
  isOpen,
  onClose,
  currentVoice,
  onVoiceChange,
  isEnabled,
  onToggleEnabled
}) => {
  const { toast } = useToast();
  const [selectedVoice, setSelectedVoice] = useState(currentVoice.id);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    stability: 0.75,
    similarity: 0.75,
    style: 0.5,
    speakerBoost: true
  });
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<string | null>(null);

  const handleVoiceSelect = useCallback((voice: VoiceOption) => {
    setSelectedVoice(voice.id);
  }, []);

  const handlePreviewVoice = useCallback(async (voice: VoiceOption) => {
    if (voice.id === 'original') {
      toast({
        title: "Original Voice",
        description: "This is your natural voice - no preview needed",
      });
      return;
    }

    setIsPreviewPlaying(voice.id);
    
    try {
      // In a real implementation, this would play a preview using ElevenLabs
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate audio playback
      
      toast({
        title: "Voice Preview",
        description: `Playing preview of ${voice.name}`,
      });
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: "Unable to preview voice. It will work in the live session.",
        variant: "destructive"
      });
    } finally {
      setIsPreviewPlaying(null);
    }
  }, [toast]);

  const handleApplyVoice = useCallback(() => {
    const selectedOption = VOICE_OPTIONS.find(v => v.id === selectedVoice);
    if (!selectedOption) return;

    onVoiceChange({
      id: selectedOption.id,
      name: selectedOption.name,
      voiceId: selectedOption.voiceId,
      settings: voiceSettings
    });

    toast({
      title: "Voice Updated",
      description: `Voice changed to ${selectedOption.name}`,
    });

    onClose();
  }, [selectedVoice, voiceSettings, onVoiceChange, onClose, toast]);

  const groupedVoices = VOICE_OPTIONS.reduce((acc, voice) => {
    if (!acc[voice.category]) acc[voice.category] = [];
    acc[voice.category].push(voice);
    return acc;
  }, {} as Record<string, VoiceOption[]>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Voice Modulation Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Voice Modulation Toggle */}
          <Card className="border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">Voice Modulation</h3>
                  <p className="text-sm text-muted-foreground">
                    Transform your voice for privacy and expression
                  </p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={onToggleEnabled}
                  className="scale-125"
                />
              </div>
            </CardContent>
          </Card>

          {isEnabled && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
                {/* Voice Categories */}
                {Object.entries(groupedVoices).map(([category, voices]) => (
                  <Card key={category} className="border-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg capitalize flex items-center gap-2">
                        {category === 'anonymous' && <Shield className="h-5 w-5" />}
                        {category === 'character' && <Users className="h-5 w-5" />}
                        {category === 'professional' && <Mic className="h-5 w-5" />}
                        {category} Voices
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {voices.map((voice) => (
                          <motion.div
                            key={voice.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Card
                              className={`cursor-pointer transition-all ${
                                selectedVoice === voice.id
                                  ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                              onClick={() => handleVoiceSelect(voice)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                      {voice.icon}
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-sm">{voice.name}</h4>
                                      {voice.premium && (
                                        <Badge variant="secondary" className="text-xs mt-1">
                                          Premium
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {selectedVoice === voice.id && (
                                    <div className="h-4 w-4 bg-purple-600 rounded-full flex items-center justify-center">
                                      <div className="h-2 w-2 bg-white rounded-full" />
                                    </div>
                                  )}
                                </div>
                                
                                <p className="text-xs text-muted-foreground mb-3">
                                  {voice.description}
                                </p>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreviewVoice(voice);
                                  }}
                                  disabled={isPreviewPlaying === voice.id || voice.id === 'original'}
                                  className="w-full text-xs"
                                >
                                  {isPreviewPlaying === voice.id ? (
                                    <>
                                      <Waves className="h-3 w-3 mr-1 animate-pulse" />
                                      Playing...
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="h-3 w-3 mr-1" />
                                      {voice.id === 'original' ? 'No Preview' : 'Preview'}
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Advanced Settings */}
                {selectedVoice !== 'original' && (
                  <Card className="border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Advanced Voice Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Stability: {voiceSettings.stability.toFixed(2)}
                        </Label>
                        <Slider
                          value={[voiceSettings.stability]}
                          onValueChange={([value]) => 
                            setVoiceSettings(prev => ({ ...prev, stability: value }))
                          }
                          min={0}
                          max={1}
                          step={0.01}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Higher values make the voice more consistent but less expressive
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Similarity: {voiceSettings.similarity.toFixed(2)}
                        </Label>
                        <Slider
                          value={[voiceSettings.similarity]}
                          onValueChange={([value]) => 
                            setVoiceSettings(prev => ({ ...prev, similarity: value }))
                          }
                          min={0}
                          max={1}
                          step={0.01}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          How closely the generated voice matches the original
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Style Enhancement: {voiceSettings.style.toFixed(2)}
                        </Label>
                        <Slider
                          value={[voiceSettings.style]}
                          onValueChange={([value]) => 
                            setVoiceSettings(prev => ({ ...prev, style: value }))
                          }
                          min={0}
                          max={1}
                          step={0.01}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Amplifies the character and emotion of the voice
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Speaker Boost</Label>
                          <p className="text-xs text-muted-foreground">
                            Enhance voice clarity and presence
                          </p>
                        </div>
                        <Switch
                          checked={voiceSettings.speakerBoost}
                          onCheckedChange={(checked) => 
                            setVoiceSettings(prev => ({ ...prev, speakerBoost: checked }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplyVoice}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Apply Voice Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};