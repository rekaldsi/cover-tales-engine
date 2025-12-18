import { useState } from 'react';
import { useComicCollection } from '@/hooks/useComicCollection';
import { useBackgroundEnrichment } from '@/hooks/useBackgroundEnrichment';
import { StatCard } from '@/components/comics/StatCard';
import { EraChart } from '@/components/comics/EraChart';
import { RecentlyAddedCarousel } from '@/components/comics/RecentlyAddedCarousel';
import { ComicDetailSheet } from '@/components/comics/ComicDetailSheet';
import { SigningRecommendations } from '@/components/signings/SigningRecommendations';
import { GoCollectImport } from '@/components/import/GoCollectImport';
import { EmptyCollectionState } from '@/components/dashboard/EmptyCollectionState';
import { Comic } from '@/types/comic';
import { Library, DollarSign, Star, TrendingUp, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface DashboardProps {
  onAddClick?: () => void;
}

export default function Dashboard({ onAddClick }: DashboardProps) {
  const { comics, getStats, deleteComic, updateComic, refetch } = useComicCollection();
  const { progress, isEnriching } = useBackgroundEnrichment(comics, updateComic);
  const stats = getStats();
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  
  const keyIssueCount = comics.filter(c => c.isKeyIssue).length;
  const gradedCount = comics.filter(c => c.gradeStatus !== 'raw').length;
  
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
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
        
        <EmptyCollectionState onAddClick={onAddClick || (() => {})} />
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
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="absolute inset-0 bg-hero-pattern opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              Welcome to <span className="gradient-text">KØDEX</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Your personal comic book collection manager. Track, organize, and discover the value of your collection.
            </p>
          </div>
          <GoCollectImport onImportComplete={refetch} />
        </div>
      </section>
      
      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            trend={{ value: 12, isPositive: true }}
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
      
      {/* Comic Detail Sheet */}
      <ComicDetailSheet
        comic={selectedComic}
        open={!!selectedComic}
        onOpenChange={(open) => !open && setSelectedComic(null)}
        onDelete={deleteComic}
        onUpdate={updateComic}
      />
    </div>
  );
}
