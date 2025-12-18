import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Comic, ERA_LABELS, SignatureType } from '@/types/comic';
import { Star, Award, Calendar, User, MapPin, Trash2, Loader2, PenTool, CheckCircle2, ShieldCheck, Settings } from 'lucide-react';
import { useComicEnrichment } from '@/hooks/useComicEnrichment';
import { MarkAsSignedDialog } from './MarkAsSignedDialog';
import { ShouldIGradeThis } from '@/components/insights/ShouldIGradeThis';
import { GradingDetails } from './GradingDetails';
import { GradingDetailsForm } from './GradingDetailsForm';
import { useCertVerification } from '@/hooks/useCertVerification';

interface ComicDetailSheetProps {
  comic: Comic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Comic>) => Promise<void>;
}

export function ComicDetailSheet({ comic, open, onOpenChange, onDelete, onUpdate }: ComicDetailSheetProps) {
  const { enrichComic, needsEnrichment, isEnriching } = useComicEnrichment();
  const { verifyCert, isVerifying } = useCertVerification();
  const [enrichedComic, setEnrichedComic] = useState<Comic | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [gradingFormOpen, setGradingFormOpen] = useState(false);

  // Auto-enrich when sheet opens
  useEffect(() => {
    if (open && comic && needsEnrichment(comic)) {
      enrichComic(comic, onUpdate).then(setEnrichedComic);
    } else if (comic) {
      setEnrichedComic(comic);
    }
  }, [open, comic?.id]);

  // Use enriched data if available, otherwise use original
  const displayComic = enrichedComic || comic;
  
  if (!displayComic) return null;
  
  const formatCurrency = (value?: number) => {
    if (!value) return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };
  
  const formatDate = (date?: string) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });
  };
  
  const profit = displayComic.currentValue && displayComic.purchasePrice 
    ? displayComic.currentValue - displayComic.purchasePrice 
    : null;

  const handleMarkAsSigned = async (signedBy: string, signedDate: string, signatureType: SignatureType) => {
    await onUpdate(displayComic.id, {
      isSigned: true,
      signedBy,
      signedDate,
      signatureType,
    });
    setEnrichedComic(prev => prev ? {
      ...prev,
      isSigned: true,
      signedBy,
      signedDate,
      signatureType,
    } : null);
  };

  const handleRemoveSignature = async () => {
    await onUpdate(displayComic.id, {
      isSigned: false,
      signedBy: undefined,
      signedDate: undefined,
      signatureType: undefined,
    });
    setEnrichedComic(prev => prev ? {
      ...prev,
      isSigned: false,
      signedBy: undefined,
      signedDate: undefined,
      signatureType: undefined,
    } : null);
  };

  const getSignatureTypeLabel = (type?: SignatureType) => {
    switch (type) {
      case 'witnessed': return 'Witnessed';
      case 'cgc_ss': return 'CGC Signature Series';
      case 'cbcs_verified': return 'CBCS Verified';
      case 'unverified': return 'Unverified';
      default: return 'Signed';
    }
  };

  const handleVerifyCert = async () => {
    if (displayComic.certNumber && displayComic.gradeStatus !== 'raw') {
      await verifyCert(displayComic.certNumber, displayComic.gradeStatus);
    }
  };

  const handleGradingDetailsSave = async (updates: Partial<Comic>) => {
    await onUpdate(displayComic.id, updates);
    setEnrichedComic(prev => prev ? { ...prev, ...updates } : null);
  };
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border">
          <SheetHeader className="sr-only">
            <SheetTitle>{displayComic.title} #{displayComic.issueNumber}</SheetTitle>
          </SheetHeader>
          
          {/* Enrichment Loading Indicator */}
          {isEnriching && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-2 bg-secondary/50 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              Fetching details from ComicVine...
            </div>
          )}
          
          {/* Cover Image */}
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary -mx-2 mb-6">
            {displayComic.coverImage ? (
              <img 
                src={displayComic.coverImage} 
                alt={`${displayComic.title} #${displayComic.issueNumber}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
                <div className="text-center p-4">
                  <p className="font-display text-3xl text-muted-foreground">{displayComic.title}</p>
                  <p className="text-5xl font-display text-primary">#{displayComic.issueNumber}</p>
                </div>
              </div>
            )}
            
            {/* Badges */}
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              <div className="flex flex-col gap-2">
                {displayComic.isKeyIssue && (
                  <Badge className="bg-accent text-accent-foreground gap-1 shadow-lg">
                    <Star className="h-3 w-3 fill-current" />
                    KEY ISSUE
                  </Badge>
                )}
                {displayComic.isSigned && (
                  <Badge className="bg-comic-green text-white gap-1 shadow-lg">
                    <PenTool className="h-3 w-3" />
                    SIGNED
                  </Badge>
                )}
              </div>
              {displayComic.grade && (
                <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm shadow-lg ml-auto">
                  <Award className="h-3 w-3 mr-1" />
                  {displayComic.gradeStatus.toUpperCase()} {displayComic.grade}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Title */}
          <div className="space-y-1 mb-6">
            <h2 className="font-display text-4xl tracking-tight text-foreground">
              {displayComic.title}
            </h2>
            <p className="text-xl text-muted-foreground">
              #{displayComic.issueNumber} {displayComic.variant && `• ${displayComic.variant}`}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className={`era-badge era-${displayComic.era}`}>
                {ERA_LABELS[displayComic.era]}
              </span>
              <span className="text-sm text-muted-foreground">{displayComic.publisher}</span>
            </div>
          </div>
          
          {/* Key Issue Reason */}
          {displayComic.isKeyIssue && displayComic.keyIssueReason && (
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20 mb-6">
              <p className="text-sm font-medium text-accent">
                <Star className="h-4 w-4 inline mr-2" />
                {displayComic.keyIssueReason}
              </p>
            </div>
          )}

          {/* Signature Info */}
          {displayComic.isSigned && (
            <div className="p-4 rounded-lg bg-comic-green/10 border border-comic-green/20 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-comic-green flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {getSignatureTypeLabel(displayComic.signatureType)}
                  </p>
                  <p className="text-sm text-foreground mt-1">
                    Signed by: <span className="font-medium">{displayComic.signedBy}</span>
                  </p>
                  {displayComic.signedDate && (
                    <p className="text-xs text-muted-foreground">
                      {formatDate(displayComic.signedDate)}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={handleRemoveSignature}>
                  Remove
                </Button>
              </div>
            </div>
          )}
          
          {/* Value Section */}
          {(displayComic.currentValue || displayComic.purchasePrice) && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {displayComic.currentValue && (
                <div className="stat-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Value</p>
                  <p className="text-2xl font-display gold-text">{formatCurrency(displayComic.currentValue)}</p>
                </div>
              )}
              {displayComic.purchasePrice && (
                <div className="stat-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid</p>
                  <p className="text-2xl font-display text-foreground">{formatCurrency(displayComic.purchasePrice)}</p>
                </div>
              )}
              {profit !== null && (
                <div className="col-span-2 stat-card">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Profit/Loss</p>
                  <p className={`text-2xl font-display ${profit >= 0 ? 'text-comic-green' : 'text-destructive'}`}>
                    {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Grading Details */}
          {displayComic.gradeStatus !== 'raw' && (
            <div className="relative">
              <GradingDetails comic={displayComic} />
              <div className="absolute top-4 right-4 flex gap-2">
                {displayComic.certNumber && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleVerifyCert}
                    disabled={isVerifying}
                  >
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    {isVerifying ? 'Verifying...' : 'Verify'}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setGradingFormOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Should I Grade This? */}
          <div className="mb-6">
            <ShouldIGradeThis comic={displayComic} />
          </div>
          
          {/* Details */}
          <div className="space-y-4 mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
            
            <div className="space-y-3">
              {displayComic.coverDate && (
                <DetailRow icon={Calendar} label="Cover Date" value={formatDate(displayComic.coverDate)} />
              )}
              {displayComic.writer && (
                <DetailRow icon={User} label="Writer" value={displayComic.writer} />
              )}
              {displayComic.artist && (
                <DetailRow icon={User} label="Artist" value={displayComic.artist} />
              )}
              {displayComic.coverArtist && (
                <DetailRow icon={User} label="Cover Artist" value={displayComic.coverArtist} />
              )}
              {displayComic.location && (
                <DetailRow icon={MapPin} label="Location" value={displayComic.location} />
              )}
            </div>
          </div>
          
          {/* Notes */}
          {displayComic.notes && (
            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
              <p className="text-sm text-foreground/80">{displayComic.notes}</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            {!displayComic.isSigned && (
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={() => setSignDialogOpen(true)}
              >
                <PenTool className="h-4 w-4" />
                Mark Signed
              </Button>
            )}
            <Button variant="outline" className="flex-1">
              Edit
            </Button>
            <Button 
              variant="destructive" 
              size="icon"
              onClick={() => {
                onDelete(displayComic.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            Added {formatDate(displayComic.dateAdded)}
          </p>
        </SheetContent>
      </Sheet>

      <MarkAsSignedDialog
        comic={displayComic}
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        onSave={handleMarkAsSigned}
      />

      <GradingDetailsForm
        comic={displayComic}
        open={gradingFormOpen}
        onOpenChange={setGradingFormOpen}
        onSave={handleGradingDetailsSave}
      />
    </>
  );
}

interface DetailRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  isLink?: boolean;
}

function DetailRow({ icon: Icon, label, value, isLink }: DetailRowProps) {
  if (!value) return null;
  
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      {isLink ? (
        <a href="#" className="text-primary hover:underline">{value}</a>
      ) : (
        <span className="text-foreground">{value}</span>
      )}
    </div>
  );
}
