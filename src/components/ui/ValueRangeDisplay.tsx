import { cn } from '@/lib/utils';

interface ValueRangeDisplayProps {
  value: number;
  rangeLow?: number;
  rangeHigh?: number;
  showRange?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round(value * 100) / 100);
}

export function ValueRangeDisplay({ 
  value, 
  rangeLow, 
  rangeHigh, 
  showRange = true,
  size = 'sm',
  className 
}: ValueRangeDisplayProps) {
  const hasRange = showRange && 
    rangeLow !== undefined && 
    rangeHigh !== undefined && 
    rangeLow !== rangeHigh &&
    (rangeLow > 0 || rangeHigh > 0);
  
  const textSize = cn(
    size === 'sm' && 'text-xs',
    size === 'md' && 'text-sm',
    size === 'lg' && 'text-base'
  );

  const rangeTextSize = cn(
    size === 'sm' && 'text-[10px]',
    size === 'md' && 'text-xs',
    size === 'lg' && 'text-sm'
  );
  
  return (
    <div className={cn('flex items-baseline gap-1', className)}>
      <span className={cn(textSize, 'font-semibold text-accent')}>
        {formatCurrencyCompact(value)}
      </span>
      {hasRange && (
        <span className={cn(rangeTextSize, 'text-muted-foreground')}>
          ({formatCurrencyCompact(rangeLow!)}–{formatCurrencyCompact(rangeHigh!)})
        </span>
      )}
    </div>
  );
}
