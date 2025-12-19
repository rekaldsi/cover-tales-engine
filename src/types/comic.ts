export type ComicEra = 'golden' | 'silver' | 'bronze' | 'copper' | 'modern' | 'current';
export type GradeStatus = 'raw' | 'cgc' | 'cbcs' | 'pgx';
export type ConditionGrade = '0.5' | '1.0' | '1.5' | '2.0' | '2.5' | '3.0' | '3.5' | '4.0' | '4.5' | '5.0' | '5.5' | '6.0' | '6.5' | '7.0' | '7.5' | '8.0' | '8.5' | '9.0' | '9.2' | '9.4' | '9.6' | '9.8' | '10.0';

export type SignatureType = 'witnessed' | 'cgc_ss' | 'cbcs_verified' | 'unverified';

export type LabelType = 
  | 'universal' 
  | 'signature_series' 
  | 'qualified' 
  | 'restored' 
  | 'conserved'
  | 'cbcs_verified_sig'
  | 'cbcs_red_label'
  | 'pgx_standard';

export type PageQuality = 
  | 'white'
  | 'off_white_to_white'
  | 'off_white'
  | 'cream_to_off_white'
  | 'cream'
  | 'tan_to_cream'
  | 'tan'
  | 'tanned';

export const PAGE_QUALITY_LABELS: Record<PageQuality, string> = {
  white: 'White',
  off_white_to_white: 'Off-White to White',
  off_white: 'Off-White',
  cream_to_off_white: 'Cream to Off-White',
  cream: 'Cream',
  tan_to_cream: 'Tan to Cream',
  tan: 'Tan',
  tanned: 'Tanned',
};

export const LABEL_TYPE_CONFIG: Record<LabelType, { label: string; color: string; bgColor: string }> = {
  universal: { label: 'Universal', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  signature_series: { label: 'Signature Series', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  qualified: { label: 'Qualified', color: 'text-green-600', bgColor: 'bg-green-100' },
  restored: { label: 'Restored', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  conserved: { label: 'Conserved', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  cbcs_verified_sig: { label: 'Verified Signature', color: 'text-red-600', bgColor: 'bg-red-100' },
  cbcs_red_label: { label: 'Red Label', color: 'text-red-600', bgColor: 'bg-red-100' },
  pgx_standard: { label: 'Standard', color: 'text-amber-600', bgColor: 'bg-amber-100' },
};

export interface Comic {
  id: string;
  title: string;
  issueNumber: string;
  volume?: number;
  coverDate?: string;
  publisher: string;
  variant?: string;
  coverImage?: string;
  era: ComicEra;
  
  // Copy tracking for duplicates
  copyNumber?: number;
  
  // Creators
  writer?: string;
  artist?: string;
  coverArtist?: string;
  
  // Grading
  gradeStatus: GradeStatus;
  grade?: ConditionGrade;
  certNumber?: string;
  
  // Signature tracking
  isSigned?: boolean;
  signedBy?: string;
  signedDate?: string;
  signatureType?: SignatureType;
  
  // Collection info
  purchasePrice?: number;
  currentValue?: number;
  dateAdded: string;
  location?: string;
  notes?: string;
  
  // Key issue flags
  isKeyIssue?: boolean;
  keyIssueReason?: string;
  
  // Enhanced data
  firstAppearanceOf?: string;
  characters?: string[];
  mediaTieIn?: string;
  
  // Grading details
  labelType?: LabelType;
  pageQuality?: PageQuality;
  graderNotes?: string;
  gradedDate?: string;
  innerWellNotes?: string;
  
  // AI condition analysis (for raw comics)
  estimatedRawGrade?: string;
  conditionNotes?: string;
  visibleDefects?: string[];
  conditionConfidence?: 'high' | 'medium' | 'low';
}

export interface CollectionStats {
  totalComics: number;
  totalValue: number;
  byEra: Record<ComicEra, number>;
  byPublisher: Record<string, number>;
  recentlyAdded: Comic[];
}

export const ERA_LABELS: Record<ComicEra, string> = {
  golden: 'Golden Age',
  silver: 'Silver Age',
  bronze: 'Bronze Age',
  copper: 'Copper Age',
  modern: 'Modern Age',
  current: 'Current Era',
};

export const ERA_DATE_RANGES: Record<ComicEra, { start: number; end: number }> = {
  golden: { start: 1938, end: 1955 },
  silver: { start: 1956, end: 1969 },
  bronze: { start: 1970, end: 1984 },
  copper: { start: 1985, end: 1991 },
  modern: { start: 1992, end: 2010 },
  current: { start: 2011, end: 2099 },
};

export function getEraFromDate(dateString?: string): ComicEra {
  if (!dateString) return 'current';
  
  const year = new Date(dateString).getFullYear();
  
  for (const [era, range] of Object.entries(ERA_DATE_RANGES)) {
    if (year >= range.start && year <= range.end) {
      return era as ComicEra;
    }
  }
  
  return 'current';
}

export const PUBLISHERS = [
  'Marvel Comics',
  'DC Comics',
  'Image Comics',
  'Dark Horse Comics',
  'IDW Publishing',
  'Boom! Studios',
  'Valiant Comics',
  'Dynamite Entertainment',
  'Archie Comics',
  'Other',
] as const;

export const GRADE_OPTIONS: ConditionGrade[] = [
  '10.0', '9.8', '9.6', '9.4', '9.2', '9.0',
  '8.5', '8.0', '7.5', '7.0', '6.5', '6.0',
  '5.5', '5.0', '4.5', '4.0', '3.5', '3.0',
  '2.5', '2.0', '1.5', '1.0', '0.5'
];
