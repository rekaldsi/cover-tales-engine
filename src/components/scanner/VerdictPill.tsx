import { useEffect, useState } from 'react';
import { Flame, AlertCircle, XCircle, Star, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

type Verdict = 'get' | 'consider' | 'pass' | null;

interface VerdictPillProps {
  verdict: Verdict;
  title: string;
  issueNumber: string;
  value?: number;
  isKeyIssue?: boolean;
  isMissing?: boolean;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export function VerdictPill({
  verdict,
  title,
  issueNumber,
  value,
  isKeyIssue,
  isMissing,
  onDismiss,
  autoDismissMs = 4000,
}: VerdictPillProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onDismiss?.();
      }, 300);
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  const config = {
    get: {
      icon: Flame,
      label: 'GET IT!',
      bgClass: 'bg-green-500',
      textClass: 'text-white',
      borderClass: 'border-green-400',
    },
    consider: {
      icon: AlertCircle,
      label: 'CONSIDER',
      bgClass: 'bg-yellow-500',
      textClass: 'text-black',
      borderClass: 'border-yellow-400',
    },
    pass: {
      icon: XCircle,
      label: 'PASS',
      bgClass: 'bg-muted',
      textClass: 'text-muted-foreground',
      borderClass: 'border-border',
    },
  };

  if (!verdict) return null;

  const { icon: Icon, label, bgClass, textClass, borderClass } = config[verdict];

  const formatValue = (v?: number) => {
    if (!v) return null;
    return `$${v.toLocaleString()}`;
  };

  return (
    <div
      onClick={handleDismiss}
      className={cn(
        'absolute top-4 left-1/2 -translate-x-1/2 z-50 cursor-pointer',
        'transition-all duration-300 ease-out',
        isVisible && !isExiting 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 -translate-y-4 scale-95'
      )}
    >
      <div
        className={cn(
          'rounded-2xl shadow-2xl border-2 overflow-hidden',
          'min-w-[200px] max-w-[280px]',
          bgClass,
          borderClass
        )}
      >
        {/* Main verdict header */}
        <div className={cn('flex items-center justify-center gap-2 py-3 px-4', textClass)}>
          <Icon className="w-6 h-6" />
          <span className="font-display text-xl font-bold tracking-wide">{label}</span>
        </div>

        {/* Comic info */}
        <div className="bg-background/95 backdrop-blur px-4 py-3 space-y-1">
          <p className="font-medium text-foreground text-sm truncate">
            {title} #{issueNumber}
          </p>
          
          <div className="flex items-center justify-between gap-2">
            {/* Value */}
            {formatValue(value) && (
              <span className="text-lg font-bold text-primary">
                {formatValue(value)}
              </span>
            )}
            
            {/* Badges */}
            <div className="flex items-center gap-1.5">
              {isKeyIssue && (
                <div className="flex items-center gap-1 bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-primary" />
                  Key
                </div>
              )}
              {isMissing && (
                <div className="flex items-center gap-1 bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">
                  <ShoppingCart className="w-3 h-3" />
                  Missing
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tap to dismiss hint */}
      <p className="text-center text-xs text-muted-foreground mt-2 opacity-70">
        Tap to dismiss
      </p>
    </div>
  );
}
