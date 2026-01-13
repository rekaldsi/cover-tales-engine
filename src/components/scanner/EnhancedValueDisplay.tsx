import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, CircleDot } from 'lucide-react';

interface EnhancedValueDisplayProps {
  rawValue?: number;
  gradedValue98?: number;
  valueRange?: { low: number; high: number };
  confidence?: 'high' | 'medium' | 'low';
  confidenceScore?: number;
  compact?: boolean;
  showRange?: boolean;
}

const formatValue = (value: number | undefined): string => {
  if (value === undefined || value === null) return '—';
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
};

const getValueColor = (value: number | undefined): string => {
  if (!value) return 'text-muted-foreground';
  if (value >= 50) return 'text-green-500';
  if (value >= 15) return 'text-yellow-500';
  return 'text-muted-foreground';
};

const getConfidenceColor = (confidence?: 'high' | 'medium' | 'low'): string => {
  switch (confidence) {
    case 'high': return 'text-green-500';
    case 'medium': return 'text-yellow-500';
    case 'low': return 'text-orange-500';
    default: return 'text-muted-foreground';
  }
};

const getConfidenceIcon = (confidence?: 'high' | 'medium' | 'low') => {
  switch (confidence) {
    case 'high': return TrendingUp;
    case 'medium': return Minus;
    case 'low': return TrendingDown;
    default: return CircleDot;
  }
};

/**
 * Enhanced value display component for hunting mode
 * Prioritizes market value with clear visual hierarchy
 */
export function EnhancedValueDisplay({
  rawValue,
  gradedValue98,
  valueRange,
  confidence,
  confidenceScore,
  compact = false,
  showRange = true,
}: EnhancedValueDisplayProps) {
  const ConfidenceIcon = getConfidenceIcon(confidence);

  if (compact) {
    return (
      <div className="flex flex-col gap-0.5">
        {/* Primary: Raw Value */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground">Raw:</span>
          <span className={cn('text-lg font-bold', getValueColor(rawValue))}>
            {formatValue(rawValue)}
          </span>
        </div>

        {/* Secondary: 9.8 Graded Value */}
        {gradedValue98 && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">9.8:</span>
            <span className={cn('text-sm font-semibold', getValueColor(gradedValue98))}>
              {formatValue(gradedValue98)}
            </span>
          </div>
        )}

        {/* Value Range with Confidence */}
        {showRange && (valueRange || confidenceScore !== undefined) && (
          <div className="flex items-center gap-1.5 text-xs">
            {valueRange && (
              <span className="text-muted-foreground">
                {formatValue(valueRange.low)}–{formatValue(valueRange.high)}
              </span>
            )}
            {confidenceScore !== undefined && (
              <span className={cn('flex items-center gap-0.5', getConfidenceColor(confidence))}>
                <ConfidenceIcon className="h-3 w-3" />
                {confidenceScore}%
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Primary: Raw Value - Large and Bold */}
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Raw Value
        </span>
        <span className={cn('text-3xl font-bold tracking-tight', getValueColor(rawValue))}>
          {formatValue(rawValue)}
        </span>
      </div>

      {/* Secondary: 9.8 Graded Value */}
      {gradedValue98 && (
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            CGC 9.8 Value
          </span>
          <span className={cn('text-xl font-semibold', getValueColor(gradedValue98))}>
            {formatValue(gradedValue98)}
          </span>
        </div>
      )}

      {/* Value Range with Confidence Badge */}
      {showRange && (valueRange || confidence || confidenceScore !== undefined) && (
        <div className="flex items-center gap-3 pt-1 border-t border-border/50">
          {valueRange && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Range</span>
              <span className="text-sm font-medium">
                {formatValue(valueRange.low)} – {formatValue(valueRange.high)}
              </span>
            </div>
          )}

          {(confidence || confidenceScore !== undefined) && (
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <div className={cn('flex items-center gap-1 text-sm font-medium', getConfidenceColor(confidence))}>
                <ConfidenceIcon className="h-4 w-4" />
                {confidenceScore !== undefined ? `${confidenceScore}%` : confidence}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
