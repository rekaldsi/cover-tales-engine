import { Comic, ERA_LABELS } from '@/types/comic';
import { SlabbedCover } from './SlabbedCover';

interface ComicCardProps {
  comic: Comic;
  onClick: () => void;
}

export function ComicCard({ comic, onClick }: ComicCardProps) {
  const formattedValue = comic.currentValue 
    ? new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(comic.currentValue)
    : null;
    
  return (
    <article 
      onClick={onClick}
      className="comic-card cursor-pointer min-h-[44px] active:opacity-90 transition-opacity w-full max-w-full overflow-hidden"
    >
      {/* Cover Image */}
      <div className="relative overflow-hidden bg-secondary/30 p-1.5">
        <SlabbedCover
          coverUrl={comic.coverImage}
          title={comic.title}
          issueNumber={comic.issueNumber}
          gradeStatus={comic.gradeStatus}
          grade={comic.grade}
          isKeyIssue={comic.isKeyIssue}
        />
      </div>
      
      {/* Info - simplified */}
      <div className="p-2.5 space-y-1">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground truncate text-sm leading-tight">
            {comic.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            #{comic.issueNumber} {comic.variant && `• ${comic.variant}`}
          </p>
        </div>
        
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
            {ERA_LABELS[comic.era]}
          </span>
          {formattedValue && (
            <span className="text-xs font-semibold text-accent">
              {formattedValue}
            </span>
          )}
        </div>
        
        {comic.isKeyIssue && comic.keyIssueReason && (
          <p className="text-[10px] text-muted-foreground/60 line-clamp-1 pt-1 border-t border-border/20">
            {comic.keyIssueReason}
          </p>
        )}
      </div>
    </article>
  );
}
