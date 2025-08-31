import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Play, Square, Volume2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  category: 'warm' | 'professional' | 'mysterious' | 'energetic';
  gender: 'male' | 'female' | 'neutral';
  accent?: string;
}

interface VoiceSelectorProps {
  selectedVoice: string;
  onVoiceSelect: (voiceId: string) => void;
  isPlaying?: boolean;
  onPreview?: (voiceId: string) => void;
  onStopPreview?: () => void;
  className?: string;
}

const voiceOptions: VoiceOption[] = [
  {
    id: '9BWtsMINqrJLrRacOk9x',
    name: 'Aria',
    description: 'Warm and empathetic, perfect for supportive conversations',
    category: 'warm',
    gender: 'female',
    accent: 'American'
  },
  {
    id: 'CwhRBWXzGAHq8TQ4Fs17',
    name: 'Roger',
    description: 'Professional and trustworthy, ideal for guidance sessions',
    category: 'professional',
    gender: 'male',
    accent: 'British'
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    description: 'Calm and soothing, great for meditation and relaxation',
    category: 'warm',
    gender: 'female',
    accent: 'American'
  },
  {
    id: 'IKne3meq5aSn9XLyUdCD',
    name: 'Charlie',
    description: 'Mysterious and intriguing, adds anonymity',
    category: 'mysterious',
    gender: 'neutral',
    accent: 'Neutral'
  },
  {
    id: 'TX3LPaxmHKxFdv7VOQHJ',
    name: 'Liam',
    description: 'Energetic and encouraging, uplifts the mood',
    category: 'energetic',
    gender: 'male',
    accent: 'Australian'
  },
  {
    id: 'XB0fDUnXU5powFXDhCwa',
    name: 'Charlotte',
    description: 'Professional yet approachable, versatile for any topic',
    category: 'professional',
    gender: 'female',
    accent: 'British'
  }
];

const categoryColors = {
  warm: 'bg-orange-100 text-orange-800 border-orange-200',
  professional: 'bg-blue-100 text-blue-800 border-blue-200',
  mysterious: 'bg-purple-100 text-purple-800 border-purple-200',
  energetic: 'bg-green-100 text-green-800 border-green-200'
};

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onVoiceSelect,
  isPlaying = false,
  onPreview,
  onStopPreview,
  className = ''
}) => {
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const handlePreview = (voiceId: string) => {
    if (previewingVoice === voiceId) {
      setPreviewingVoice(null);
      onStopPreview?.();
    } else {
      setPreviewingVoice(voiceId);
      onPreview?.(voiceId);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Choose Your Voice</h3>
        <Badge variant="secondary" className="ml-auto">
          AI Powered
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence>
          {voiceOptions.map((voice) => (
            <motion.div
              key={voice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedVoice === voice.id 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => onVoiceSelect(voice.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{voice.name}</h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${categoryColors[voice.category]}`}
                        >
                          {voice.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {voice.description}
                      </p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{voice.gender}</span>
                        {voice.accent && (
                          <>
                            <span>•</span>
                            <span>{voice.accent}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-3">
                      {selectedVoice === voice.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="flex items-center justify-center w-6 h-6 bg-primary rounded-full"
                        >
                          <Mic className="h-3 w-3 text-primary-foreground" />
                        </motion.div>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(voice.id);
                        }}
                      >
                        {previewingVoice === voice.id ? (
                          <Square className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-foreground">Voice Modulation Active</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your voice will be transformed in real-time to protect your identity while maintaining natural conversation flow.
        </p>
      </div>
    </div>
  );
};