import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, addMinutes, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Mic, 
  Shield, 
  Copy, 
  ExternalLink,
  Sparkles,
  Heart,
  Brain,
  MessageCircle,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduledSanctuaryCreatorProps {
  onSessionCreated?: (sessionData: any) => void;
  onClose?: () => void;
}

const topicEmojis = [
  { emoji: '💝', label: 'Support & Care', category: 'support' },
  { emoji: '🧠', label: 'Mental Health', category: 'mental' },
  { emoji: '💬', label: 'Open Discussion', category: 'discussion' },
  { emoji: '🌟', label: 'Inspiration', category: 'inspiration' },
  { emoji: '🤝', label: 'Friendship', category: 'social' },
  { emoji: '📚', label: 'Learning & Growth', category: 'growth' },
  { emoji: '💪', label: 'Motivation', category: 'motivation' },
  { emoji: '🌈', label: 'LGBTQ+ Support', category: 'lgbtq' },
  { emoji: '👥', label: 'Community', category: 'community' },
  { emoji: '🎯', label: 'Goals & Dreams', category: 'goals' }
];

const durationOptions = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' }
];

export const ScheduledSanctuaryCreator: React.FC<ScheduledSanctuaryCreatorProps> = ({
  onSessionCreated,
  onClose
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    topic: '',
    description: '',
    emoji: '💝',
    scheduledDate: null as Date | null,
    scheduledTime: '',
    duration: 60,
    maxParticipants: 20,
    allowAnonymous: true,
    requireApproval: false,
    enableRecording: false,
    tags: [] as string[],
    guidelines: ''
  });

  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  const handleEmojiSelect = (emoji: string) => {
    setFormData(prev => ({ ...prev, emoji }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, scheduledDate: date }));
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const now = new Date();
    const startHour = now.getHours() + 1; // Start from next hour

    for (let hour = startHour; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }

    // Add next day slots if current day doesn't have enough options
    if (slots.length < 10) {
      for (let hour = 0; hour < 12; hour++) {
        for (let minute of [0, 30]) {
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push(timeString);
        }
      }
    }

    return slots;
  };

  const createScheduledSanctuary = async () => {
    setIsCreating(true);
    
    try {
      // Combine date and time
      const [hours, minutes] = formData.scheduledTime.split(':').map(Number);
      const scheduledDateTime = new Date(formData.scheduledDate!);
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      const sessionData = {
        ...formData,
        scheduledDateTime: scheduledDateTime.toISOString(),
        id: `sanctuary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        status: 'scheduled'
      };

      // Simulate API call - replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate invite link
      const inviteLink = `${window.location.origin}/sanctuary/join/${sessionData.id}`;
      setGeneratedInviteLink(inviteLink);

      toast({
        title: '🎉 Sanctuary Scheduled Successfully!',
        description: `Your session "${formData.topic}" is scheduled for ${format(scheduledDateTime, 'PPp')}`,
        duration: 5000
      });

      setStep(4); // Move to success step
      onSessionCreated?.(sessionData);

    } catch (error) {
      console.error('Error creating scheduled sanctuary:', error);
      toast({
        title: 'Creation Failed',
        description: 'Unable to schedule your sanctuary. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(generatedInviteLink);
    toast({
      title: 'Link Copied!',
      description: 'Invite link has been copied to your clipboard',
    });
  };

  const isValidDateTime = () => {
    if (!formData.scheduledDate || !formData.scheduledTime) return false;
    
    const [hours, minutes] = formData.scheduledTime.split(':').map(Number);
    const scheduledDateTime = new Date(formData.scheduledDate);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
    
    return isAfter(scheduledDateTime, addMinutes(new Date(), 15)); // Must be at least 15 minutes in future
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="topic" className="text-base font-medium">Sanctuary Topic</Label>
        <Input
          id="topic"
          placeholder="What would you like to talk about?"
          value={formData.topic}
          onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
          className="mt-2"
          maxLength={100}
        />
        <div className="text-xs text-muted-foreground mt-1">
          {formData.topic.length}/100 characters
        </div>
      </div>

      <div>
        <Label className="text-base font-medium">Choose an Emoji</Label>
        <div className="grid grid-cols-5 gap-3 mt-3">
          {topicEmojis.map(({ emoji, label }) => (
            <motion.button
              key={emoji}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleEmojiSelect(emoji)}
              className={cn(
                "p-3 rounded-lg border-2 transition-all duration-200 text-center",
                formData.emoji === emoji
                  ? "border-primary bg-primary/10 shadow-md"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-xs text-muted-foreground truncate">{label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="text-base font-medium">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Briefly describe what this sanctuary is about..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="mt-2"
          rows={3}
          maxLength={300}
        />
        <div className="text-xs text-muted-foreground mt-1">
          {formData.description.length}/300 characters
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="text-base font-medium">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full mt-2 justify-start text-left font-normal",
                  !formData.scheduledDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.scheduledDate ? format(formData.scheduledDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.scheduledDate}
                onSelect={handleDateSelect}
                disabled={(date) => date < new Date() || date > addMinutes(new Date(), 30 * 24 * 60)} // Max 30 days ahead
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label className="text-base font-medium">Time</Label>
          <Select value={formData.scheduledTime} onValueChange={(value) => setFormData(prev => ({ ...prev, scheduledTime: value }))}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {generateTimeSlots().map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-base font-medium">Duration</Label>
        <Select value={formData.duration.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, duration: Number(value) }))}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {durationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.scheduledDate && formData.scheduledTime && (
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-medium">Scheduled for</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {format(
              new Date(formData.scheduledDate.getTime() + 
                parseInt(formData.scheduledTime.split(':')[0]) * 60 * 60 * 1000 + 
                parseInt(formData.scheduledTime.split(':')[1]) * 60 * 1000), 
              'EEEE, MMMM do, yyyy \'at\' h:mm a'
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Maximum Participants</Label>
        <Select value={formData.maxParticipants.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, maxParticipants: Number(value) }))}>
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 15, 20, 30, 50].map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num} participants
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Allow Anonymous Participants</Label>
            <p className="text-sm text-muted-foreground">Let people join without creating an account</p>
          </div>
          <Switch
            checked={formData.allowAnonymous}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allowAnonymous: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Require Host Approval</Label>
            <p className="text-sm text-muted-foreground">Manually approve each participant before they can join</p>
          </div>
          <Switch
            checked={formData.requireApproval}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireApproval: checked }))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Enable Session Recording</Label>
            <p className="text-sm text-muted-foreground">Record the session for later review (with participant consent)</p>
          </div>
          <Switch
            checked={formData.enableRecording}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableRecording: checked }))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="guidelines" className="text-base font-medium">Community Guidelines (Optional)</Label>
        <Textarea
          id="guidelines"
          placeholder="Any specific rules or guidelines for this sanctuary..."
          value={formData.guidelines}
          onChange={(e) => setFormData(prev => ({ ...prev, guidelines: e.target.value }))}
          className="mt-2"
          rows={3}
          maxLength={500}
        />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
      >
        <Sparkles className="h-10 w-10 text-green-600" />
      </motion.div>

      <div>
        <h3 className="text-2xl font-bold text-foreground mb-2">Sanctuary Created! 🎉</h3>
        <p className="text-muted-foreground">
          Your scheduled sanctuary "{formData.topic}" has been created successfully.
        </p>
      </div>

      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium">Invite Link</span>
          <Button variant="ghost" size="sm" onClick={copyInviteLink}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
        </div>
        <div className="p-3 bg-background rounded border text-sm font-mono break-all">
          {generatedInviteLink}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="font-medium text-blue-900">Scheduled Time</div>
          <div className="text-blue-700">
            {formData.scheduledDate && formData.scheduledTime && format(
              new Date(formData.scheduledDate.getTime() + 
                parseInt(formData.scheduledTime.split(':')[0]) * 60 * 60 * 1000 + 
                parseInt(formData.scheduledTime.split(':')[1]) * 60 * 1000), 
              'MMM do, h:mm a'
            )}
          </div>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="font-medium text-green-900">Duration</div>
          <div className="text-green-700">{formData.duration} minutes</div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Close
        </Button>
        <Button 
          onClick={() => window.open(generatedInviteLink, '_blank')}
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Visit Sanctuary
        </Button>
      </div>
    </div>
  );

  const canProceedToNext = () => {
    switch (step) {
      case 1:
        return formData.topic.trim().length > 0;
      case 2:
        return isValidDateTime();
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Schedule a Sanctuary
          </CardTitle>
          <Badge variant="secondary">Step {step} of 4</Badge>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1 mt-4">
          <motion.div
            className="bg-primary h-1 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </motion.div>
        </AnimatePresence>

        {step < 4 && (
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : onClose?.()}
              className="flex-1"
            >
              {step > 1 ? 'Previous' : 'Cancel'}
            </Button>
            
            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceedToNext()}
                className="flex-1"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={createScheduledSanctuary}
                disabled={!canProceedToNext() || isCreating}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <motion.div
                      className="mr-2"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                    Creating...
                  </>
                ) : (
                  'Create Sanctuary'
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};