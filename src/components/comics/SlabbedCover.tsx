import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { getSlabPresentation, getGradingCompany } from '@/lib/slabPresentation';
import type { GradeStatus, LabelType, SignatureType } from '@/types/comic';

interface SlabbedCoverProps {
  coverUrl?: string;
  title: string;
  issueNumber: string;
  gradeStatus: GradeStatus;
  grade?: string;
  isKeyIssue?: boolean;
  isSigned?: boolean;
  labelType?: LabelType;
  signatureType?: SignatureType;
  className?: string;
}

export function SlabbedCover({
  coverUrl,
  title,
  issueNumber,
  gradeStatus,
  grade,
  isKeyIssue,
  isSigned,
  labelType,
  signatureType,
  className,
}: SlabbedCoverProps) {
  const slab = getSlabPresentation({ gradeStatus, grade, labelType, signatureType, isSigned });
  const isGraded = gradeStatus !== 'raw';
  const company = getGradingCompany(gradeStatus);

  // Cover image component
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

  // Key issue indicator - simplified gold star
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

  // Graded comic - color-coded slab frame using canonical helper
  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'relative rounded border-2 p-0.5',
        slab.borderClass
      )}>
        {/* Consolidated label: Company + Grade */}
        <div className={cn(
          'absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide z-10',
          slab.bgClass,
          slab.textClass,
        )}>
          {company} {slab.gradeText}
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
