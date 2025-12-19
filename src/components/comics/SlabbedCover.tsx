import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
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

// Determine if this is a signature series slab (yellow label)
function isSignatureSeries(
  gradeStatus: GradeStatus,
  isSigned?: boolean,
  labelType?: LabelType,
  signatureType?: SignatureType
): boolean {
  if (gradeStatus === 'raw') return false;
  
  // CGC Signature Series
  if (labelType === 'signature_series') return true;
  if (signatureType === 'cgc_ss') return true;
  
  // CBCS Verified Signature
  if (labelType === 'cbcs_verified_sig') return true;
  if (signatureType === 'cbcs_verified') return true;
  
  return false;
}

// Get slab colors based on grading company and signature status
function getSlabColors(
  gradeStatus: GradeStatus,
  isSigned?: boolean,
  labelType?: LabelType,
  signatureType?: SignatureType
): { border: string; bg: string; label: string } {
  if (gradeStatus === 'raw') {
    return { border: 'border-border', bg: '', label: '' };
  }
  
  const isSSLabel = isSignatureSeries(gradeStatus, isSigned, labelType, signatureType);
  
  if (gradeStatus === 'cgc') {
    if (isSSLabel) {
      // CGC Signature Series - Yellow/Gold
      return { border: 'border-yellow-500/60', bg: 'bg-yellow-500', label: 'CGC' };
    }
    // CGC Universal - Blue
    return { border: 'border-blue-500/40', bg: 'bg-blue-500', label: 'CGC' };
  }
  
  if (gradeStatus === 'cbcs') {
    if (isSSLabel) {
      // CBCS Verified Signature - Yellow/Gold
      return { border: 'border-yellow-500/60', bg: 'bg-yellow-500', label: 'CBCS' };
    }
    // CBCS Standard - Red
    return { border: 'border-red-500/40', bg: 'bg-red-500', label: 'CBCS' };
  }
  
  if (gradeStatus === 'pgx') {
    // PGX - Amber
    return { border: 'border-amber-500/40', bg: 'bg-amber-500', label: 'PGX' };
  }
  
  return { border: 'border-border', bg: 'bg-muted', label: '' };
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
  const isGraded = gradeStatus !== 'raw';
  const colors = getSlabColors(gradeStatus, isSigned, labelType, signatureType);
  const isSSLabel = isSignatureSeries(gradeStatus, isSigned, labelType, signatureType);

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

  // Graded comic - color-coded slab frame
  return (
    <div className={cn('relative', className)}>
      <div className={cn(
        'relative rounded border-2 p-0.5',
        colors.border
      )}>
        {/* Consolidated label: Company + Grade - color indicates signature status */}
        <div className={cn(
          'absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide z-10',
          colors.bg,
          isSSLabel ? 'text-black' : 'text-white',
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
