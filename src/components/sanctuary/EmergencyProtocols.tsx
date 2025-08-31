import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Heart, 
  Phone, 
  Shield, 
  MessageCircle, 
  Zap,
  Users,
  Clock,
  Send,
  X,
  CheckCircle
} from 'lucide-react';

interface EmergencyProtocolsProps {
  sessionId: string;
  onEmergencyAlert?: (alertType: string, message: string) => void;
  onContactModerator?: () => void;
  className?: string;
}

interface EmergencyResource {
  id: string;
  title: string;
  description: string;
  phoneNumber?: string;
  website?: string;
  availability: string;
  priority: 'high' | 'medium' | 'low';
  icon: React.ComponentType<any>;
}

const emergencyResources: EmergencyResource[] = [
  {
    id: 'crisis',
    title: 'Crisis Text Line',
    description: 'Free, confidential support via text message',
    phoneNumber: 'Text HOME to 741741',
    availability: '24/7',
    priority: 'high',
    icon: MessageCircle
  },
  {
    id: 'suicide',
    title: 'National Suicide Prevention Lifeline',
    description: 'Free and confidential emotional support',
    phoneNumber: '988',
    availability: '24/7',
    priority: 'high',
    icon: Heart
  },
  {
    id: 'emergency',
    title: 'Emergency Services',
    description: 'For immediate life-threatening emergencies',
    phoneNumber: '911',
    availability: '24/7',
    priority: 'high',
    icon: AlertTriangle
  },
  {
    id: 'domestic',
    title: 'National Domestic Violence Hotline',
    description: 'Support for domestic violence situations',
    phoneNumber: '1-800-799-7233',
    availability: '24/7',
    priority: 'medium',
    icon: Shield
  }
];

const alertTypes = [
  {
    id: 'mental_health_crisis',
    label: 'Mental Health Crisis',
    description: 'Someone is expressing thoughts of self-harm',
    icon: Heart,
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  {
    id: 'harassment',
    label: 'Harassment/Abuse',
    description: 'Inappropriate or harmful behavior towards participants',
    icon: Shield,
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  {
    id: 'spam_disruption',
    label: 'Spam/Disruption',
    description: 'Disruptive behavior or spam content',
    icon: Zap,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    id: 'technical_issue',
    label: 'Technical Emergency',
    description: 'Critical technical problems affecting safety',
    icon: AlertTriangle,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  }
];

export const EmergencyProtocols: React.FC<EmergencyProtocolsProps> = ({
  sessionId,
  onEmergencyAlert,
  onContactModerator,
  className = ''
}) => {
  const { toast } = useToast();
  const [selectedAlertType, setSelectedAlertType] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false);
  const [showResources, setShowResources] = useState(false);

  const handleEmergencyAlert = async () => {
    if (!selectedAlertType) return;

    setIsSubmittingAlert(true);
    
    try {
      await onEmergencyAlert?.(selectedAlertType, alertMessage);
      
      toast({
        title: '🚨 Emergency Alert Sent',
        description: 'Moderators have been notified and will respond immediately.',
        duration: 5000
      });
      
      setSelectedAlertType(null);
      setAlertMessage('');
    } catch (error) {
      toast({
        title: 'Alert Failed',
        description: 'Unable to send emergency alert. Please try contacting moderators directly.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingAlert(false);
    }
  };

  const handleResourceCall = (phoneNumber: string) => {
    if (phoneNumber.includes('Text')) {
      toast({
        title: 'Text Message Service',
        description: phoneNumber,
        duration: 8000
      });
    } else {
      window.open(`tel:${phoneNumber}`, '_self');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Quick Emergency Actions */}
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="h-5 w-5" />
            Emergency Protocols
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12 text-sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Emergency
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-900">
                    <AlertTriangle className="h-5 w-5" />
                    Emergency Alert
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      This will immediately notify all moderators. Use only for genuine emergencies.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Alert Type</label>
                    <div className="grid grid-cols-1 gap-2">
                      {alertTypes.map((type) => (
                        <Button
                          key={type.id}
                          variant={selectedAlertType === type.id ? "default" : "outline"}
                          className={`justify-start text-left h-auto p-3 ${
                            selectedAlertType === type.id ? '' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedAlertType(type.id)}
                        >
                          <type.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {selectedAlertType && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Additional Details (Optional)</label>
                      <Textarea
                        placeholder="Provide any additional context that might help moderators..."
                        value={alertMessage}
                        onChange={(e) => setAlertMessage(e.target.value)}
                        rows={3}
                        maxLength={500}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleEmergencyAlert}
                      disabled={!selectedAlertType || isSubmittingAlert}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      {isSubmittingAlert ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="mr-2"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      {isSubmittingAlert ? 'Sending...' : 'Send Alert'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              onClick={onContactModerator}
              variant="outline" 
              className="w-full h-12 text-sm border-orange-200 hover:bg-orange-50"
            >
              <Users className="h-4 w-4 mr-2" />
              Contact Moderator
            </Button>
          </div>

          <Button
            onClick={() => setShowResources(!showResources)}
            variant="ghost"
            className="w-full text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <Heart className="h-4 w-4 mr-2" />
            {showResources ? 'Hide' : 'Show'} Crisis Resources
          </Button>
        </CardContent>
      </Card>

      {/* Crisis Resources */}
      <AnimatePresence>
        {showResources && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Crisis Support Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {emergencyResources.map((resource) => (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <resource.icon className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{resource.title}</h4>
                            <Badge className={getPriorityColor(resource.priority)}>
                              {resource.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {resource.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {resource.availability}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {resource.phoneNumber && (
                        <Button
                          size="sm"
                          onClick={() => handleResourceCall(resource.phoneNumber!)}
                          className="ml-3 flex-shrink-0"
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          {resource.phoneNumber.includes('Text') ? 'Text' : 'Call'}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}

                <Alert className="mt-4">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Remember:</strong> You are not alone. These resources are available 24/7 and all conversations are confidential.
                    If you're in immediate danger, please call 911.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};