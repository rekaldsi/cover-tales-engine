import { ReactNode } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  threshold?: number;
  enabled?: boolean;
}

/**
 * Pull-to-refresh wrapper component
 * Adds iOS/Android-style pull-to-refresh functionality
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  enabled = true,
}: PullToRefreshProps) {
  const { pullDistance, isRefreshing, isTriggered, pullProgress } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled,
  });

  const showIndicator = pullDistance > 0 || isRefreshing;
  const indicatorHeight = Math.max(pullDistance, isRefreshing ? 60 : 0);

  return (
    <div className="relative">
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center transition-opacity',
          'bg-gradient-to-b from-background/80 to-transparent backdrop-blur-sm',
          showIndicator ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{
          height: `${indicatorHeight}px`,
          transform: `translateY(-${indicatorHeight}px)`,
        }}
      >
        <div className="flex flex-col items-center gap-1">
          {isRefreshing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Refreshing...</span>
            </>
          ) : (
            <>
              <ArrowDown
                className={cn(
                  'w-5 h-5 transition-all',
                  isTriggered
                    ? 'text-primary rotate-180'
                    : 'text-muted-foreground'
                )}
                style={{
                  transform: `rotate(${isTriggered ? 180 : 0}deg) scale(${0.7 + pullProgress * 0.3})`,
                }}
              />
              <span className="text-xs text-muted-foreground">
                {isTriggered ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-150 ease-out"
        style={{
          transform: isRefreshing
            ? 'translateY(60px)'
            : `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
