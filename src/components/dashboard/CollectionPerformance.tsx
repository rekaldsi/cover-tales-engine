import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Camera, RefreshCw, Loader2 } from 'lucide-react';
import { usePortfolioSnapshots } from '@/hooks/usePortfolioSnapshots';
import { Button } from '@/components/ui/button';

interface CollectionPerformanceProps {
  className?: string;
}

export function CollectionPerformance({ className = '' }: CollectionPerformanceProps) {
  const { trend, isLoading, saveSnapshot } = usePortfolioSnapshots();
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      // Create initial baseline with zeros - will be updated on next collection refresh
      await saveSnapshot({
        totalValue: 0,
        comicCount: 0,
        gradedCount: 0,
        keyIssueCount: 0,
      });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

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
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Create Baseline Snapshot</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Track your collection's value over time by creating your first portfolio snapshot.
            </p>
            <Button 
              size="sm" 
              onClick={handleCreateSnapshot}
              disabled={isCreatingSnapshot}
              className="gap-2"
            >
              {isCreatingSnapshot ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Camera className="w-3 h-3" />
                  Create Snapshot
                </>
              )}
            </Button>
          </div>
        </div>
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
