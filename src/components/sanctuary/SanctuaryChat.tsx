import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare, Send, Smile, AlertTriangle, Shield,
  Crown, Mic, MicOff, Hand, Volume2, VolumeX,
  MoreVertical, Flag, Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  participantId: string;
  participantAlias: string;
  content: string;
  type: 'text' | 'emoji-reaction' | 'system';
  timestamp: string;
  isHost?: boolean;
  isModerator?: boolean;
  isEmergency?: boolean;
  avatarIndex?: number;
}

interface ChatParticipant {
  id: string;
  alias: string;
  isHost?: boolean;
  isModerator?: boolean;
  isMuted?: boolean;
  handRaised?: boolean;
  avatarIndex?: number;
  connectionStatus?: 'connected' | 'disconnected' | 'connecting';
  voiceEnabled?: boolean;
}

interface SanctuaryChatProps {
  sessionId: string;
  currentUser: {
    id: string;
    alias: string;
    isHost?: boolean;
    isModerator?: boolean;
  };
  participants: ChatParticipant[];
  messages: ChatMessage[];
  onSendMessage: (content: string, type?: 'text' | 'emoji-reaction') => void;
  onParticipantAction?: (participantId: string, action: 'mute' | 'unmute' | 'kick' | 'promote') => void;
  emergencyMode?: boolean;
  className?: string;
}

const EMOJI_REACTIONS = ['👍', '❤️', '👏', '🤗', '😊', '🙏', '💜', '🎉'];

export const SanctuaryChat: React.FC<SanctuaryChatProps> = ({
  sessionId,
  currentUser,
  participants,
  messages,
  onSendMessage,
  onParticipantAction,
  emergencyMode = false,
  className
}) => {
  const { toast } = useToast();
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim()) return;
    
    onSendMessage(messageInput.trim(), 'text');
    setMessageInput('');
    setIsTyping(false);
  }, [messageInput, onSendMessage]);

  const handleEmojiReaction = useCallback((emoji: string) => {
    onSendMessage(emoji, 'emoji-reaction');
    setShowEmojiPicker(false);
  }, [onSendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false);
    }
  }, [isTyping]);

  const getParticipantById = useCallback((id: string) => {
    return participants.find(p => p.id === id);
  }, [participants]);

  const formatMessageTime = useCallback((timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  }, []);

  const renderMessage = useCallback((message: ChatMessage) => {
    const participant = getParticipantById(message.participantId);
    const isOwnMessage = message.participantId === currentUser.id;
    
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 p-2 rounded-lg transition-colors ${
          isOwnMessage 
            ? 'bg-purple-50 dark:bg-purple-900/20 ml-4' 
            : 'bg-gray-50 dark:bg-gray-800 mr-4'
        } ${message.isEmergency ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={`/avatars/avatar-${participant?.avatarIndex || 1}.svg`} />
          <AvatarFallback className="text-xs bg-gradient-to-br from-purple-400 to-indigo-400 text-white">
            {message.participantAlias.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold text-sm truncate ${
              message.isHost ? 'text-yellow-600' : 
              participant?.isModerator ? 'text-blue-600' : 
              'text-gray-700 dark:text-gray-300'
            }`}>
              {message.participantAlias}
            </span>
            
            {message.isHost && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                <Crown className="h-3 w-3 mr-1" />
                Host
              </Badge>
            )}
            
            {participant?.isModerator && !message.isHost && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                <Shield className="h-3 w-3 mr-1" />
                Mod
              </Badge>
            )}
            
            {participant?.handRaised && (
              <Hand className="h-3 w-3 text-orange-500" />
            )}
            
            {participant?.isMuted && (
              <MicOff className="h-3 w-3 text-red-500" />
            )}
            
            <span className="text-xs text-muted-foreground">
              {formatMessageTime(message.timestamp)}
            </span>
          </div>
          
          <div className={`text-sm ${
            message.type === 'emoji-reaction' 
              ? 'text-2xl' 
              : message.type === 'system' 
                ? 'text-muted-foreground italic' 
                : 'text-gray-700 dark:text-gray-300'
          }`}>
            {message.content}
          </div>
        </div>
        
        {!isOwnMessage && (currentUser.isHost || currentUser.isModerator) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {/* Show participant actions menu */}}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        )}
      </motion.div>
    );
  }, [currentUser, participants, getParticipantById, formatMessageTime]);

  return (
    <Card className={`h-full flex flex-col ${className}`}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat ({participants.length})
          </CardTitle>
          
          {emergencyMode && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Emergency Mode
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            <AnimatePresence>
              {messages.map(renderMessage)}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-4 space-y-3">
          {/* Emoji Reactions */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                {EMOJI_REACTIONS.map((emoji) => (
                  <Button
                    key={emoji}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEmojiReaction(emoji)}
                    className="text-lg hover:scale-110 transition-transform"
                  >
                    {emoji}
                  </Button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="px-3"
            >
              <Smile className="h-4 w-4" />
            </Button>
            
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={handleInputChange}
              placeholder="Type a message..."
              disabled={emergencyMode}
              className="flex-1"
              maxLength={500}
            />
            
            <Button
              type="submit"
              size="sm"
              disabled={!messageInput.trim() || emergencyMode}
              className="px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          
          {emergencyMode && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center">
              Chat disabled during emergency mode
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};