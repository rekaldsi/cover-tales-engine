import { Check, Loader2, AlertCircle, Camera, Brain, Sparkles, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScanStage = 'detecting' | 'identifying' | 'enriching' | 'valuing' | 'complete' | 'error';

interface ScanStep {
  id: ScanStage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SCAN_STEPS: ScanStep[] = [
  { id: 'detecting', label: 'Detecting', icon: Camera },
  { id: 'identifying', label: 'Identifying', icon: Brain },
  { id: 'enriching', label: 'Enriching', icon: Sparkles },
  { id: 'valuing', label: 'Valuing', icon: DollarSign },
];

interface ScanProgressStepperProps {
  currentStage: ScanStage;
  error?: string | null;
  className?: string;
  compact?: boolean;
}

export function ScanProgressStepper({ 
  currentStage, 
  error, 
  className,
  compact = false 
}: ScanProgressStepperProps) {
  const getStepStatus = (stepId: ScanStage): 'pending' | 'active' | 'complete' | 'error' => {
    if (currentStage === 'error' && stepId === currentStage) return 'error';
    if (currentStage === 'complete') return 'complete';
    
    const currentIndex = SCAN_STEPS.findIndex(s => s.id === currentStage);
    const stepIndex = SCAN_STEPS.findIndex(s => s.id === stepId);
    
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {SCAN_STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                  status === 'complete' && "bg-green-500/20 text-green-400",
                  status === 'active' && "bg-primary/20 text-primary",
                  status === 'pending' && "bg-muted text-muted-foreground",
                  status === 'error' && "bg-destructive/20 text-destructive"
                )}
              >
                {status === 'complete' ? (
                  <Check className="w-3 h-3" />
                ) : status === 'active' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : status === 'error' ? (
                  <AlertCircle className="w-3 h-3" />
                ) : (
                  <Icon className="w-3 h-3" />
                )}
              </div>
              {index < SCAN_STEPS.length - 1 && (
                <div 
                  className={cn(
                    "w-4 h-0.5 transition-colors",
                    status === 'complete' ? "bg-green-500/50" : "bg-border"
                  )} 
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        {SCAN_STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex-1 flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    status === 'complete' && "bg-green-500/20 text-green-400 ring-2 ring-green-500/30",
                    status === 'active' && "bg-primary/20 text-primary ring-2 ring-primary/50",
                    status === 'pending' && "bg-muted text-muted-foreground",
                    status === 'error' && "bg-destructive/20 text-destructive ring-2 ring-destructive/50"
                  )}
                >
                  {status === 'complete' ? (
                    <Check className="w-4 h-4" />
                  ) : status === 'active' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : status === 'error' ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span 
                  className={cn(
                    "text-xs font-medium transition-colors",
                    status === 'complete' && "text-green-400",
                    status === 'active' && "text-primary",
                    status === 'pending' && "text-muted-foreground",
                    status === 'error' && "text-destructive"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < SCAN_STEPS.length - 1 && (
                <div 
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors",
                    status === 'complete' ? "bg-green-500/50" : "bg-border"
                  )} 
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Status message */}
      <div className="text-center">
        {currentStage === 'detecting' && (
          <p className="text-sm text-muted-foreground">Detecting comic in frame...</p>
        )}
        {currentStage === 'identifying' && (
          <p className="text-sm text-muted-foreground">Identifying title and issue...</p>
        )}
        {currentStage === 'enriching' && (
          <p className="text-sm text-muted-foreground">Fetching creator credits and synopsis...</p>
        )}
        {currentStage === 'valuing' && (
          <p className="text-sm text-muted-foreground">Looking up market values...</p>
        )}
        {currentStage === 'complete' && (
          <p className="text-sm text-green-400">Complete!</p>
        )}
        {currentStage === 'error' && error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
