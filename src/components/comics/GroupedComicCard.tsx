import { useState } from 'react';
import { ComicGroup } from '@/hooks/useGroupedComics';
import { ERA_LABELS } from '@/types/comic';
import { SlabbedCover } from './SlabbedCover';
import { PenTool, Layers, Award, FileText, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface GroupedComicCardProps {
  group: ComicGroup;
  onClick: () => void;
}

/**
 * Cover-first grouped comic card design
 * Shows multiple copies with stacked visual effect
 */
export function GroupedComicCard({ group, onClick }: GroupedComicCardProps) {
  const [showMetadata, setShowMetadata] = useState(false);

  const formattedValue = group.totalValue
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(group.totalValue)
    : null;

  const copyCount = group.copies.length;
  const mainComic = group.highestValueCopy;

  const handleCardClick = (e: React.MouseEvent) => {
    // On mobile/tablet, first tap toggles metadata
    if (window.innerWidth < 1024 && !showMetadata) {
      e.stopPropagation();
      setShowMetadata(true);
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
      {/* Stacked effect for multiple copies */}
      {copyCount > 1 && (
        <>
          <div className="absolute inset-0 bg-card rounded-lg border border-border transform translate-x-1 translate-y-1 -z-10" />
          <div className="absolute inset-0 bg-card rounded-lg border border-border transform translate-x-2 translate-y-2 -z-20 opacity-60" />
        </>
      )}

      {/* Cover fills entire card */}
      <div className="relative w-full h-full min-h-[280px] bg-secondary/30">
        <SlabbedCover
          coverUrl={mainComic.coverImage}
          title={mainComic.title}
          issueNumber={mainComic.issueNumber}
          gradeStatus={mainComic.gradeStatus}
          grade={mainComic.grade}
          isKeyIssue={mainComic.isKeyIssue}
          isSigned={mainComic.isSigned}
          labelType={mainComic.labelType}
          signatureType={mainComic.signatureType}
        />

        {/* Copy count badge - top left */}
        {copyCount > 1 && (
          <div className="absolute top-2 left-2 z-20 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
            <Layers className="h-3 w-3" />
            ×{copyCount}
          </div>
        )}

        {/* Value badge - top right (for high-value collections) */}
        {formattedValue && group.totalValue >= 50 && (
          <div className="absolute top-2 right-2 z-10 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded shadow-md">
            {formattedValue}
          </div>
        )}

        {/* Key issue indicator - bottom left */}
        {mainComic.isKeyIssue && (
          <div className="absolute bottom-2 left-2 z-10 bg-primary/90 text-primary-foreground rounded-full p-1.5">
            <Star className="h-3 w-3 fill-current" />
          </div>
        )}

        {/* Glass panel overlay - always visible (minimal) */}
        <div className="absolute bottom-0 left-0 right-0 z-20 glass-panel backdrop-blur-md bg-background/80 border-t border-border/50 p-2">
          <div className="flex items-center justify-between gap-2">
            {/* Total value */}
            {formattedValue && (
              <span className="text-xs font-semibold gold-text">
                {copyCount > 1 ? `${formattedValue} total` : formattedValue}
              </span>
            )}

            {/* Highest grade */}
            {mainComic.gradeStatus === 'graded' && mainComic.grade && (
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Best: {mainComic.grade}
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
                {mainComic.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                Issue #{mainComic.issueNumber} {mainComic.variant && `• ${mainComic.variant}`}
              </p>
            </div>

            {/* Publisher & Era */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">{group.publisher}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className={`era-badge era-${mainComic.era} text-xs px-2 py-0.5 rounded`}>
                {ERA_LABELS[mainComic.era]}
              </span>
            </div>

            {/* Copy details */}
            {copyCount > 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{copyCount} copies</span> in collection
                </p>
                <div className="flex flex-wrap gap-1">
                  {group.hasGraded && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                      <Award className="h-3 w-3 mr-1" />
                      Graded
                    </Badge>
                  )}
                  {group.hasRaw && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                      <FileText className="h-3 w-3 mr-1" />
                      Raw
                    </Badge>
                  )}
                  {group.hasSigned && (
                    <Badge variant="default" className="text-[10px] px-2 py-0.5">
                      <PenTool className="h-3 w-3 mr-1" />
                      Signed
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Creators */}
            {(mainComic.writer || mainComic.artist) && (
              <div className="text-xs space-y-0.5">
                {mainComic.writer && (
                  <p className="text-muted-foreground">
                    <span className="text-foreground/70">Writer:</span> {mainComic.writer}
                  </p>
                )}
                {mainComic.artist && (
                  <p className="text-muted-foreground">
                    <span className="text-foreground/70">Artist:</span> {mainComic.artist}
                  </p>
                )}
              </div>
            )}

            {/* Key Issue Reason */}
            {mainComic.isKeyIssue && mainComic.keyIssueReason && (
              <div className="mt-auto pt-2 border-t border-border/30">
                <p className="text-xs text-primary/90 flex items-start gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-primary flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{mainComic.keyIssueReason}</span>
                </p>
              </div>
            )}

            {/* Tap hint */}
            <p className="text-[10px] text-muted-foreground/60 text-center mt-auto lg:hidden">
              Tap again to view all copies
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
