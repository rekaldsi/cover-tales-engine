import { DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedValueDisplayProps {
  rawValue?: number;
  gradedValue98?: number;
  valueRange?: { low: number; high: number };
  confidence?: 'high' | 'medium' | 'low';
  confidenceScore?: number;
  compact?: boolean;
  showRange?: boolean;
}

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
  const formatValue = (value?: number) => {
    if (!value) return '—';
    return `$${value.toLocaleString()}`;
  };

  const getValueColor = (value?: number) => {
    if (!value) return 'text-muted-foreground';
    if (value >= 50) return 'text-green-500';
    if (value >= 15) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const confidenceConfig = {
    high: { color: 'bg-green-500', label: 'High' },
    medium: { color: 'bg-yellow-500', label: 'Med' },
    low: { color: 'bg-orange-500', label: 'Low' },
  };

  const confidenceInfo = confidence ? confidenceConfig[confidence] : null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-baseline gap-1">
          <span className={cn('text-lg font-bold', getValueColor(rawValue))}>
            {formatValue(rawValue)}
          </span>
          {gradedValue98 && (
            <span className="text-sm text-muted-foreground">
              / {formatValue(gradedValue98)} (9.8)
            </span>
          )}
        </div>
        {confidenceInfo && (
          <span className={cn('text-xs px-1.5 py-0.5 rounded text-white', confidenceInfo.color)}>
            {confidenceInfo.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Primary: Raw Value */}
      <div className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-muted-foreground" />
        <div>
          <div className="text-xs text-muted-foreground">Raw Value</div>
          <div className={cn('text-2xl font-bold', getValueColor(rawValue))}>
            {formatValue(rawValue)}
          </div>
        </div>
      </div>

      {/* Secondary: 9.8 Graded Value */}
      {gradedValue98 && (
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">9.8 Graded</div>
            <div className="text-lg font-semibold text-foreground">
              {formatValue(gradedValue98)}
            </div>
          </div>
        </div>
      )}

      {/* Value Range & Confidence */}
      {showRange && (valueRange || confidenceInfo) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1 border-t border-border/50">
          {valueRange && (
            <span>
              Range: {formatValue(valueRange.low)} - {formatValue(valueRange.high)}
            </span>
          )}
          {confidenceInfo && (
            <div className="flex items-center gap-1">
              <span className={cn('w-2 h-2 rounded-full', confidenceInfo.color)} />
              <span>
                {confidenceScore !== undefined ? `${confidenceScore}%` : confidenceInfo.label}
              </span>
            </div>
          )}
        </div>
      )}

      {/* No Value Available */}
      {!rawValue && !gradedValue98 && (
        <div className="text-sm text-muted-foreground italic">
          Value unavailable
        </div>
      )}
    </div>
  );
}
