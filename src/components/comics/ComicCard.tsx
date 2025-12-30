import { Comic, ERA_LABELS } from '@/types/comic';
import { SlabbedCover } from './SlabbedCover';
import { Pen } from 'lucide-react';
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator';
import { ValueRangeDisplay } from '@/components/ui/ValueRangeDisplay';
import { getSlabPresentation } from '@/lib/slabPresentation';
import { getSignerNames } from '@/lib/signatureHelpers';

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
  
  // Use canonical slab presentation helper
  const slab = getSlabPresentation({
    gradeStatus: comic.gradeStatus,
    grade: comic.grade,
    labelType: comic.labelType,
    signatureType: comic.signatureType,
    isSigned: comic.isSigned,
  });
  
  // Get signer names - only show pills for raw signed books
  // Graded SS books use yellow slab instead
  const signerNames = comic.gradeStatus === 'raw' ? getSignerNames(comic) : [];
  const showSignerPills = signerNames.length > 0;
    
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
        
        {/* Signer Pills - replaces generic SIGNED badge */}
        {showSignerPills && (
          <div className="flex flex-wrap gap-1">
            {signerNames.map((name, index) => (
              <span
                key={`${name}-${index}`}
                className="inline-flex items-center gap-0.5 bg-primary/10 text-primary border border-primary/30 text-[10px] px-1.5 py-0.5 rounded"
              >
                <Pen className="h-2.5 w-2.5" />
                {name}
              </span>
            ))}
          </div>
        )}
        
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
