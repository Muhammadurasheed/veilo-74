import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    {
      title: "Welcome to Veilo",
      description: "Your safe space for mental wellness and support",
      content: "Connect with licensed professionals and find the support you need."
    },
    {
      title: "Choose Your Journey",
      description: "Select how you'd like to engage with our community",
      content: "Whether you're seeking help or offering expertise, we're here for you."
    },
    {
      title: "Get Started",
      description: "You're ready to begin your wellness journey",
      content: "Start exploring and connecting with others who understand."
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="mb-6">
        <Progress value={progress} className="mb-4" />
        <Badge variant="secondary" className="mb-4">
          Step {currentStep + 1} of {steps.length}
        </Badge>
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {currentStep === steps.length - 1 ? (
              <CheckCircle className="h-6 w-6 text-primary" />
            ) : (
              <Sparkles className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle>{steps[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {steps[currentStep].description}
          </p>
          <p className="text-sm">
            {steps[currentStep].content}
          </p>
          
          <Button onClick={handleNext} className="w-full">
            {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingFlow;