import { Comic, GradeStatus, LABEL_TYPE_CONFIG, PAGE_QUALITY_LABELS } from '@/types/comic';
import { Badge } from '@/components/ui/badge';
import { Award, FileText, Calendar, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GradingDetailsProps {
  comic: Comic;
}

// Build verification URL based on grading company
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

const GRADE_STATUS_COLORS: Record<GradeStatus, { text: string; bg: string; border: string }> = {
  raw: { text: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted' },
  cgc: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  cbcs: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  pgx: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
};

export function GradingDetails({ comic }: GradingDetailsProps) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  
  if (comic.gradeStatus === 'raw') return null;
  
  const colors = GRADE_STATUS_COLORS[comic.gradeStatus];
  const verificationUrl = comic.certNumber 
    ? getCertVerificationUrl(comic.gradeStatus, comic.certNumber) 
    : null;
  const labelConfig = comic.labelType ? LABEL_TYPE_CONFIG[comic.labelType] : null;
  const pageQualityLabel = comic.pageQuality ? PAGE_QUALITY_LABELS[comic.pageQuality] : null;

  return (
    <div className={cn(
      "p-4 rounded-lg border mb-6",
      colors.bg,
      colors.border
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Award className={cn("h-5 w-5", colors.text)} />
        <h3 className={cn("font-semibold", colors.text)}>
          {comic.gradeStatus.toUpperCase()} Grading Details
        </h3>
      </div>
      
      <div className="space-y-3">
        {/* Grade & Cert Number */}
        <div className="flex flex-wrap items-center gap-2">
          {comic.grade && (
            <Badge variant="secondary" className="text-lg font-display">
              {comic.grade}
            </Badge>
          )}
          
          {labelConfig && (
            <Badge className={cn(labelConfig.bgColor, labelConfig.color, "border-0")}>
              {labelConfig.label}
            </Badge>
          )}
        </div>
        
        {/* Cert Number with verification link */}
        {comic.certNumber && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Cert #:</span>
            {verificationUrl ? (
              <a 
                href={verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "font-mono hover:underline flex items-center gap-1",
                  colors.text
                )}
              >
                {comic.certNumber}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="font-mono">{comic.certNumber}</span>
            )}
          </div>
        )}
        
        {/* Page Quality */}
        {pageQualityLabel && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Page Quality:</span>
            <span className="font-medium">{pageQualityLabel}</span>
          </div>
        )}
        
        {/* Graded Date */}
        {comic.gradedDate && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Graded:</span>
            <span>{new Date(comic.gradedDate).toLocaleDateString()}</span>
          </div>
        )}
        
        {/* Grader Notes */}
        {comic.graderNotes && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setNotesExpanded(!notesExpanded)}
            >
              <FileText className="h-4 w-4 mr-1" />
              Grader Notes
              {notesExpanded ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </Button>
            
            {notesExpanded && (
              <p className="mt-2 text-sm text-foreground/80 p-2 bg-background/50 rounded">
                {comic.graderNotes}
              </p>
            )}
          </div>
        )}
        
        {/* Inner Well Notes */}
        {comic.innerWellNotes && (
          <div className="text-sm">
            <span className="text-muted-foreground">Inner Well: </span>
            <span className="text-foreground/80">{comic.innerWellNotes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
