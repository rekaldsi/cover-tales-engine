import { useEffect, useState, useCallback } from 'react';
import { Flame, AlertCircle, XCircle, Star, TrendingUp, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OwnedBadge, MissingBadge } from './OwnedBadge';

type Verdict = 'get' | 'consider' | 'pass' | null;

interface VerdictPillProps {
  verdict: Verdict;
  title: string;
  issueNumber: string;
  publisher?: string;
  rawValue?: number;
  gradedValue98?: number;
  valueRange?: { low: number; high: number };
  confidence?: 'high' | 'medium' | 'low';
  confidenceScore?: number;
  isKeyIssue?: boolean;
  isOwned?: boolean;
  copyCount?: number;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

const formatValue = (value: number | undefined): string => {
  if (value === undefined || value === null) return '—';
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
};

const getValueColor = (value: number | undefined): string => {
  if (!value) return 'text-white/70';
  if (value >= 50) return 'text-green-400';
  if (value >= 15) return 'text-yellow-400';
  return 'text-white/70';
};

export function VerdictPill({
  verdict,
  title,
  issueNumber,
  publisher,
  rawValue,
  gradedValue98,
  valueRange,
  confidence,
  confidenceScore,
  isKeyIssue,
  isOwned,
  copyCount,
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

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  }, [onDismiss]);

  const config = {
    get: {
      icon: Flame,
      label: 'GET IT!',
      bgClass: 'bg-green-600',
      textClass: 'text-white',
      borderClass: 'border-green-500',
    },
    consider: {
      icon: AlertCircle,
      label: 'CONSIDER',
      bgClass: 'bg-yellow-600',
      textClass: 'text-white',
      borderClass: 'border-yellow-500',
    },
    pass: {
      icon: XCircle,
      label: 'PASS',
      bgClass: 'bg-gray-600',
      textClass: 'text-white',
      borderClass: 'border-gray-500',
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
          'min-w-[240px] max-w-[320px]',
          bgClass,
          borderClass
        )}
      >
        {/* Verdict header */}
        <div className={cn('flex items-center justify-between px-4 py-2', textClass)}>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <span className="font-display text-lg font-bold tracking-wide">{label}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content area */}
        <div className="bg-black/50 backdrop-blur-sm px-4 py-3 space-y-3">
          {/* Comic info */}
          <div>
            <p className="font-semibold text-white text-base leading-tight truncate">
              {title} #{issueNumber}
            </p>
            {publisher && (
              <p className="text-white/60 text-sm">{publisher}</p>
            )}
          </div>

          {/* Value Display - PRIMARY (most prominent) */}
          <div className="space-y-1">
            {/* Raw Value - Large */}
            <div className="flex items-baseline gap-2">
              <span className="text-white/60 text-xs uppercase tracking-wide">Raw:</span>
              <span className={cn('text-2xl font-bold', getValueColor(rawValue))}>
                {formatValue(rawValue)}
              </span>
            </div>

            {/* 9.8 Graded Value - Secondary */}
            {gradedValue98 && (
              <div className="flex items-baseline gap-2">
                <span className="text-white/60 text-xs uppercase tracking-wide">9.8:</span>
                <span className={cn('text-lg font-semibold', getValueColor(gradedValue98))}>
                  {formatValue(gradedValue98)}
                </span>
              </div>
            )}

            {/* Value Range & Confidence */}
            {(valueRange || confidenceScore !== undefined) && (
              <div className="flex items-center gap-3 text-xs pt-1">
                {valueRange && (
                  <span className="text-white/50">
                    {formatValue(valueRange.low)}–{formatValue(valueRange.high)}
                  </span>
                )}
                {confidenceScore !== undefined && (
                  <span className={cn(
                    'flex items-center gap-1',
                    confidence === 'high' ? 'text-green-400' :
                    confidence === 'medium' ? 'text-yellow-400' : 'text-orange-400'
                  )}>
                    {confidence === 'high' ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {confidenceScore}%
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status Badges Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {isOwned ? (
              <OwnedBadge isOwned={true} copyCount={copyCount} size="sm" />
            ) : (
              <MissingBadge size="sm" />
            )}

            {isKeyIssue && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-semibold">
                <Star className="h-3 w-3 fill-current" />
                <span>Key Issue</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tap to dismiss hint */}
      <p className="text-center text-xs text-white/50 mt-2">
        Tap to dismiss
      </p>
    </div>
  );
}
