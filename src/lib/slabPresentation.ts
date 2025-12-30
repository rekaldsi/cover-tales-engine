import type { GradeStatus, LabelType, SignatureType } from '@/types/comic';

export type SlabBorderVariant = 'yellow' | 'blue' | 'red' | 'amber' | 'none';

export interface SlabPresentation {
  slabBorderVariant: SlabBorderVariant;
  labelTitle: string;        // "CGC Signature Series", "CGC Universal", etc.
  labelSubtitle: string;     // "9.8 • Signature Series"
  showSignedBadge: boolean;  // Only true for raw signed books
  showGradedChip: boolean;
  gradeText: string;         // "9.8" or "RAW"
  borderClass: string;       // Tailwind border class
  bgClass: string;           // Tailwind background class
  textClass: string;         // Tailwind text class for label
}

interface SlabInput {
  gradeStatus: GradeStatus;
  grade?: string | number;
  labelType?: LabelType;
  signatureType?: SignatureType;
  isSigned?: boolean;
}

/**
 * Canonical helper for determining slab presentation.
 * This is the SINGLE SOURCE OF TRUTH for all slab display logic.
 * 
 * Priority rules (enforced in order):
 * 1. CGC + signature_series/cgc_ss -> Yellow, "CGC Signature Series"
 * 2. CBCS + cbcs_verified_sig/cbcs_verified -> Yellow, "CBCS Verified Signature"
 * 3. CGC standard -> Blue, "CGC Universal"
 * 4. CBCS standard -> Red, "CBCS Graded"
 * 5. PGX -> Amber, "PGX Graded"
 * 6. Raw -> None, "Raw / Ungraded"
 */
export function getSlabPresentation(input: SlabInput): SlabPresentation {
  const { gradeStatus, grade, labelType, signatureType, isSigned } = input;
  const gradeText = grade ? String(grade) : 'RAW';
  
  // CGC Signature Series
  if (gradeStatus === 'cgc' && (labelType === 'signature_series' || signatureType === 'cgc_ss')) {
    return {
      slabBorderVariant: 'yellow',
      labelTitle: 'CGC Signature Series',
      labelSubtitle: `${gradeText} • Signature Series`,
      showSignedBadge: false, // Yellow slab indicates signed
      showGradedChip: true,
      gradeText,
      borderClass: 'border-yellow-500/60',
      bgClass: 'bg-yellow-500',
      textClass: 'text-black',
    };
  }
  
  // CBCS Verified Signature
  if (gradeStatus === 'cbcs' && (labelType === 'cbcs_verified_sig' || signatureType === 'cbcs_verified')) {
    return {
      slabBorderVariant: 'yellow',
      labelTitle: 'CBCS Verified Signature',
      labelSubtitle: `${gradeText} • Verified Signature`,
      showSignedBadge: false, // Yellow slab indicates signed
      showGradedChip: true,
      gradeText,
      borderClass: 'border-yellow-500/60',
      bgClass: 'bg-yellow-500',
      textClass: 'text-black',
    };
  }
  
  // CGC Universal (standard)
  if (gradeStatus === 'cgc') {
    return {
      slabBorderVariant: 'blue',
      labelTitle: 'CGC Universal',
      labelSubtitle: `${gradeText} • Universal`,
      showSignedBadge: false,
      showGradedChip: true,
      gradeText,
      borderClass: 'border-blue-500/40',
      bgClass: 'bg-blue-500',
      textClass: 'text-white',
    };
  }
  
  // CBCS Graded (standard)
  if (gradeStatus === 'cbcs') {
    return {
      slabBorderVariant: 'red',
      labelTitle: 'CBCS Graded',
      labelSubtitle: `${gradeText} • Graded`,
      showSignedBadge: false,
      showGradedChip: true,
      gradeText,
      borderClass: 'border-red-500/40',
      bgClass: 'bg-red-500',
      textClass: 'text-white',
    };
  }
  
  // PGX Graded
  if (gradeStatus === 'pgx') {
    return {
      slabBorderVariant: 'amber',
      labelTitle: 'PGX Graded',
      labelSubtitle: `${gradeText} • Graded`,
      showSignedBadge: false,
      showGradedChip: true,
      gradeText,
      borderClass: 'border-amber-500/40',
      bgClass: 'bg-amber-500',
      textClass: 'text-white',
    };
  }
  
  // Raw / Ungraded
  return {
    slabBorderVariant: 'none',
    labelTitle: 'Raw / Ungraded',
    labelSubtitle: 'Ungraded',
    showSignedBadge: Boolean(isSigned), // Only raw books show signed badge
    showGradedChip: false,
    gradeText: 'RAW',
    borderClass: 'border-border',
    bgClass: 'bg-muted',
    textClass: 'text-foreground',
  };
}

/**
 * Get the grading company abbreviation for display
 */
export function getGradingCompany(gradeStatus: GradeStatus): string {
  switch (gradeStatus) {
    case 'cgc': return 'CGC';
    case 'cbcs': return 'CBCS';
    case 'pgx': return 'PGX';
    default: return '';
  }
}

/**
 * Get certification verification URL
 */
export function getCertVerificationUrl(gradeStatus: GradeStatus, certNumber: string): string | null {
  switch (gradeStatus) {
    case 'cgc':
      return `https://www.cgccomics.com/certlookup/${certNumber}/`;
    case 'cbcs':
      return `https://www.cbcscomics.com/cbcs-cert-verification/?cert_num=${certNumber}`;
    case 'pgx':
      return `https://www.pgxcomics.com/certifications/verify?serial=${certNumber}`;
    default:
      return null;
  }
}
