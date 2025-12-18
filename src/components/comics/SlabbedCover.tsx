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

const SLAB_COLORS: Record<GradeStatus, { border: string; label: string }> = {
  raw: { border: 'border-border', label: '' },
  cgc: { border: 'border-blue-500/60', label: 'CGC' },
  cbcs: { border: 'border-red-500/60', label: 'CBCS' },
  pgx: { border: 'border-amber-500/60', label: 'PGX' },
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

  // Cover image component
  const CoverImage = () => (
    coverUrl ? (
      <img
        src={coverUrl}
        alt={`${title} #${issueNumber}`}
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <span className="text-muted-foreground/50 text-xs">No Cover</span>
      </div>
    )
  );

  // Key issue indicator
  const KeyIndicator = () => isKeyIssue ? (
    <div className="absolute bottom-2 right-2 z-10">
      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
    </div>
  ) : null;

  if (!isGraded) {
    // Raw comic - simple cover
    return (
      <div className={cn('relative aspect-[2/3] rounded overflow-hidden', className)}>
        <CoverImage />
        <KeyIndicator />
      </div>
    );
  }

  // Graded comic - with slab frame
  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'relative rounded border-2 p-1',
        colors.border
      )}>
        {/* Consolidated label: Company + Grade */}
        <div className={cn(
          'absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide z-10',
          gradeStatus === 'cgc' && 'bg-blue-500 text-white',
          gradeStatus === 'cbcs' && 'bg-red-500 text-white',
          gradeStatus === 'pgx' && 'bg-amber-500 text-black',
        )}>
          {colors.label} {grade}
        </div>

        {/* Cover */}
        <div className="relative rounded overflow-hidden bg-background">
          <div className="aspect-[2/3]">
            <CoverImage />
          </div>
          <KeyIndicator />
        </div>
      </div>
    </div>
  );
}
