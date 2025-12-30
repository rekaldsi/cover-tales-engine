import { AlertCircle, RefreshCw, Wifi, Camera, Server, HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ScanErrorCategory = 
  | 'network'
  | 'camera'
  | 'recognition'
  | 'provider'
  | 'timeout'
  | 'unknown';

export interface ScanError {
  category: ScanErrorCategory;
  message: string;
  code?: string;
  recoverable: boolean;
  details?: string;
}

// Parse error into taxonomy
export function categorizeError(error: unknown): ScanError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  // Network errors
  if (lowerMessage.includes('network') || 
      lowerMessage.includes('fetch') || 
      lowerMessage.includes('connection') ||
      lowerMessage.includes('offline')) {
    return {
      category: 'network',
      message: 'Network connection issue',
      recoverable: true,
      details: 'Check your internet connection and try again.',
    };
  }
  
  // Camera errors
  if (lowerMessage.includes('camera') || 
      lowerMessage.includes('permission') || 
      lowerMessage.includes('mediadevices') ||
      lowerMessage.includes('notallowederror')) {
    return {
      category: 'camera',
      message: 'Camera access denied',
      recoverable: true,
      details: 'Please grant camera permission in your browser settings.',
    };
  }
  
  // Recognition errors
  if (lowerMessage.includes('recognize') || 
      lowerMessage.includes('identify') || 
      lowerMessage.includes('not found') ||
      lowerMessage.includes('could not find')) {
    return {
      category: 'recognition',
      message: 'Could not identify comic',
      recoverable: true,
      details: 'Try capturing a clearer image or use manual search.',
    };
  }
  
  // Provider/API errors
  if (lowerMessage.includes('unavailable') || 
      lowerMessage.includes('503') || 
      lowerMessage.includes('provider') ||
      lowerMessage.includes('gocollect') ||
      lowerMessage.includes('ebay')) {
    return {
      category: 'provider',
      message: 'Pricing service temporarily unavailable',
      recoverable: true,
      details: 'Some value sources may be unavailable. Data may be incomplete.',
    };
  }
  
  // Timeout errors
  if (lowerMessage.includes('timeout') || 
      lowerMessage.includes('timed out') ||
      lowerMessage.includes('aborted')) {
    return {
      category: 'timeout',
      message: 'Request timed out',
      recoverable: true,
      details: 'The request took too long. Try again.',
    };
  }
  
  // Unknown/other errors
  return {
    category: 'unknown',
    message: 'Something went wrong',
    recoverable: true,
    details: errorMessage,
  };
}

const CATEGORY_CONFIG: Record<ScanErrorCategory, {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor: string;
}> = {
  network: { icon: Wifi, bgColor: 'bg-orange-500/10', iconColor: 'text-orange-400' },
  camera: { icon: Camera, bgColor: 'bg-yellow-500/10', iconColor: 'text-yellow-400' },
  recognition: { icon: HelpCircle, bgColor: 'bg-blue-500/10', iconColor: 'text-blue-400' },
  provider: { icon: Server, bgColor: 'bg-purple-500/10', iconColor: 'text-purple-400' },
  timeout: { icon: RefreshCw, bgColor: 'bg-amber-500/10', iconColor: 'text-amber-400' },
  unknown: { icon: AlertCircle, bgColor: 'bg-destructive/10', iconColor: 'text-destructive' },
};

interface ScanErrorDisplayProps {
  error: ScanError;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export function ScanErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss,
  className,
  compact = false 
}: ScanErrorDisplayProps) {
  const config = CATEGORY_CONFIG[error.category];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        config.bgColor,
        className
      )}>
        <Icon className={cn("w-4 h-4 shrink-0", config.iconColor)} />
        <span className="text-sm flex-1 truncate">{error.message}</span>
        {error.recoverable && onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="h-6 px-2">
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss} className="h-6 px-2">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      config.bgColor,
      "border-border/50",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          config.bgColor
        )}>
          <Icon className={cn("w-5 h-5", config.iconColor)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">{error.message}</h4>
          {error.details && (
            <p className="text-sm text-muted-foreground mt-1">{error.details}</p>
          )}
          {error.code && (
            <p className="text-xs text-muted-foreground/70 mt-1 font-mono">
              Error code: {error.code}
            </p>
          )}
        </div>
      </div>
      
      {(onRetry || onDismiss) && (
        <div className="flex gap-2 mt-4">
          {error.recoverable && onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
