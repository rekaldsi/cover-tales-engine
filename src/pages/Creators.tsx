import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Users, Book, Star, DollarSign, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreatorCard } from '@/components/creators/CreatorCard';
import { ComicCard } from '@/components/comics/ComicCard';
import { ComicDetailSheet } from '@/components/comics/ComicDetailSheet';
import { useCreators, CreatorAggregate } from '@/hooks/useCreators';
import { useCreatorEnrichment } from '@/hooks/useCreatorEnrichment';
import { Comic } from '@/types/comic';
import { toast } from 'sonner';

interface CreatorsProps {
  comics: Comic[];
  onUpdateComic?: (id: string, updates: Partial<Comic>) => Promise<void>;
}

type SortOption = 'comics' | 'value' | 'keys' | 'name';

export function Creators({ comics, onUpdateComic }: CreatorsProps) {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState<SortOption>('comics');
  const [selectedCreator, setSelectedCreator] = useState<CreatorAggregate | null>(null);
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'writer' | 'artist' | 'coverArtist'>('all');
  
  const { creators, searchCreators } = useCreators(comics);
  const { runEnrichment, isEnriching, progress, error: enrichmentError } = useCreatorEnrichment();

  const handleEnrichCreators = async () => {
    const result = await runEnrichment();
    if (result.success) {
      toast.success(`Enriched ${result.data?.enriched || 0} comics with creator data`);
    } else {
      toast.error(result.error || 'Failed to enrich creator data');
    }
  };

  const filteredCreators = useMemo(() => {
    let result = search ? searchCreators(search) : creators;
    
    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter(c => c.roles.includes(roleFilter));
    }
    
    // Sort
    switch (sortBy) {
      case 'value':
        result = [...result].sort((a, b) => b.totalValue - a.totalValue);
        break;
      case 'keys':
        result = [...result].sort((a, b) => b.keyIssueCount - a.keyIssueCount);
        break;
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        result = [...result].sort((a, b) => b.comicCount - a.comicCount);
    }
    
    return result;
  }, [creators, search, sortBy, roleFilter, searchCreators]);

  const stats = useMemo(() => ({
    totalCreators: creators.length,
    writers: creators.filter(c => c.roles.includes('writer')).length,
    artists: creators.filter(c => c.roles.includes('artist')).length,
    coverArtists: creators.filter(c => c.roles.includes('coverArtist')).length,
  }), [creators]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="w-4 h-4" />
            Total Creators
          </div>
          <p className="text-2xl font-display mt-1">{stats.totalCreators}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="text-comic-blue">✍️</span>
            Writers
          </div>
          <p className="text-2xl font-display mt-1">{stats.writers}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="text-comic-purple">🎨</span>
            Artists
          </div>
          <p className="text-2xl font-display mt-1">{stats.artists}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span className="text-accent">⭐</span>
            Cover Artists
          </div>
          <p className="text-2xl font-display mt-1">{stats.coverArtists}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="writer">Writers</TabsTrigger>
            <TabsTrigger value="artist">Artists</TabsTrigger>
            <TabsTrigger value="coverArtist">Covers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Sort Options */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        {(['comics', 'value', 'keys', 'name'] as SortOption[]).map((option) => (
          <Button
            key={option}
            variant={sortBy === option ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy(option)}
            className="text-xs"
          >
            {option === 'comics' && '# Comics'}
            {option === 'value' && 'Value'}
            {option === 'keys' && 'Key Issues'}
            {option === 'name' && 'Name'}
          </Button>
        ))}
      </div>

      {/* Creator Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCreators.map((creator) => (
          <CreatorCard
            key={creator.name}
            creator={creator}
            onClick={() => setSelectedCreator(creator)}
          />
        ))}
      </div>

      {filteredCreators.length === 0 && comics.length > 0 && creators.length === 0 && (
        <div className="text-center py-12 glass-panel rounded-xl">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Creator credits aren't fully enriched yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Run creator enrichment to fetch writer, artist, and cover artist data from ComicVine and Metron.
          </p>
          <Button 
            onClick={handleEnrichCreators} 
            disabled={isEnriching}
            className="gap-2"
          >
            {isEnriching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enriching{progress ? ` (${progress.processed}/${progress.total})` : '...'}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Run Creator Enrichment
              </>
            )}
          </Button>
          {enrichmentError && (
            <p className="text-destructive text-sm mt-4">{enrichmentError}</p>
          )}
        </div>
      )}

      {filteredCreators.length === 0 && (creators.length > 0 || comics.length === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No creators found</p>
        </div>
      )}

      {/* Creator Detail Sheet */}
      <Sheet open={!!selectedCreator} onOpenChange={(open) => !open && setSelectedCreator(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-comic-purple/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              {selectedCreator?.name}
            </SheetTitle>
          </SheetHeader>
          
          {selectedCreator && (
            <div className="mt-6 space-y-6">
              {/* Roles */}
              <div className="flex flex-wrap gap-2">
                {selectedCreator.roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role === 'writer' && '✍️ Writer'}
                    {role === 'artist' && '🎨 Artist'}
                    {role === 'coverArtist' && '⭐ Cover Artist'}
                  </Badge>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-secondary">
                  <Book className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xl font-bold">{selectedCreator.comicCount}</p>
                  <p className="text-xs text-muted-foreground">Comics</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary">
                  <Star className="w-5 h-5 mx-auto mb-1 text-accent" />
                  <p className="text-xl font-bold">{selectedCreator.keyIssueCount}</p>
                  <p className="text-xs text-muted-foreground">Key Issues</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary">
                  <DollarSign className="w-5 h-5 mx-auto mb-1 text-comic-green" />
                  <p className="text-xl font-bold">${selectedCreator.totalValue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Value</p>
                </div>
              </div>

              {/* Comics List */}
              <div>
                <h4 className="font-semibold mb-3">Comics in Collection</h4>
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-3 pr-4">
                    {selectedCreator.comics
                      .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
                      .map((comic) => (
                        <ComicCard
                          key={comic.id}
                          comic={comic}
                          onClick={() => setSelectedComic(comic)}
                        />
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Comic Detail Sheet */}
      <ComicDetailSheet
        comic={selectedComic}
        open={!!selectedComic}
        onOpenChange={(open) => !open && setSelectedComic(null)}
        onDelete={() => {}}
        onUpdate={onUpdateComic || (async () => {})}
      />
    </div>
  );
}
