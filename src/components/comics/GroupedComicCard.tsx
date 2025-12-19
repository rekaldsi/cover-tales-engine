import { ComicGroup } from '@/hooks/useGroupedComics';
import { ERA_LABELS } from '@/types/comic';
import { SlabbedCover } from './SlabbedCover';
import { PenTool, Layers, Award, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GroupedComicCardProps {
  group: ComicGroup;
  onClick: () => void;
}

export function GroupedComicCard({ group, onClick }: GroupedComicCardProps) {
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
  
  return (
    <article 
      onClick={onClick}
      className="comic-card cursor-pointer min-h-[44px] active:opacity-90 transition-opacity w-full max-w-full overflow-hidden relative"
    >
      {/* Stacked effect for multiple copies */}
      {copyCount > 1 && (
        <>
          <div className="absolute inset-0 bg-card rounded-lg border border-border transform translate-x-1 translate-y-1 -z-10" />
          <div className="absolute inset-0 bg-card rounded-lg border border-border transform translate-x-2 translate-y-2 -z-20 opacity-60" />
        </>
      )}
      
      {/* Copy count badge */}
      {copyCount > 1 && (
        <div className="absolute top-2 left-2 z-20 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
          <Layers className="h-3 w-3" />
          ×{copyCount}
        </div>
      )}
      
      {/* Cover Image */}
      <div className="relative overflow-hidden bg-secondary/30 p-1.5">
        <SlabbedCover
          coverUrl={mainComic.coverImage}
          title={mainComic.title}
          issueNumber={mainComic.issueNumber}
          gradeStatus={mainComic.gradeStatus}
          grade={mainComic.grade}
          isKeyIssue={mainComic.isKeyIssue}
        />
        
        {/* Signed Badge */}
        {group.hasSigned && (
          <div className="absolute top-3 right-3 bg-comic-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md">
            <PenTool className="h-2.5 w-2.5" />
            SIGNED
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-2.5 space-y-1.5">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground truncate text-sm leading-tight">
            {mainComic.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            #{mainComic.issueNumber} {mainComic.variant && `• ${mainComic.variant}`}
          </p>
        </div>
        
        {/* Status badges for multiple copies */}
        {copyCount > 1 && (
          <div className="flex flex-wrap gap-1">
            {group.hasGraded && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                <Award className="h-2.5 w-2.5 mr-0.5" />
                Graded
              </Badge>
            )}
            {group.hasRaw && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                <FileText className="h-2.5 w-2.5 mr-0.5" />
                Raw
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">
            {ERA_LABELS[mainComic.era]}
          </span>
          {formattedValue && (
            <span className="text-xs font-semibold text-accent">
              {copyCount > 1 ? `${formattedValue} total` : formattedValue}
            </span>
          )}
        </div>
        
        {mainComic.isKeyIssue && mainComic.keyIssueReason && (
          <p className="text-[10px] text-muted-foreground/60 line-clamp-1 pt-1 border-t border-border/20">
            {mainComic.keyIssueReason}
          </p>
        )}
      </div>
    </article>
  );
}
