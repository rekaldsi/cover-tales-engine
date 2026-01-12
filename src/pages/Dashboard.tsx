import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useComicCollection } from '@/hooks/useComicCollection';
import { useBackgroundEnrichment } from '@/hooks/useBackgroundEnrichment';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolioSnapshots } from '@/hooks/usePortfolioSnapshots';
import { useRealtimeSnapshots } from '@/hooks/useRealtimeSnapshots';
import { StatCard } from '@/components/comics/StatCard';
import { EraChart } from '@/components/comics/EraChart';
import { RecentlyAddedCarousel } from '@/components/comics/RecentlyAddedCarousel';
import { ComicDetailModal } from '@/components/comics/ComicDetailModal';
import { SigningRecommendations } from '@/components/signings/SigningRecommendations';
import { GoCollectImport } from '@/components/import/GoCollectImport';
import { CSVImportWizard } from '@/components/import/CSVImportWizard';
import { EmptyCollectionState } from '@/components/dashboard/EmptyCollectionState';
import { PortfolioChart } from '@/components/dashboard/PortfolioChart';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Comic } from '@/types/comic';
import { Library, DollarSign, Star, TrendingUp, Loader2, LogIn, RefreshCw, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface DashboardProps {
  onAddClick?: () => void;
  onHuntingClick?: () => void;
}

export default function Dashboard({ onAddClick, onHuntingClick }: DashboardProps) {
  const { comics, getStats, deleteComic, updateComic, refetch, refreshAllValues, refreshAllDetails, isRefreshingValues, refreshProgress } = useComicCollection();
  const { progress, isEnriching } = useBackgroundEnrichment(comics, updateComic);
  const { user } = useAuth();
  const { snapshots, trend, saveSnapshot, refetch: refetchSnapshots } = usePortfolioSnapshots();
  const navigate = useNavigate();
  const stats = getStats();

  // Realtime subscriptions for live updates
  const handleSnapshotChange = useCallback(() => {
    refetchSnapshots();
  }, [refetchSnapshots]);

  useRealtimeSnapshots({
    onSnapshotChange: handleSnapshotChange,
  });
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  
  const keyIssueCount = comics.filter(c => c.isKeyIssue).length;
  const gradedCount = comics.filter(c => c.gradeStatus !== 'raw').length;

  // Save portfolio snapshot when collection changes
  useEffect(() => {
    if (user && comics.length > 0) {
      saveSnapshot({
        totalValue: stats.totalValue,
        comicCount: stats.totalComics,
        gradedCount,
        keyIssueCount,
      });
    }
  }, [user, stats.totalValue, stats.totalComics, gradedCount, keyIssueCount]);
  
  const formatCurrency = (value: number) => {
    const roundedValue = Math.round(value * 100) / 100;
    if (roundedValue >= 1000) {
      return `$${(roundedValue / 1000).toFixed(1)}k`;
    }
    return `$${roundedValue.toFixed(2)}`;
  };

  // Combined update handler
  const handleUpdateCollection = async () => {
    await refreshAllDetails();
    await refreshAllValues();
  };
  
  // Show empty state if no comics
  if (comics.length === 0) {
    return (
      <div className="animate-fade-in">
        <section className="relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-8">
          <div className="absolute inset-0 bg-hero-pattern opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          
          <div className="relative z-10">
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              Welcome to <span className="gradient-text">KØDEX</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Your personal comic book collection manager. Track, organize, and discover the value of your collection.
            </p>
          </div>
        </section>

        {/* Login Prompt for unauthenticated users */}
        {!user && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                Sign in to save your collection
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create an account to store your comics and access them from any device.
              </p>
            </div>
            <Button onClick={() => navigate('/auth')} className="min-h-[44px]">
              Sign In / Sign Up
            </Button>
          </div>
        )}
        
        <EmptyCollectionState onAddClick={onAddClick || (() => {})} onHuntingClick={onHuntingClick} />
      </div>
    );
  }
  
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Background Enrichment Progress */}
      {isEnriching && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 p-4 bg-card border border-border rounded-lg shadow-lg animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Enriching collection data...</span>
          </div>
          <Progress value={(progress.completed / progress.total) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {progress.completed} of {progress.total} comics
          </p>
        </div>
      )}

      {/* HERO: Portfolio Value - Full Width Gradient */}
      <section className="relative overflow-hidden rounded-2xl p-8 sm:p-12 animate-slide-up">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
        <div className="absolute inset-0 bg-hero-pattern opacity-5" />

        <div className="relative z-10 space-y-6">
          {/* Main value display */}
          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              Collection Value
            </p>
            <div className="flex items-baseline gap-4 flex-wrap">
              <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl gradient-text">
                ${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h1>
              {trend && (
                <div className={`flex items-center gap-2 ${
                  trend.percentChange > 0
                    ? 'text-green-400'
                    : trend.percentChange < 0
                      ? 'text-red-400'
                      : 'text-muted-foreground'
                }`}>
                  {trend.percentChange > 0 ? (
                    <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8" />
                  ) : trend.percentChange < 0 ? (
                    <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8" />
                  ) : null}
                  <span className="text-2xl sm:text-3xl font-bold">
                    {trend.percentChange > 0 ? '+' : ''}{trend.percentChange.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
            {trend && (
              <p className={`text-sm sm:text-base mt-2 ${
                trend.valueChange > 0
                  ? 'text-green-400'
                  : trend.valueChange < 0
                    ? 'text-red-400'
                    : 'text-muted-foreground'
              }`}>
                {trend.valueChange > 0 ? '+' : ''}${Math.abs(trend.valueChange).toLocaleString()} from {trend.periodLabel} ago
              </p>
            )}
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Comics</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalComics}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Key Issues</p>
              <p className="text-2xl font-bold text-foreground">{keyIssueCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Graded</p>
              <p className="text-2xl font-bold text-foreground">{gradedCount}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Chart - Enhanced Size */}
      <section className="animate-slide-up stagger-2">
        <PortfolioChart
          snapshots={snapshots}
          trend={trend}
          currentValue={stats.totalValue}
        />
      </section>

      {/* Actions Row - Simplified */}
      <section className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleUpdateCollection}
          disabled={isRefreshingValues}
          className="min-h-[44px] gap-2"
        >
          {isRefreshingValues ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {refreshProgress.current}/{refreshProgress.total}
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Update Collection
            </>
          )}
        </Button>
        
        {/* Overflow menu for advanced options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-[44px]">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={refreshAllDetails} disabled={isRefreshingValues}>
              Update Metadata
            </DropdownMenuItem>
            <DropdownMenuItem onClick={refreshAllValues} disabled={isRefreshingValues}>
              Update Prices
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="p-0">
              <CSVImportWizard onComplete={refetch} />
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="p-0">
              <GoCollectImport onImportComplete={refetch} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>
      
      {/* Recent Additions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-tight">Recently Added</h2>
          <a href="/collection" className="text-sm text-primary hover:underline">
            View all →
          </a>
        </div>
        
        <RecentlyAddedCarousel 
          comics={stats.recentlyAdded}
          onComicClick={setSelectedComic}
        />
      </section>

      {/* Signing Recommendations */}
      <SigningRecommendations comics={comics} />
      
      {/* Era Distribution */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="stat-card p-6">
          <h3 className="font-display text-xl mb-4">Collection by Era</h3>
          <EraChart data={stats.byEra} />
        </div>
        
        <div className="stat-card p-6">
          <h3 className="font-display text-xl mb-4">Top Publishers</h3>
          <div className="space-y-3">
            {Object.entries(stats.byPublisher)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([publisher, count]) => {
                const percentage = Math.round((count / stats.totalComics) * 100);
                return (
                  <div key={publisher} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{publisher}</span>
                      <span className="text-muted-foreground">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </section>
      
      {/* Comic Detail Modal */}
      <ComicDetailModal
        comic={selectedComic}
        open={!!selectedComic}
        onOpenChange={(open) => !open && setSelectedComic(null)}
        onDelete={deleteComic}
        onUpdate={updateComic}
      />
    </div>
  );
}
