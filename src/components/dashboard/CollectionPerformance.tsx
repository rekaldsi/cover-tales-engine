import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { usePortfolioSnapshots } from '@/hooks/usePortfolioSnapshots';

interface CollectionPerformanceProps {
  className?: string;
}

export function CollectionPerformance({ className = '' }: CollectionPerformanceProps) {
  const { trend, isLoading } = usePortfolioSnapshots();

  if (isLoading) {
    return (
      <div className={`stat-card p-4 animate-pulse ${className}`}>
        <div className="h-4 bg-muted rounded w-32 mb-2" />
        <div className="h-8 bg-muted rounded w-24" />
      </div>
    );
  }

  if (!trend) {
    return (
      <div className={`stat-card p-4 ${className}`}>
        <p className="text-sm text-muted-foreground">Collection Performance</p>
        <p className="text-xs text-muted-foreground mt-1">
          Not enough data yet. Values are tracked daily.
        </p>
      </div>
    );
  }

  const isPositive = trend.percentChange > 0;
  const isNeutral = Math.abs(trend.percentChange) < 1;

  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const trendColor = isNeutral 
    ? 'text-muted-foreground' 
    : isPositive 
      ? 'text-green-500' 
      : 'text-red-500';

  const formatCurrency = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1000) {
      return `${value >= 0 ? '+' : '-'}$${(abs / 1000).toFixed(1)}k`;
    }
    return `${value >= 0 ? '+' : '-'}$${abs.toFixed(2)}`;
  };

  return (
    <div className={`stat-card p-4 ${className}`}>
      <p className="text-sm text-muted-foreground mb-2">Collection Performance</p>
      
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="w-5 h-5" />
          <span className="text-xl font-bold">
            {isPositive ? '+' : ''}{trend.percentChange.toFixed(1)}%
          </span>
        </div>
        
        <span className="text-sm text-muted-foreground">
          ({formatCurrency(trend.valueChange)})
        </span>
      </div>
      
      <p className="text-xs text-muted-foreground mt-1">
        vs {trend.periodLabel} ago
      </p>
    </div>
  );
}
