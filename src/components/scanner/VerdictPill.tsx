import { useEffect, useState } from 'react';
import { Flame, AlertCircle, XCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EnhancedValueDisplay } from './EnhancedValueDisplay';
import { OwnedBadge } from './OwnedBadge';

type Verdict = 'get' | 'consider' | 'pass' | null;

interface VerdictPillProps {
  verdict: Verdict;
  title: string;
  issueNumber: string;
  // Enhanced value props
  value?: number;
  gradedValue98?: number;
  valueRange?: { low: number; high: number };
  confidence?: 'high' | 'medium' | 'low';
  confidenceScore?: number;
  // Status props
  isKeyIssue?: boolean;
  isMissing?: boolean;
  ownedCopyCount?: number;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export function VerdictPill({
  verdict,
  title,
  issueNumber,
  value,
  gradedValue98,
  valueRange,
  confidence,
  confidenceScore,
  isKeyIssue,
  isMissing,
  ownedCopyCount,
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
          'min-w-[200px] max-w-[300px]',
          'bg-background',
          'border-border'
        )}
      >
        {/* Verdict Badge (smaller, at top) */}
        <div className={cn('flex items-center justify-center gap-2 py-2 px-4', bgClass, textClass)}>
          <Icon className="w-4 h-4" />
          <span className="font-display text-sm font-bold tracking-wide">{label}</span>
        </div>

        {/* Comic Info */}
        <div className="px-4 py-2 border-b border-border">
          <p className="font-medium text-foreground text-sm truncate">
            {title} #{issueNumber}
          </p>
        </div>

        {/* VALUE - Most Prominent Section */}
        <div className="px-4 py-3 bg-secondary/30">
          <EnhancedValueDisplay
            rawValue={value}
            gradedValue98={gradedValue98}
            valueRange={valueRange}
            confidence={confidence}
            confidenceScore={confidenceScore}
            compact={true}
            showRange={false}
          />
        </div>

        {/* Status Badges */}
        <div className="px-4 py-2 flex items-center justify-center gap-2">
          <OwnedBadge
            isOwned={!isMissing}
            copyCount={ownedCopyCount}
            size="sm"
          />
          {isKeyIssue && (
            <div className="flex items-center gap-1 bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-medium">
              <Star className="w-3 h-3 fill-primary" />
              Key Issue
            </div>
          )}
        </div>
      </div>

      {/* Tap to dismiss hint */}
      <p className="text-center text-xs text-muted-foreground mt-2 opacity-70">
        Tap to dismiss
      </p>
    </div>
  );
}
