import { Comic, ERA_LABELS } from '@/types/comic';
import { Badge } from '@/components/ui/badge';
import { Star, ImageOff } from 'lucide-react';
import { SlabbedCover } from './SlabbedCover';

interface ComicCardProps {
  comic: Comic;
  onClick: () => void;
}

export function ComicCard({ comic, onClick }: ComicCardProps) {
  const formattedValue = comic.currentValue 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(comic.currentValue)
    : null;
  
  const isGraded = comic.gradeStatus !== 'raw';
  const hasMissingData = !comic.coverImage || !comic.writer || !comic.artist;
    
  return (
    <article 
      onClick={onClick}
      className="comic-card cursor-pointer group"
    >
      {/* Cover Image with Slab Frame for Graded */}
      <div className="relative overflow-hidden bg-secondary p-2">
        <SlabbedCover
          coverUrl={comic.coverImage}
          title={comic.title}
          issueNumber={comic.issueNumber}
          gradeStatus={comic.gradeStatus}
          grade={comic.grade}
          certNumber={comic.certNumber}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Key Issue Badge */}
        {comic.isKeyIssue && (
          <div className="absolute top-4 left-4 z-10">
            <Badge className="bg-accent text-accent-foreground gap-1 shadow-lg">
              <Star className="h-3 w-3 fill-current" />
              KEY
            </Badge>
          </div>
        )}
        
        {/* Missing Data Indicator */}
        {hasMissingData && (
          <div className="absolute top-4 right-4 z-10">
            <Badge variant="outline" className="bg-card/90 backdrop-blur-sm text-muted-foreground gap-1">
              <ImageOff className="h-3 w-3" />
            </Badge>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-80 pointer-events-none" />
      </div>
      
      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {comic.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              #{comic.issueNumber} {comic.variant && `• ${comic.variant}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className={`era-badge era-${comic.era}`}>
            {ERA_LABELS[comic.era]}
          </span>
          {formattedValue && (
            <span className="text-sm font-semibold gold-text">
              {formattedValue}
            </span>
          )}
        </div>
        
        {comic.isKeyIssue && comic.keyIssueReason && (
          <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border/50">
            {comic.keyIssueReason}
          </p>
        )}
      </div>
    </article>
  );
}
