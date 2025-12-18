import { Comic, ERA_LABELS } from '@/types/comic';
import { Badge } from '@/components/ui/badge';
import { Star, Award } from 'lucide-react';

interface ComicCardProps {
  comic: Comic;
  onClick: () => void;
}

export function ComicCard({ comic, onClick }: ComicCardProps) {
  const formattedValue = comic.currentValue 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(comic.currentValue)
    : null;
    
  return (
    <article 
      onClick={onClick}
      className="comic-card cursor-pointer group"
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/3] overflow-hidden bg-secondary">
        {comic.coverImage ? (
          <img 
            src={comic.coverImage} 
            alt={`${comic.title} #${comic.issueNumber}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
            <div className="text-center p-4">
              <p className="font-display text-2xl text-muted-foreground">{comic.title}</p>
              <p className="text-4xl font-display text-primary">#{comic.issueNumber}</p>
            </div>
          </div>
        )}
        
        {/* Key Issue Badge */}
        {comic.isKeyIssue && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-accent text-accent-foreground gap-1 shadow-lg">
              <Star className="h-3 w-3 fill-current" />
              KEY
            </Badge>
          </div>
        )}
        
        {/* Grade Badge */}
        {comic.grade && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm shadow-lg">
              <Award className="h-3 w-3 mr-1" />
              {comic.grade}
            </Badge>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent opacity-80" />
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
