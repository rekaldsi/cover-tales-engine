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
import { EmptyCollectionState } from '@/components/dashboard/EmptyCollectionState';
import { CollectionPerformance } from '@/components/dashboard/CollectionPerformance';
import { PortfolioChart } from '@/components/dashboard/PortfolioChart';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Comic } from '@/types/comic';
import { Library, DollarSign, Star, TrendingUp, Loader2, LogIn, RefreshCw, BookOpen, MoreHorizontal, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
    // Round to 2 decimal places first to fix floating point issues
    const roundedValue = Math.round(value * 100) / 100;
    
    if (roundedValue >= 1000) {
      return `$${(roundedValue / 1000).toFixed(1)}k`;
    }
    return `$${roundedValue.toFixed(2)}`;
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
      {/* Stats Grid - moved above hero on mobile */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 order-first sm:order-none">
        <div className="animate-slide-up stagger-1">
          <StatCard
            title="Total Comics"
            value={stats.totalComics}
            subtitle="in your collection"
            icon={Library}
            accentColor="primary"
          />
        </div>
        <div className="animate-slide-up stagger-2">
          <StatCard
            title="Collection Value"
            value={formatCurrency(stats.totalValue)}
            subtitle="estimated total"
            icon={DollarSign}
            accentColor="gold"
          />
        </div>
        <div className="animate-slide-up stagger-3">
          <StatCard
            title="Key Issues"
            value={keyIssueCount}
            subtitle="valuable comics"
            icon={Star}
            accentColor="blue"
          />
        </div>
        <div className="animate-slide-up stagger-4">
          <StatCard
            title="Graded"
            value={gradedCount}
            subtitle="slabbed comics"
            icon={TrendingUp}
            accentColor="green"
          />
        </div>
      </section>

      {/* Portfolio Chart - 30-day value history */}
      <section className="animate-slide-up stagger-5">
        <PortfolioChart 
          snapshots={snapshots} 
          trend={trend} 
          currentValue={stats.totalValue} 
        />
      </section>

      {/* Actions Menu - cleaned up layout */}
      <section className="relative overflow-hidden rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <CollectionPerformance />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAllDetails}
              disabled={isRefreshingValues}
              className="min-h-[44px] flex-1 sm:flex-none"
            >
              {isRefreshingValues ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {refreshProgress.current}/{refreshProgress.total}
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Refresh Details</span>
                  <span className="sm:hidden">Details</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAllValues}
              disabled={isRefreshingValues}
              className="min-h-[44px] flex-1 sm:flex-none"
            >
              {isRefreshingValues ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {refreshProgress.current}/{refreshProgress.total}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Refresh Values</span>
                  <span className="sm:hidden">Values</span>
                </>
              )}
            </Button>
            
            {/* Actions dropdown with Import */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[44px]">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <GoCollectImport onImportComplete={refetch} />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
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
      
      {/* Comic Detail Modal - Unified with Collection page */}
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
