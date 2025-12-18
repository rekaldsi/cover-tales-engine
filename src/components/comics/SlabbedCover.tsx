import { cn } from '@/lib/utils';
import type { GradeStatus } from '@/types/comic';

interface SlabbedCoverProps {
  coverUrl?: string;
  title: string;
  issueNumber: string;
  gradeStatus: GradeStatus;
  grade?: string;
  certNumber?: string;
  className?: string;
}

const SLAB_COLORS: Record<GradeStatus, { border: string; bg: string; label: string }> = {
  raw: { border: 'border-muted', bg: 'bg-muted/20', label: '' },
  cgc: { border: 'border-blue-500', bg: 'bg-blue-500/10', label: 'CGC' },
  cbcs: { border: 'border-red-500', bg: 'bg-red-500/10', label: 'CBCS' },
  pgx: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', label: 'PGX' },
};

export function SlabbedCover({
  coverUrl,
  title,
  issueNumber,
  gradeStatus,
  grade,
  certNumber,
  className,
}: SlabbedCoverProps) {
  const isGraded = gradeStatus !== 'raw';
  const colors = SLAB_COLORS[gradeStatus];

  if (!isGraded) {
    // Raw comic - show cover without slab frame
    return (
      <div className={cn('relative aspect-[2/3] rounded-lg overflow-hidden', className)}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={`${title} #${issueNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No Cover</span>
          </div>
        )}
      </div>
    );
  }

  // Graded comic - show with slab frame
  return (
    <div className={cn('relative', className)}>
      {/* Slab outer frame */}
      <div className={cn(
        'relative rounded-lg border-4 p-1.5',
        colors.border,
        colors.bg
      )}>
        {/* Grade label header */}
        <div className={cn(
          'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded text-xs font-bold tracking-wider',
          gradeStatus === 'cgc' && 'bg-blue-500 text-white',
          gradeStatus === 'cbcs' && 'bg-red-500 text-white',
          gradeStatus === 'pgx' && 'bg-yellow-500 text-black',
        )}>
          {colors.label}
        </div>

        {/* Inner holder */}
        <div className="relative rounded overflow-hidden bg-background">
          {/* Cover image */}
          <div className="aspect-[2/3]">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={`${title} #${issueNumber}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground text-sm">No Cover</span>
              </div>
            )}
          </div>

          {/* Grade badge */}
          {grade && (
            <div className={cn(
              'absolute bottom-2 right-2 px-2 py-1 rounded text-sm font-bold',
              gradeStatus === 'cgc' && 'bg-blue-500 text-white',
              gradeStatus === 'cbcs' && 'bg-red-500 text-white',
              gradeStatus === 'pgx' && 'bg-yellow-500 text-black',
            )}>
              {grade}
            </div>
          )}
        </div>

        {/* Cert number footer */}
        {certNumber && (
          <div className="mt-1 text-center">
            <span className="text-[10px] text-muted-foreground font-mono">
              #{certNumber}
            </span>
          </div>
        )}
      </div>

      {/* Graded indicator badge */}
      <div className={cn(
        'absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold',
        gradeStatus === 'cgc' && 'bg-blue-500 text-white',
        gradeStatus === 'cbcs' && 'bg-red-500 text-white',
        gradeStatus === 'pgx' && 'bg-yellow-500 text-black',
      )}>
        ✓
      </div>
    </div>
  );
}
