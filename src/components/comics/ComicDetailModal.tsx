import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Comic, ERA_LABELS, SignatureType, Signature, SIGNATURE_TYPE_LABELS, PAGE_QUALITY_LABELS } from '@/types/comic';
import { Star, Calendar, User, MapPin, Trash2, Loader2, PenTool, Edit, Palette, BookOpen, X, FileText, Users, TrendingUp, DollarSign, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { ConfidenceIndicator, getConfidenceLabel } from '@/components/ui/ConfidenceIndicator';
import { ValueHistoryChart } from './ValueHistoryChart';
import { useComicEnrichment } from '@/hooks/useComicEnrichment';
import { useValueHistory } from '@/hooks/useValueHistory';
import { MarkAsSignedDialog } from './MarkAsSignedDialog';
import { EditComicDialog } from './EditComicDialog';
import { ShouldIGradeThis } from '@/components/insights/ShouldIGradeThis';
import { GradingDetailsForm } from './GradingDetailsForm';
import { useCertVerification } from '@/hooks/useCertVerification';
import { getSlabPresentation, getCertVerificationUrl } from '@/lib/slabPresentation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const { getComicValueHistory, calculateValueChange, isLoading: isLoadingHistory } = useValueHistory();
  const [enrichedComic, setEnrichedComic] = useState<Comic | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [gradingFormOpen, setGradingFormOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [valueHistory, setValueHistory] = useState<any[]>([]);
  const [valueChange, setValueChange] = useState<any>(null);
  const [isEnrichingCredits, setIsEnrichingCredits] = useState(false);

  // Auto-enrich when modal opens
  useEffect(() => {
    if (open && comic && needsEnrichment(comic)) {
      enrichComic(comic, onUpdate).then(setEnrichedComic);
    } else if (comic) {
      setEnrichedComic(comic);
    }
  }, [open, comic?.id]);

  // Fetch value history when modal opens
  useEffect(() => {
    if (open && comic) {
      getComicValueHistory(comic.id, 90).then(history => {
        setValueHistory(history);
        setValueChange(calculateValueChange(history));
      });
    } else {
      setValueHistory([]);
      setValueChange(null);
    }
  }, [open, comic?.id]);

  const displayComic = enrichedComic || comic;
  if (!displayComic) return null;
  
  // Get canonical slab presentation
  const slab = getSlabPresentation({
    gradeStatus: displayComic.gradeStatus,
    grade: displayComic.grade,
    labelType: displayComic.labelType,
    signatureType: displayComic.signatureType,
    isSigned: displayComic.isSigned,
  });

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

  const hasCreators = displayComic.writer || displayComic.artist || displayComic.coverArtist || 
                      displayComic.colorist || displayComic.inker || displayComic.letterer;

  const handleRetryCreditsLookup = async () => {
    setIsEnrichingCredits(true);
    try {
      // Try enrich-credits first (ComicVine + Metron)
      const { data, error } = await supabase.functions.invoke('enrich-credits', {
        body: { comic_ids: [displayComic.id] }
      });
      
      if (!error && data?.enriched > 0) {
        toast.success(`Found ${data.results?.[0]?.creditsCount || 0} creator credits`);
      } else {
        // Fallback to GCD
        const { data: gcdData } = await supabase.functions.invoke('fetch-gcd-data', {
          body: {
            title: displayComic.title,
            issue_number: displayComic.issueNumber,
            publisher: displayComic.publisher,
          }
        });

        if (gcdData?.success && gcdData.credits?.length > 0) {
          const writer = gcdData.credits.find((c: any) => c.role === 'writer')?.name;
          const artist = gcdData.credits.find((c: any) => c.role === 'artist')?.name;
          
          if (writer || artist) {
            await onUpdate(displayComic.id, { 
              writer: writer || displayComic.writer, 
              artist: artist || displayComic.artist 
            });
            setEnrichedComic(prev => prev ? {
              ...prev,
              writer: writer || prev.writer,
              artist: artist || prev.artist,
            } : null);
            toast.success(`Found ${gcdData.credits.length} creator credits from GCD`);
          } else {
            toast.error('No credits found in any source');
          }
        } else {
          toast.error('No credits found in any source');
        }
      }
      
      // Re-fetch comic data to get updated credits
      if (comic) {
        const enriched = await enrichComic(comic, onUpdate);
        if (enriched) setEnrichedComic(enriched);
      }
    } catch (err) {
      console.error('Credits lookup error:', err);
      toast.error('Failed to lookup credits');
    } finally {
      setIsEnrichingCredits(false);
    }
  };

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

  const certUrl = displayComic.certNumber 
    ? getCertVerificationUrl(displayComic.gradeStatus, displayComic.certNumber) 
    : null;

  const extComic = displayComic as any;
  const confidenceScore = extComic.confidenceScore;
  const valueRangeLow = extComic.valueRangeLow || displayComic.valueRange?.low;
  const valueRangeHigh = extComic.valueRangeHigh || displayComic.valueRange?.high;
  
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
                  Fetching details...
                </div>
              )}
              
              {/* Two-column layout on desktop */}
              <div className="grid md:grid-cols-[240px_1fr] gap-6">
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
                    
                    {/* Key Issue Badge */}
                    {displayComic.isKeyIssue && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-accent text-accent-foreground gap-1 shadow-lg text-xs">
                          <Star className="h-3 w-3 fill-current" />
                          KEY
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Details Column */}
                <div className="space-y-5">
                  {/* SECTION 1: Header */}
                  <div className="space-y-1">
                    <h2 className="font-display text-2xl md:text-3xl tracking-tight text-foreground">
                      {displayComic.title}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      #{displayComic.issueNumber} {displayComic.variant && `• ${displayComic.variant}`}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`era-badge era-${displayComic.era}`}>
                        {ERA_LABELS[displayComic.era]}
                      </span>
                      <span className="text-sm text-muted-foreground">{displayComic.publisher}</span>
                    </div>
                    
                    {/* Key Issue Callout */}
                    {displayComic.isKeyIssue && displayComic.keyIssueReason && (
                      <div className="mt-2 p-2 rounded-lg bg-accent/10 border border-accent/20">
                        <p className="text-sm font-medium text-accent flex items-center gap-2">
                          <Star className="h-4 w-4 fill-current" />
                          {displayComic.keyIssueReason}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: Value Strip - Always visible */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Current FMV */}
                    <div className="stat-card p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Current FMV</p>
                      {displayComic.currentValue ? (
                        <>
                          <p className="text-lg font-display gold-text">{formatCurrency(displayComic.currentValue)}</p>
                          {valueRangeLow && valueRangeHigh && (
                            <p className="text-[10px] text-muted-foreground">
                              ${valueRangeLow.toFixed(0)}–${valueRangeHigh.toFixed(0)}
                            </p>
                          )}
                          {confidenceScore !== undefined && (
                            <div className="flex items-center gap-1 mt-1">
                              <ConfidenceIndicator score={confidenceScore} size="sm" />
                              <span className="text-[10px] text-muted-foreground">{getConfidenceLabel(confidenceScore)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not set</p>
                      )}
                    </div>
                    
                    {/* Paid */}
                    <div className="stat-card p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Paid</p>
                      {displayComic.purchasePrice ? (
                        <p className="text-lg font-display text-foreground">{formatCurrency(displayComic.purchasePrice)}</p>
                      ) : (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Not set</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-primary"
                            onClick={() => setEditDialogOpen(true)}
                          >
                            Add
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Delta */}
                    <div className="stat-card p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Delta</p>
                      {profit !== null ? (
                        <p className={cn(
                          'text-lg font-display',
                          profit >= 0 ? 'text-green-500' : 'text-destructive'
                        )}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Add purchase price to track ROI</p>
                      )}
                    </div>
                  </div>

                  {/* SECTION 3: Single Status Card */}
                  <div className={cn(
                    'p-3 rounded-lg border',
                    slab.slabBorderVariant === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    slab.slabBorderVariant === 'blue' ? 'bg-blue-500/10 border-blue-500/30' :
                    slab.slabBorderVariant === 'red' ? 'bg-red-500/10 border-red-500/30' :
                    slab.slabBorderVariant === 'amber' ? 'bg-amber-500/10 border-amber-500/30' :
                    'bg-secondary/50 border-border'
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-3 h-3 rounded-full',
                          slab.slabBorderVariant === 'yellow' ? 'bg-yellow-500' :
                          slab.slabBorderVariant === 'blue' ? 'bg-blue-500' :
                          slab.slabBorderVariant === 'red' ? 'bg-red-500' :
                          slab.slabBorderVariant === 'amber' ? 'bg-amber-500' :
                          'bg-muted-foreground'
                        )} />
                        <div>
                          <p className="text-sm font-semibold">{slab.labelTitle}</p>
                          {displayComic.gradeStatus !== 'raw' && displayComic.grade && (
                            <p className="text-xs text-muted-foreground">{slab.labelSubtitle}</p>
                          )}
                          {displayComic.gradeStatus === 'raw' && displayComic.estimatedRawGrade && (
                            <p className="text-xs text-muted-foreground">
                              Est. grade: {displayComic.estimatedRawGrade}
                              {displayComic.conditionConfidence && ` (${displayComic.conditionConfidence})`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {certUrl && (
                          <a 
                            href={certUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            #{displayComic.certNumber}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {displayComic.gradeStatus !== 'raw' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setGradingFormOpen(true)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Show signature info for graded signature series */}
                    {displayComic.isSigned && signatures.length > 0 && !slab.showSignedBadge && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">Signed by:</p>
                        <div className="flex flex-wrap gap-1">
                          {signatures.map((sig, i) => (
                            <Badge key={sig.id || i} variant="secondary" className="text-xs">
                              {sig.signedBy}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Raw signed books - show separate signature card */}
                  {slab.showSignedBadge && signatures.length > 0 && (
                    <div className="p-3 rounded-lg bg-comic-green/10 border border-comic-green/20">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-comic-green flex items-center gap-2 mb-1">
                            <PenTool className="h-4 w-4" />
                            {signatures.length === 1 
                              ? getSignatureTypeLabel(signatures[0].signatureType)
                              : `${signatures.length} Signatures`
                            }
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {signatures.map((sig, i) => (
                              <Badge key={sig.id || i} variant="secondary" className="text-xs">
                                {sig.signedBy}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setSignDialogOpen(true)}>
                            <PenTool className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={handleRemoveSignature}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Should I Grade This? - for raw books only */}
                  <ShouldIGradeThis comic={displayComic} />

                  {/* SECTION 4: Collapsible Drawers */}
                  <Accordion type="multiple" className="w-full">
                    {/* Creators Drawer */}
                    <AccordionItem value="creators" className="border-b-0">
                      <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          Creators
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        {hasCreators ? (
                          <div className="grid gap-2">
                            {displayComic.writer && <DetailRow icon={User} label="Writer" value={displayComic.writer} />}
                            {displayComic.artist && <DetailRow icon={Palette} label="Artist" value={displayComic.artist} />}
                            {displayComic.coverArtist && <DetailRow icon={Palette} label="Cover" value={displayComic.coverArtist} />}
                            {displayComic.colorist && <DetailRow icon={Palette} label="Colorist" value={displayComic.colorist} />}
                            {displayComic.inker && <DetailRow icon={Palette} label="Inker" value={displayComic.inker} />}
                            {displayComic.letterer && <DetailRow icon={User} label="Letterer" value={displayComic.letterer} />}
                            {displayComic.editor && <DetailRow icon={User} label="Editor" value={displayComic.editor} />}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Creator credits not enriched yet</p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleRetryCreditsLookup}
                              disabled={isEnrichingCredits}
                              className="gap-2"
                            >
                              {isEnrichingCredits ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              Retry Credits Lookup
                            </Button>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* Story Drawer */}
                    <AccordionItem value="story" className="border-b-0">
                      <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Story
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-3">
                        {displayComic.synopsis && (
                          <p className="text-sm text-foreground/80 leading-relaxed">{displayComic.synopsis}</p>
                        )}
                        {displayComic.storyArc && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase mb-1">Story Arc</p>
                            <p className="text-sm font-medium">{displayComic.storyArc}</p>
                          </div>
                        )}
                        {displayComic.characters && displayComic.characters.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground uppercase mb-1">Characters</p>
                            <div className="flex flex-wrap gap-1">
                              {displayComic.characters.slice(0, 8).map((char, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{char}</Badge>
                              ))}
                              {displayComic.characters.length > 8 && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  +{displayComic.characters.length - 8} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        {!displayComic.synopsis && !displayComic.storyArc && (!displayComic.characters || displayComic.characters.length === 0) && (
                          <p className="text-sm text-muted-foreground">No story information available</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* Grading Details Drawer - only for graded books */}
                    {displayComic.gradeStatus !== 'raw' && (
                      <AccordionItem value="grading" className="border-b-0">
                        <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">
                          <span className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            Grading Details
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4 space-y-2">
                          {displayComic.pageQuality && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Page Quality</span>
                              <span>{PAGE_QUALITY_LABELS[displayComic.pageQuality] || displayComic.pageQuality}</span>
                            </div>
                          )}
                          {displayComic.gradedDate && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Graded</span>
                              <span>{formatDate(displayComic.gradedDate)}</span>
                            </div>
                          )}
                          {displayComic.graderNotes && (
                            <div className="pt-2">
                              <p className="text-xs text-muted-foreground mb-1">Grader Notes</p>
                              <p className="text-sm text-foreground/80 p-2 bg-secondary/50 rounded">{displayComic.graderNotes}</p>
                            </div>
                          )}
                          {displayComic.innerWellNotes && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Inner Well</p>
                              <p className="text-sm text-foreground/80">{displayComic.innerWellNotes}</p>
                            </div>
                          )}
                          {certUrl && (
                            <div className="pt-2">
                              <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleVerifyCert} disabled={isVerifying}>
                                <ShieldCheck className="h-4 w-4" />
                                {isVerifying ? 'Verifying...' : 'Verify Certificate'}
                              </Button>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Market Data Drawer */}
                    <AccordionItem value="market" className="border-b-0">
                      <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          Market Data
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        {valueHistory.length > 0 ? (
                          <div className="space-y-3">
                            <ValueHistoryChart 
                              history={valueHistory} 
                              valueChange={valueChange} 
                              currentValue={displayComic.currentValue} 
                            />
                          </div>
                        ) : isLoadingHistory ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Fetching market prices...
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No market history available</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    {/* Notes & Location Drawer */}
                    <AccordionItem value="notes" className="border-b-0">
                      <AccordionTrigger className="text-sm font-semibold py-2 hover:no-underline">
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          Details & Notes
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-2">
                        {displayComic.coverDate && (
                          <DetailRow icon={Calendar} label="Cover Date" value={formatDate(displayComic.coverDate)} />
                        )}
                        {displayComic.coverPrice && (
                          <DetailRow icon={DollarSign} label="Cover Price" value={displayComic.coverPrice} />
                        )}
                        {displayComic.upcCode && (
                          <DetailRow icon={BookOpen} label="UPC" value={displayComic.upcCode} />
                        )}
                        {displayComic.location && (
                          <DetailRow icon={MapPin} label="Location" value={displayComic.location} />
                        )}
                        {(displayComic as any).purchaseDate && (
                          <DetailRow icon={Calendar} label="Purchased" value={formatDate((displayComic as any).purchaseDate)} />
                        )}
                        {displayComic.notes && (
                          <div className="pt-2">
                            <p className="text-xs text-muted-foreground mb-1">Notes</p>
                            <p className="text-sm text-foreground/80">{displayComic.notes}</p>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  
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
