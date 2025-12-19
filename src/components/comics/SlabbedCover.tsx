import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import type { GradeStatus } from '@/types/comic';

interface SlabbedCoverProps {
  coverUrl?: string;
  title: string;
  issueNumber: string;
  gradeStatus: GradeStatus;
  grade?: string;
  isKeyIssue?: boolean;
  className?: string;
}

const SLAB_COLORS: Record<GradeStatus, { border: string; bg: string; label: string }> = {
  raw: { border: 'border-border', bg: '', label: '' },
  cgc: { border: 'border-blue-500/40', bg: 'bg-blue-500', label: 'CGC' },
  cbcs: { border: 'border-red-500/40', bg: 'bg-red-500', label: 'CBCS' },
  pgx: { border: 'border-amber-500/40', bg: 'bg-amber-500', label: 'PGX' },
};

export function SlabbedCover({
  coverUrl,
  title,
  issueNumber,
  gradeStatus,
  grade,
  isKeyIssue,
  className,
}: SlabbedCoverProps) {
  const isGraded = gradeStatus !== 'raw';
  const colors = SLAB_COLORS[gradeStatus];

  // Cover image component - use object-contain to prevent cropping
  const CoverImage = () => (
    coverUrl ? (
      <img
        src={coverUrl}
        alt={`${title} #${issueNumber}`}
        className="w-full h-full object-contain bg-muted/30"
        loading="lazy"
      />
    ) : (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <span className="text-muted-foreground/50 text-xs">No Cover</span>
      </div>
    )
  );

  // Key issue indicator - simplified gold star only
  const KeyIndicator = () => isKeyIssue ? (
    <div className="absolute bottom-1.5 right-1.5 z-10">
      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
    </div>
  ) : null;

  if (!isGraded) {
    // Raw comic - simple cover with rounded corners
    return (
      <div className={cn('relative aspect-[2/3] rounded overflow-hidden', className)}>
        <CoverImage />
        <KeyIndicator />
      </div>
    );
  }

  // Graded comic - simplified slab frame (2px border instead of 4px)
  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'relative rounded border p-0.5',
        colors.border
      )}>
        {/* Consolidated label: Company + Grade - smaller and cleaner */}
        <div className={cn(
          'absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide z-10',
          colors.bg,
          gradeStatus === 'pgx' ? 'text-black' : 'text-white',
        )}>
          {colors.label} {grade}
        </div>

        {/* Cover */}
        <div className="relative rounded-sm overflow-hidden bg-background">
          <div className="aspect-[2/3]">
            <CoverImage />
          </div>
          <KeyIndicator />
        </div>
      </div>
    </div>
  );
}
