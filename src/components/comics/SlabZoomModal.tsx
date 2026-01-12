import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SlabbedCover } from './SlabbedCover';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';
import { getCertVerificationUrl } from '@/lib/slabPresentation';
import type { Comic } from '@/types/comic';

interface SlabZoomModalProps {
  comic: Comic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full-screen slab zoom modal with certification details
 * - Shows large slab view
 * - Certification number and verification link
 * - Grading details
 * - Company information
 */
export function SlabZoomModal({ comic, open, onOpenChange }: SlabZoomModalProps) {
  if (!comic || comic.gradeStatus === 'raw') {
    return null;
  }

  const certUrl = comic.certNumber
    ? getCertVerificationUrl(comic.gradeStatus, comic.certNumber)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 bg-background/80 hover:bg-background"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col lg:flex-row h-full">
          {/* Left: Large slab view */}
          <div className="flex-1 flex items-center justify-center p-8 bg-muted/30">
            <div className="w-full max-w-md">
              <SlabbedCover
                coverUrl={comic.coverImage}
                title={comic.title}
                issueNumber={comic.issueNumber}
                gradeStatus={comic.gradeStatus}
                grade={comic.grade}
                isKeyIssue={comic.isKeyIssue}
                isSigned={comic.isSigned}
                labelType={comic.labelType}
                signatureType={comic.signatureType}
                enable3D={true}
              />
            </div>
          </div>

          {/* Right: Certification details */}
          <div className="lg:w-96 bg-card border-l border-border p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Comic info */}
              <div>
                <h2 className="font-display text-2xl mb-1">{comic.title}</h2>
                <p className="text-muted-foreground">
                  Issue #{comic.issueNumber} {comic.variant && `• ${comic.variant}`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {comic.publisher}
                </p>
              </div>

              {/* Grade details */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Grading Details
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Company</span>
                    <span className="font-semibold">
                      {comic.gradeStatus.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Grade</span>
                    <span className="font-display text-2xl text-primary">
                      {comic.grade}
                    </span>
                  </div>

                  {comic.labelType && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Label Type</span>
                      <span className="text-sm font-medium capitalize">
                        {comic.labelType.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}

                  {comic.certNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Cert Number</span>
                      <span className="text-sm font-mono">{comic.certNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Certification verification */}
              {certUrl && (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                    Verification
                  </h3>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(certUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Verify on {comic.gradeStatus.toUpperCase()} Website
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click to verify this certification on the official {comic.gradeStatus.toUpperCase()} website
                  </p>
                </div>
              )}

              {/* Signature details */}
              {comic.isSigned && (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                    Signature Details
                  </h3>
                  <div className="space-y-2">
                    {comic.signatureType && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Type</span>
                        <span className="text-sm font-medium capitalize">
                          {comic.signatureType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}
                    {comic.signer1 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Signer</span>
                        <span className="text-sm font-medium">{comic.signer1}</span>
                      </div>
                    )}
                    {comic.signer2 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Signer 2</span>
                        <span className="text-sm font-medium">{comic.signer2}</span>
                      </div>
                    )}
                    {comic.signer3 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Signer 3</span>
                        <span className="text-sm font-medium">{comic.signer3}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Key issue info */}
              {comic.isKeyIssue && comic.keyIssueReason && (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                    Key Issue
                  </h3>
                  <p className="text-sm text-foreground/90">{comic.keyIssueReason}</p>
                </div>
              )}

              {/* Value */}
              {comic.currentValue && (
                <div>
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                    Estimated Value
                  </h3>
                  <p className="text-3xl font-display gold-text">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(comic.currentValue)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
