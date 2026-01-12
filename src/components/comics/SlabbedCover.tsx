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
  enable3D?: boolean; // Enable 3D effect (default true)
}

/**
 * Realistic 3D graded slab rendering
 * - CSS 3D transforms for depth
 * - Company-specific styling (CGC blue, CBCS red, Signature Series yellow)
 * - Glossy plastic effect with gradient overlay
 * - Hover rotation for enhanced 3D feel
 * - Authentic label positioning
 */
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
  enable3D = true,
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
      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 drop-shadow" />
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

  // Graded comic - realistic 3D slab with depth
  return (
    <div
      className={cn(
        'relative slab-container group',
        enable3D && 'perspective-1000',
        className
      )}
    >
      <div
        className={cn(
          'relative slab-inner transition-transform duration-500',
          enable3D && 'transform-style-3d hover:rotate-y-2 hover:-rotate-x-1',
          'rounded-lg p-1',
          // Company-specific outer case colors
          slab.slabBorderVariant === 'blue' && 'bg-gradient-to-br from-blue-600 to-blue-700',
          slab.slabBorderVariant === 'red' && 'bg-gradient-to-br from-red-600 to-red-700',
          slab.slabBorderVariant === 'yellow' && 'bg-gradient-to-br from-yellow-500 to-amber-600',
          slab.slabBorderVariant === 'amber' && 'bg-gradient-to-br from-amber-600 to-orange-700',
        )}
        style={enable3D ? {
          boxShadow: `
            0 10px 30px -5px rgba(0, 0, 0, 0.4),
            0 20px 60px -10px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
        } : undefined}
      >
        {/* Top label - realistic grading company branding */}
        <div
          className={cn(
            'absolute -top-3 left-1/2 -translate-x-1/2 z-20',
            'px-3 py-1 rounded-sm',
            'text-[10px] font-bold tracking-wider uppercase',
            'shadow-lg',
            slab.bgClass,
            slab.textClass,
          )}
          style={{
            fontFamily: '"Arial Black", "Arial Bold", sans-serif',
          }}
        >
          <div className="flex items-center gap-1.5">
            <span>{company}</span>
            <span className="text-xs font-black">{slab.gradeText}</span>
          </div>
        </div>

        {/* Inner white case with gap (3D depth) */}
        <div
          className={cn(
            'relative bg-white rounded',
            'border border-gray-200',
            enable3D && 'm-0.5'
          )}
          style={enable3D ? {
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
          } : undefined}
        >
          {/* Cover inside case */}
          <div className="relative p-1.5">
            <div className="relative rounded-sm overflow-hidden bg-background aspect-[2/3]">
              <CoverImage />
              <KeyIndicator />

              {/* Glossy plastic overlay effect */}
              {enable3D && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `
                      linear-gradient(
                        135deg,
                        rgba(255, 255, 255, 0.2) 0%,
                        rgba(255, 255, 255, 0.05) 20%,
                        rgba(255, 255, 255, 0) 40%,
                        rgba(255, 255, 255, 0) 60%,
                        rgba(0, 0, 0, 0.05) 100%
                      )
                    `,
                  }}
                />
              )}
            </div>
          </div>

          {/* Bottom label area (company logo would go here) */}
          <div className="px-2 pb-1.5">
            <div
              className={cn(
                'h-5 rounded-sm flex items-center justify-center',
                'text-[8px] font-semibold text-muted-foreground/50 uppercase tracking-widest',
                'bg-gradient-to-b from-gray-50 to-gray-100'
              )}
            >
              {slab.labelTitle}
            </div>
          </div>
        </div>

        {/* Signature Series indicator */}
        {slab.slabBorderVariant === 'yellow' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-black/70 text-yellow-400 text-[8px] font-bold px-2 py-0.5 rounded-full">
              WITNESSED SIGNATURE
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
