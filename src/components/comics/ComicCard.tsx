import { Comic, ERA_LABELS } from '@/types/comic';
import { SlabbedCover } from './SlabbedCover';
import { PenTool } from 'lucide-react';
import { ConfidenceIndicator, getConfidenceLevel } from '@/components/ui/ConfidenceIndicator';
import { ValueRangeDisplay } from '@/components/ui/ValueRangeDisplay';

interface ComicCardProps {
  comic: Comic;
  onClick: () => void;
}

// Extended comic type to include DB fields that may not be in frontend type yet
interface ExtendedComic extends Comic {
  confidenceScore?: number;
  valueRangeLow?: number;
  valueRangeHigh?: number;
}

export function ComicCard({ comic, onClick }: ComicCardProps) {
  const extComic = comic as ExtendedComic;
    
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
          isSigned={comic.isSigned}
          labelType={comic.labelType}
          signatureType={comic.signatureType}
        />
        
        {/* Signed Badge - only show for raw signed books (graded SS uses yellow slab) */}
        {comic.isSigned && comic.gradeStatus === 'raw' && (
          <div className="absolute top-3 right-3 bg-comic-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md">
            <PenTool className="h-2.5 w-2.5" />
            SIGNED
          </div>
        )}
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
          {extComic.currentValue && (
            <div className="flex items-center gap-1">
              <ValueRangeDisplay 
                value={extComic.currentValue}
                rangeLow={extComic.valueRangeLow || extComic.valueRange?.low}
                rangeHigh={extComic.valueRangeHigh || extComic.valueRange?.high}
                size="sm"
              />
              {extComic.confidenceScore !== undefined && (
                <ConfidenceIndicator score={extComic.confidenceScore} size="sm" />
              )}
            </div>
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
