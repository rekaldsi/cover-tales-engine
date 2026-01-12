import { useState } from 'react';
import { Comic, ERA_LABELS } from '@/types/comic';
import { SlabbedCover } from './SlabbedCover';
import { Pen, Star } from 'lucide-react';
import { ConfidenceIndicator } from '@/components/ui/ConfidenceIndicator';
import { ValueRangeDisplay } from '@/components/ui/ValueRangeDisplay';
import { getSlabPresentation } from '@/lib/slabPresentation';
import { getSignerNames } from '@/lib/signatureHelpers';
import { cn } from '@/lib/utils';

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

/**
 * Cover-first comic card design
 * - Cover fills entire card height
 * - Glass panel overlay at bottom (minimal info always visible)
 * - Hover reveals full metadata panel
 * - Tap on mobile shows/hides metadata
 */
export function ComicCard({ comic, onClick }: ComicCardProps) {
  const [showMetadata, setShowMetadata] = useState(false);
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
  const signerNames = comic.gradeStatus === 'raw' ? getSignerNames(comic) : [];
  const showSignerPills = signerNames.length > 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // On mobile/tablet, first tap toggles metadata
    // Second tap (or click on desktop) opens detail modal
    if (window.innerWidth < 1024 && !showMetadata) {
      e.stopPropagation();
      setShowMetadata(true);
      // Hide after 3 seconds
      setTimeout(() => setShowMetadata(false), 3000);
    } else {
      onClick();
    }
  };

  return (
    <article
      onClick={handleCardClick}
      onMouseEnter={() => setShowMetadata(true)}
      onMouseLeave={() => setShowMetadata(false)}
      className="comic-card cursor-pointer relative overflow-hidden group w-full transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
    >
      {/* Cover fills entire card */}
      <div className="relative w-full h-full min-h-[280px] bg-secondary/30">
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

        {/* Value badge - top right corner (for high-value comics) */}
        {extComic.currentValue && extComic.currentValue >= 50 && (
          <div className="absolute top-2 right-2 z-10">
            <ValueRangeDisplay
              value={extComic.currentValue}
              rangeLow={extComic.valueRangeLow || extComic.valueRange?.low}
              rangeHigh={extComic.valueRangeHigh || extComic.valueRange?.high}
              size="sm"
            />
          </div>
        )}

        {/* Key issue indicator - bottom left */}
        {comic.isKeyIssue && (
          <div className="absolute bottom-2 left-2 z-10 bg-primary/90 text-primary-foreground rounded-full p-1.5">
            <Star className="h-3 w-3 fill-current" />
          </div>
        )}

        {/* Glass panel overlay - always visible (minimal) */}
        <div className="absolute bottom-0 left-0 right-0 z-20 glass-panel backdrop-blur-md bg-background/80 border-t border-border/50 p-2">
          <div className="flex items-center justify-between gap-2">
            {/* Value - most prominent */}
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

            {/* Grade badge (compact) */}
            {comic.gradeStatus === 'graded' && comic.grade && (
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                {comic.gradeStatus} {comic.grade}
              </span>
            )}
          </div>
        </div>

        {/* Full metadata panel - shows on hover/tap */}
        <div
          className={cn(
            "absolute inset-0 z-30 glass-panel backdrop-blur-xl bg-background/95 p-4 transition-all duration-300",
            showMetadata
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          <div className="space-y-3 h-full flex flex-col">
            {/* Title & Issue */}
            <div>
              <h3 className="font-display text-lg leading-tight text-foreground mb-0.5">
                {comic.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                Issue #{comic.issueNumber} {comic.variant && `• ${comic.variant}`}
              </p>
            </div>

            {/* Publisher & Era */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{comic.publisher}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className={`era-badge era-${comic.era} text-xs px-2 py-0.5 rounded`}>
                {ERA_LABELS[comic.era]}
              </span>
            </div>

            {/* Creators */}
            {(comic.writer || comic.artist) && (
              <div className="text-xs space-y-0.5">
                {comic.writer && (
                  <p className="text-muted-foreground">
                    <span className="text-foreground/70">Writer:</span> {comic.writer}
                  </p>
                )}
                {comic.artist && (
                  <p className="text-muted-foreground">
                    <span className="text-foreground/70">Artist:</span> {comic.artist}
                  </p>
                )}
              </div>
            )}

            {/* Signer Pills */}
            {showSignerPills && (
              <div className="flex flex-wrap gap-1">
                {signerNames.map((name, index) => (
                  <span
                    key={`${name}-${index}`}
                    className="inline-flex items-center gap-1 bg-primary/20 text-primary border border-primary/40 text-xs px-2 py-1 rounded-full"
                  >
                    <Pen className="h-3 w-3" />
                    {name}
                  </span>
                ))}
              </div>
            )}

            {/* Key Issue Reason */}
            {comic.isKeyIssue && comic.keyIssueReason && (
              <div className="mt-auto pt-2 border-t border-border/30">
                <p className="text-xs text-primary/90 flex items-start gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-primary flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{comic.keyIssueReason}</span>
                </p>
              </div>
            )}

            {/* Tap hint for mobile */}
            <p className="text-[10px] text-muted-foreground/60 text-center mt-auto lg:hidden">
              Tap again to view details
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
