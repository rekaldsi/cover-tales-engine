import { Comic, ERA_LABELS } from '@/types/comic';
import { Star } from 'lucide-react';
import { SlabbedCover } from './SlabbedCover';

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
      className="comic-card cursor-pointer"
    >
      {/* Cover Image */}
      <div className="relative overflow-hidden bg-secondary/50 p-2">
        <SlabbedCover
          coverUrl={comic.coverImage}
          title={comic.title}
          issueNumber={comic.issueNumber}
          gradeStatus={comic.gradeStatus}
          grade={comic.grade}
          isKeyIssue={comic.isKeyIssue}
        />
      </div>
      
      {/* Info */}
      <div className="p-3 space-y-1.5">
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground truncate text-sm">
            {comic.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            #{comic.issueNumber} {comic.variant && `• ${comic.variant}`}
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {ERA_LABELS[comic.era]}
          </span>
          {formattedValue && (
            <span className="text-xs font-semibold text-amber-500">
              {formattedValue}
            </span>
          )}
        </div>
        
        {comic.isKeyIssue && comic.keyIssueReason && (
          <p className="text-xs text-muted-foreground/70 line-clamp-1 pt-1 border-t border-border/30">
            {comic.keyIssueReason}
          </p>
        )}
      </div>
    </article>
  );
}
