import { useMemo } from 'react';
import { Comic } from '@/types/comic';
import { PenTool, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CreatorOpportunity {
  name: string;
  comicCount: number;
  keyIssueCount: number;
  totalValue: number;
  topComic: Comic;
}

interface SigningRecommendationsProps {
  comics: Comic[];
}

export function SigningRecommendations({ comics }: SigningRecommendationsProps) {
  const opportunities = useMemo(() => {
    const creatorMap = new Map<string, CreatorOpportunity>();

    comics.forEach(comic => {
      const processCreator = (name: string | undefined) => {
        if (!name) return;
        
        if (!creatorMap.has(name)) {
          creatorMap.set(name, {
            name,
            comicCount: 0,
            keyIssueCount: 0,
            totalValue: 0,
            topComic: comic,
          });
        }
        
        const opportunity = creatorMap.get(name)!;
        opportunity.comicCount++;
        opportunity.totalValue += comic.currentValue || 0;
        if (comic.isKeyIssue) opportunity.keyIssueCount++;
        
        // Update top comic if this one is more valuable
        if ((comic.currentValue || 0) > (opportunity.topComic.currentValue || 0)) {
          opportunity.topComic = comic;
        }
      };

      processCreator(comic.writer);
      processCreator(comic.artist);
      processCreator(comic.coverArtist);
    });

    // Filter to creators with 3+ comics and sort by value
    return Array.from(creatorMap.values())
      .filter(c => c.comicCount >= 3)
      .sort((a, b) => {
        // Prioritize key issues, then value
        if (b.keyIssueCount !== a.keyIssueCount) return b.keyIssueCount - a.keyIssueCount;
        return b.totalValue - a.totalValue;
      })
      .slice(0, 3);
  }, [comics]);

  if (opportunities.length === 0) return null;

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value}`;
  };

  return (
    <div className="stat-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-primary" />
          <h3 className="font-display text-xl">Top Signing Opportunities</h3>
        </div>
        <Link to="/signings" className="text-sm text-primary hover:underline flex items-center gap-1">
          Plan signings <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {opportunities.map((opportunity) => (
          <Link
            key={opportunity.name}
            to={`/signings?q=${encodeURIComponent(opportunity.name)}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <PenTool className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{opportunity.name}</p>
                {opportunity.keyIssueCount > 0 && (
                  <div className="flex items-center gap-1 text-accent">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-xs">{opportunity.keyIssueCount}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {opportunity.comicCount} comics · {formatCurrency(opportunity.totalValue)} value
              </p>
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
