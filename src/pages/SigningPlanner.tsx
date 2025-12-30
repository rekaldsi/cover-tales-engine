import { useState, useMemo } from 'react';
import { useComicCollection } from '@/hooks/useComicCollection';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Comic } from '@/types/comic';
import { Search, PenTool, Star, CheckCircle2, Image, CalendarDays } from 'lucide-react';
import { ComicDetailSheet } from '@/components/comics/ComicDetailSheet';
import { ConventionMode } from '@/components/signings/ConventionMode';

interface CreatorMatch {
  name: string;
  role: 'writer' | 'artist' | 'coverArtist';
  comics: Comic[];
  totalValue: number;
  keyIssueCount: number;
}

export default function SigningPlanner() {
  const { comics, deleteComic, updateComic } = useComicCollection();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);

  // Aggregate comics by creator matching search
  const matchingCreators = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const creatorMap = new Map<string, CreatorMatch>();

    comics.forEach(comic => {
      const addToCreator = (name: string | undefined, role: CreatorMatch['role']) => {
        if (!name || !name.toLowerCase().includes(query)) return;
        
        const key = `${name}-${role}`;
        if (!creatorMap.has(key)) {
          creatorMap.set(key, {
            name,
            role,
            comics: [],
            totalValue: 0,
            keyIssueCount: 0,
          });
        }
        const creator = creatorMap.get(key)!;
        creator.comics.push(comic);
        creator.totalValue += comic.currentValue || 0;
        if (comic.isKeyIssue) creator.keyIssueCount++;
      };

      addToCreator(comic.writer, 'writer');
      addToCreator(comic.artist, 'artist');
      addToCreator(comic.coverArtist, 'coverArtist');
    });

    // Sort comics within each creator by value and key status
    creatorMap.forEach(creator => {
      creator.comics.sort((a, b) => {
        if (a.isKeyIssue && !b.isKeyIssue) return -1;
        if (!a.isKeyIssue && b.isKeyIssue) return 1;
        return (b.currentValue || 0) - (a.currentValue || 0);
      });
    });

    return Array.from(creatorMap.values()).sort((a, b) => {
      // Sort by key issues first, then total value
      if (b.keyIssueCount !== a.keyIssueCount) return b.keyIssueCount - a.keyIssueCount;
      return b.totalValue - a.totalValue;
    });
  }, [comics, searchQuery]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  const getRoleIcon = (role: CreatorMatch['role']) => {
    switch (role) {
      case 'writer': return <PenTool className="h-3 w-3" />;
      case 'artist': return <PenTool className="h-3 w-3" />;
      case 'coverArtist': return <Image className="h-3 w-3" />;
    }
  };

  const getRoleLabel = (role: CreatorMatch['role']) => {
    switch (role) {
      case 'writer': return 'Writer';
      case 'artist': return 'Interior Artist';
      case 'coverArtist': return 'Cover Artist';
    }
  };

  const totalBooksToSign = matchingCreators.reduce((sum, c) => sum + c.comics.length, 0);
  const totalSigningValue = matchingCreators.reduce((sum, c) => sum + c.totalValue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl tracking-tight">Signing Planner</h1>
        <p className="text-muted-foreground">
          Plan signings by creator search or convention
        </p>
      </div>

      <Tabs defaultValue="creator" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="creator" className="gap-2">
            <PenTool className="h-4 w-4" />
            Creator Search
          </TabsTrigger>
          <TabsTrigger value="convention" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Convention Mode
          </TabsTrigger>
        </TabsList>

        <TabsContent value="convention" className="mt-6">
          <ConventionMode />
        </TabsContent>

        <TabsContent value="creator" className="mt-6 space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search creator name (e.g., Jim Lee, Todd McFarlane)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 text-lg bg-secondary/50 border-border"
        />
      </div>

      {/* Summary Stats */}
      {searchQuery && matchingCreators.length > 0 && (
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
          <div className="text-center">
            <p className="text-3xl font-display text-primary">{totalBooksToSign}</p>
            <p className="text-sm text-muted-foreground">Comics to Sign</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-display gold-text">{formatCurrency(totalSigningValue)}</p>
            <p className="text-sm text-muted-foreground">Total Value</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-display text-accent">
              {matchingCreators.reduce((sum, c) => sum + c.keyIssueCount, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Key Issues</p>
          </div>
        </div>
      )}

      {/* Results */}
      {searchQuery && matchingCreators.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <PenTool className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No creators found matching "{searchQuery}"</p>
          <p className="text-sm mt-1">Try a different name or add more comics to your collection</p>
        </div>
      )}

      {/* Creator Sections */}
      <div className="space-y-6">
        {matchingCreators.map((creator) => (
          <div key={`${creator.name}-${creator.role}`} className="stat-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {getRoleIcon(creator.role)}
                </div>
                <div>
                  <h3 className="font-display text-xl">{creator.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {getRoleLabel(creator.role)}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-display gold-text">{formatCurrency(creator.totalValue)}</p>
                <p className="text-sm text-muted-foreground">{creator.comics.length} comics</p>
              </div>
            </div>

            <div className="space-y-2">
              {creator.comics.map((comic) => (
                <button
                  key={comic.id}
                  onClick={() => setSelectedComic(comic)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                >
                  {comic.coverImage ? (
                    <img 
                      src={comic.coverImage} 
                      alt={comic.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                      No Cover
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{comic.title} #{comic.issueNumber}</p>
                      {comic.isKeyIssue && (
                        <Star className="h-4 w-4 text-accent fill-accent flex-shrink-0" />
                      )}
                      {comic.isSigned && (
                        <CheckCircle2 className="h-4 w-4 text-comic-green flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {comic.keyIssueReason || comic.publisher}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {comic.currentValue && (
                      <p className="font-semibold gold-text">{formatCurrency(comic.currentValue)}</p>
                    )}
                    {comic.grade && (
                      <Badge variant="outline" className="text-xs">
                        {comic.gradeStatus.toUpperCase()} {comic.grade}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!searchQuery && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
            <PenTool className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-display mb-2">Plan Your Signings</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Search for a creator to see all comics in your collection that they worked on. 
            Perfect for preparing for conventions!
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['Jim Lee', 'Todd McFarlane', 'Frank Miller', 'Alex Ross'].map((name) => (
              <Button
                key={name}
                variant="secondary"
                size="sm"
                onClick={() => setSearchQuery(name)}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Comic Detail Sheet */}
      <ComicDetailSheet
        comic={selectedComic}
        open={!!selectedComic}
        onOpenChange={(open) => !open && setSelectedComic(null)}
        onDelete={deleteComic}
        onUpdate={updateComic}
      />
        </TabsContent>
      </Tabs>
    </div>
  );
}
