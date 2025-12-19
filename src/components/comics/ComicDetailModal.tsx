import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Comic, ERA_LABELS, SignatureType, Signature, SIGNATURE_TYPE_LABELS } from '@/types/comic';
import { Star, Award, Calendar, User, MapPin, Trash2, Loader2, PenTool, CheckCircle2, ShieldCheck, Settings, Edit, Palette, BookOpen, X } from 'lucide-react';
import { useComicEnrichment } from '@/hooks/useComicEnrichment';
import { MarkAsSignedDialog } from './MarkAsSignedDialog';
import { EditComicDialog } from './EditComicDialog';
import { ShouldIGradeThis } from '@/components/insights/ShouldIGradeThis';
import { GradingDetails } from './GradingDetails';
import { GradingDetailsForm } from './GradingDetailsForm';
import { useCertVerification } from '@/hooks/useCertVerification';

interface ComicDetailModalProps {
  comic: Comic | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Comic>) => Promise<void>;
}

export function ComicDetailModal({ comic, open, onOpenChange, onDelete, onUpdate }: ComicDetailModalProps) {
  const { enrichComic, needsEnrichment, isEnriching } = useComicEnrichment();
  const { verifyCert, isVerifying } = useCertVerification();
  const [enrichedComic, setEnrichedComic] = useState<Comic | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [gradingFormOpen, setGradingFormOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Auto-enrich when modal opens
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

  const handleMarkAsSigned = async (signatures: Signature[]) => {
    const firstSig = signatures[0];
    await onUpdate(displayComic.id, {
      isSigned: true,
      signedBy: firstSig?.signedBy,
      signedDate: firstSig?.signedDate,
      signatureType: firstSig?.signatureType,
      signatures,
    });
    setEnrichedComic(prev => prev ? {
      ...prev,
      isSigned: true,
      signedBy: firstSig?.signedBy,
      signedDate: firstSig?.signedDate,
      signatureType: firstSig?.signatureType,
      signatures,
    } : null);
  };

  const handleRemoveSignature = async () => {
    await onUpdate(displayComic.id, {
      isSigned: false,
      signedBy: undefined,
      signedDate: undefined,
      signatureType: undefined,
      signatures: [],
    });
    setEnrichedComic(prev => prev ? {
      ...prev,
      isSigned: false,
      signedBy: undefined,
      signedDate: undefined,
      signatureType: undefined,
      signatures: [],
    } : null);
  };

  const getSignatures = (): Signature[] => {
    if (displayComic.signatures && displayComic.signatures.length > 0) {
      return displayComic.signatures;
    }
    if (displayComic.isSigned && displayComic.signedBy) {
      return [{
        id: 'legacy',
        signedBy: displayComic.signedBy,
        signedDate: displayComic.signedDate,
        signatureType: displayComic.signatureType || 'witnessed',
      }];
    }
    return [];
  };

  const signatures = getSignatures();

  const getSignatureTypeLabel = (type?: SignatureType) => {
    if (!type) return 'Signed';
    return SIGNATURE_TYPE_LABELS[type] || 'Signed';
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-3xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden bg-card border-border"
        >
          <DialogTitle className="sr-only">{displayComic.title} #{displayComic.issueNumber}</DialogTitle>
          
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              {/* Close button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4 z-10 bg-background/80 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              {/* Enrichment Loading Indicator */}
              {isEnriching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-2 bg-secondary/50 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Fetching details from ComicVine...
                </div>
              )}
              
              {/* Two-column layout on desktop */}
              <div className="grid md:grid-cols-[280px_1fr] gap-6">
                {/* Cover Image Column */}
                <div className="space-y-4">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-secondary">
                    {displayComic.coverImage ? (
                      <img 
                        src={displayComic.coverImage} 
                        alt={`${displayComic.title} #${displayComic.issueNumber}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
                        <div className="text-center p-4">
                          <p className="font-display text-xl text-muted-foreground">{displayComic.title}</p>
                          <p className="text-3xl font-display text-primary">#{displayComic.issueNumber}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between">
                      <div className="flex flex-col gap-2">
                        {displayComic.isKeyIssue && (
                          <Badge className="bg-accent text-accent-foreground gap-1 shadow-lg text-xs">
                            <Star className="h-3 w-3 fill-current" />
                            KEY
                          </Badge>
                        )}
                        {displayComic.isSigned && (
                          <Badge className="bg-comic-green text-white gap-1 shadow-lg text-xs">
                            <PenTool className="h-3 w-3" />
                            SIGNED
                          </Badge>
                        )}
                      </div>
                      {displayComic.grade && (
                        <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm shadow-lg ml-auto text-xs">
                          {displayComic.gradeStatus.toUpperCase()} {displayComic.grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Value Section */}
                  {(displayComic.currentValue || displayComic.purchasePrice) && (
                    <div className="space-y-2">
                      {displayComic.currentValue && (
                        <div className="stat-card p-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Value</p>
                          <p className="text-xl font-display gold-text">{formatCurrency(displayComic.currentValue)}</p>
                        </div>
                      )}
                      {displayComic.purchasePrice && (
                        <div className="stat-card p-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid</p>
                          <p className="text-lg font-display text-foreground">{formatCurrency(displayComic.purchasePrice)}</p>
                        </div>
                      )}
                      {profit !== null && (
                        <div className="stat-card p-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">Profit/Loss</p>
                          <p className={`text-lg font-display ${profit >= 0 ? 'text-comic-green' : 'text-destructive'}`}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Details Column */}
                <div className="space-y-6">
                  {/* Title */}
                  <div className="space-y-1">
                    <h2 className="font-display text-3xl md:text-4xl tracking-tight text-foreground">
                      {displayComic.title}
                    </h2>
                    <p className="text-lg text-muted-foreground">
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
                    <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <p className="text-sm font-medium text-accent">
                        <Star className="h-4 w-4 inline mr-2" />
                        {displayComic.keyIssueReason}
                      </p>
                    </div>
                  )}

                  {/* Signature Info */}
                  {displayComic.isSigned && (
                    <div className="p-3 rounded-lg bg-comic-green/10 border border-comic-green/20">
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

                  {/* Grading Details */}
                  {displayComic.gradeStatus !== 'raw' && (
                    <div className="relative">
                      <GradingDetails comic={displayComic} />
                      <div className="absolute top-3 right-3 flex gap-2">
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
                  <ShouldIGradeThis comic={displayComic} />
                  
                  {/* Details */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
                    
                    <div className="grid gap-2">
                      {displayComic.publisher && (
                        <DetailRow icon={BookOpen} label="Publisher" value={displayComic.publisher} />
                      )}
                      {displayComic.coverDate && (
                        <DetailRow icon={Calendar} label="Cover Date" value={formatDate(displayComic.coverDate)} />
                      )}
                      {displayComic.writer && (
                        <DetailRow icon={User} label="Writer" value={displayComic.writer} />
                      )}
                      {displayComic.artist && (
                        <DetailRow icon={Palette} label="Artist" value={displayComic.artist} />
                      )}
                      {displayComic.coverArtist && (
                        <DetailRow icon={Palette} label="Cover Artist" value={displayComic.coverArtist} />
                      )}
                      {displayComic.location && (
                        <DetailRow icon={MapPin} label="Location" value={displayComic.location} />
                      )}
                      
                      {/* Show placeholder if no creator data */}
                      {!displayComic.writer && !displayComic.artist && !displayComic.coverArtist && (
                        <p className="text-xs text-muted-foreground italic">
                          Creator details not available. Click Edit to add manually.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Notes */}
                  {displayComic.notes && (
                    <div className="space-y-2">
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
                    <Button 
                      variant="outline" 
                      className="flex-1 gap-2"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4" />
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
                  
                  <p className="text-xs text-muted-foreground text-center">
                    Added {formatDate(displayComic.dateAdded)}
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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

      <EditComicDialog
        comic={displayComic}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={async (updates) => {
          await onUpdate(displayComic.id, updates);
          setEnrichedComic(prev => prev ? { ...prev, ...updates } : null);
        }}
      />
    </>
  );
}

interface DetailRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
}

function DetailRow({ icon: Icon, label, value }: DetailRowProps) {
  if (!value) return null;
  
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
