import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Barcode, Camera, Search, Edit, Loader2, ArrowLeft, Check, Clock, Zap } from 'lucide-react';
import { BarcodeScanner } from './BarcodeScanner';
import { CoverScanner } from './CoverScanner';
import { ComicSearch } from './ComicSearch';
import { useToast } from '@/hooks/use-toast';
import { useRecentScans } from '@/hooks/useRecentScans';
import { supabase } from '@/integrations/supabase/client';
import { PUBLISHERS, GRADE_OPTIONS, getEraFromDate, type Comic, type GradeStatus } from '@/types/comic';

interface ScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (comic: Omit<Comic, 'id' | 'dateAdded'>) => void;
}

type ScanStep = 'scan' | 'confirm' | 'details';

interface ScannedData {
  title: string;
  issueNumber: string;
  publisher: string;
  variant?: string;
  printNumber?: number;
  coverDate?: string;
  coverImageUrl?: string;
  writer?: string;
  artist?: string;
  coverArtist?: string;
  isGraded?: boolean;
  gradingCompany?: GradeStatus;
  grade?: string;
  certNumber?: string;
  isKeyIssue?: boolean;
  keyIssueReason?: string;
}

export function ScannerDialog({ open, onOpenChange, onAdd }: ScannerDialogProps) {
  const [step, setStep] = useState<ScanStep>('scan');
  const [activeTab, setActiveTab] = useState('barcode');
  const [scannedData, setScannedData] = useState<ScannedData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState(false);
  const { toast } = useToast();
  const { recentScans, addRecentScan } = useRecentScans();

  // Form state for details step
  const [formData, setFormData] = useState<Partial<Comic>>({
    gradeStatus: 'raw',
    isKeyIssue: false,
  });

  const resetState = useCallback(() => {
    setStep('scan');
    setActiveTab('barcode');
    setScannedData(null);
    setFormData({ gradeStatus: 'raw', isKeyIssue: false });
    setQuickAddMode(false);
  }, []);

  // Quick add from recent scans
  const handleQuickAdd = useCallback((scan: typeof recentScans[0]) => {
    onAdd({
      title: scan.title,
      issueNumber: scan.issueNumber,
      publisher: scan.publisher,
      coverImage: scan.coverImageUrl,
      gradeStatus: 'raw',
      isKeyIssue: false,
      era: 'modern',
    });
    
    toast({
      title: 'Comic Added!',
      description: `${scan.title} #${scan.issueNumber} added to your collection.`,
    });
  }, [onAdd, toast]);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [onOpenChange, resetState]);

  // Handle barcode scan
  const handleBarcodeScan = useCallback(async (barcode: string, format: string) => {
    console.log('Barcode scanned:', barcode, format);
    setIsSearching(true);

    try {
      // Search for comic by barcode
      const { data, error } = await supabase.functions.invoke('search-comic', {
        body: { barcode }
      });

      if (error) throw error;

      if (data.success && data.results?.[0]) {
        const result = data.results[0];
        setScannedData({
          title: result.title,
          issueNumber: result.issueNumber,
          publisher: result.publisher,
          coverDate: result.coverDate,
          coverImageUrl: result.coverImageUrl,
          writer: result.writer,
          artist: result.artist,
          coverArtist: result.coverArtist,
          isKeyIssue: result.isKeyIssue,
          keyIssueReason: result.keyIssueReason,
        });
        setStep('confirm');
      } else {
        toast({
          title: 'Comic Not Found',
          description: 'Could not find this comic. Try manual search.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      toast({
        title: 'Lookup Failed',
        description: 'Could not look up barcode. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  // Handle cover recognition
  const handleCoverRecognize = useCallback((comic: any) => {
    setScannedData({
      title: comic.title,
      issueNumber: comic.issueNumber,
      publisher: comic.publisher,
      variant: comic.variant,
      printNumber: comic.printNumber,
      coverDate: comic.coverDate,
      isGraded: comic.isGraded,
      gradingCompany: comic.gradingCompany,
      grade: comic.grade,
      certNumber: comic.certNumber,
      isKeyIssue: comic.isKeyIssue,
      keyIssueReason: comic.keyIssueReason,
    });
    setStep('confirm');
  }, []);

  // Handle search result selection
  const handleSearchSelect = useCallback((result: any) => {
    setScannedData({
      title: result.title,
      issueNumber: result.issueNumber,
      publisher: result.publisher,
      coverDate: result.coverDate,
      coverImageUrl: result.coverImageUrl,
      writer: result.writer,
      artist: result.artist,
      coverArtist: result.coverArtist,
      isKeyIssue: result.isKeyIssue,
      keyIssueReason: result.keyIssueReason,
    });
    setStep('confirm');
  }, []);

  // Proceed from confirm to details
  const handleConfirm = useCallback(() => {
    if (!scannedData) return;

    setFormData({
      title: scannedData.title,
      issueNumber: scannedData.issueNumber,
      publisher: scannedData.publisher,
      variant: scannedData.variant,
      coverDate: scannedData.coverDate,
      coverImage: scannedData.coverImageUrl,
      writer: scannedData.writer,
      artist: scannedData.artist,
      coverArtist: scannedData.coverArtist,
      gradeStatus: scannedData.gradingCompany || 'raw',
      grade: scannedData.grade as any,
      certNumber: scannedData.certNumber,
      isKeyIssue: scannedData.isKeyIssue || false,
      keyIssueReason: scannedData.keyIssueReason,
      era: getEraFromDate(scannedData.coverDate),
    });
    setStep('details');
  }, [scannedData]);

  // Final submission
  const handleSubmit = useCallback(() => {
    if (!formData.title || !formData.publisher) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in at least title and publisher.',
        variant: 'destructive',
      });
      return;
    }

    // Add to recent scans for quick re-add
    addRecentScan({
      title: formData.title!,
      issueNumber: formData.issueNumber || '',
      publisher: formData.publisher!,
      coverImageUrl: formData.coverImage,
    });

    onAdd({
      title: formData.title!,
      issueNumber: formData.issueNumber || '',
      publisher: formData.publisher!,
      variant: formData.variant,
      coverDate: formData.coverDate,
      coverImage: formData.coverImage,
      era: formData.era || getEraFromDate(formData.coverDate),
      writer: formData.writer,
      artist: formData.artist,
      coverArtist: formData.coverArtist,
      gradeStatus: formData.gradeStatus || 'raw',
      grade: formData.grade,
      certNumber: formData.certNumber,
      isKeyIssue: formData.isKeyIssue || false,
      keyIssueReason: formData.keyIssueReason,
      purchasePrice: formData.purchasePrice,
      currentValue: formData.currentValue,
      location: formData.location,
      notes: formData.notes,
    });

    toast({
      title: 'Comic Added!',
      description: `${formData.title} #${formData.issueNumber} added to your collection.`,
    });

    handleClose();
  }, [formData, onAdd, toast, handleClose, addRecentScan]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== 'scan' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setStep(step === 'details' ? 'confirm' : 'scan')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'scan' && 'Add Comic'}
            {step === 'confirm' && 'Confirm Match'}
            {step === 'details' && 'Comic Details'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Scan/Search */}
        {step === 'scan' && (
          <div className="space-y-4">
            {/* Recent Scans - Quick Re-add */}
            {recentScans.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Recent - Tap to quick add</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recentScans.slice(0, 3).map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => handleQuickAdd(scan)}
                      className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 min-h-[44px] active:bg-secondary"
                    >
                      {scan.coverImageUrl ? (
                        <img src={scan.coverImageUrl} alt="" className="w-6 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-6 h-8 rounded bg-muted" />
                      )}
                      <div className="text-left">
                        <p className="text-xs font-medium truncate max-w-[100px]">{scan.title}</p>
                        <p className="text-[10px] text-muted-foreground">#{scan.issueNumber}</p>
                      </div>
                      <Zap className="w-3 h-3 text-accent" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="barcode" className="text-xs min-h-[44px]">
                  <Barcode className="w-4 h-4 mr-1" />
                  Barcode
                </TabsTrigger>
                <TabsTrigger value="cover" className="text-xs min-h-[44px]">
                  <Camera className="w-4 h-4 mr-1" />
                  Cover
                </TabsTrigger>
                <TabsTrigger value="search" className="text-xs min-h-[44px]">
                  <Search className="w-4 h-4 mr-1" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="manual" className="text-xs min-h-[44px]">
                  <Edit className="w-4 h-4 mr-1" />
                  Manual
                </TabsTrigger>
              </TabsList>

              <TabsContent value="barcode" className="mt-4">
                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <BarcodeScanner onScan={handleBarcodeScan} />
                )}
              </TabsContent>

              <TabsContent value="cover" className="mt-4">
                <CoverScanner onRecognize={handleCoverRecognize} />
              </TabsContent>

              <TabsContent value="search" className="mt-4">
                <ComicSearch onSelect={handleSearchSelect} />
              </TabsContent>

              <TabsContent value="manual" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Enter comic details manually
                  </p>
                  <Button 
                    onClick={() => {
                      setScannedData({ title: '', issueNumber: '', publisher: '' });
                      setStep('details');
                    }}
                    className="w-full min-h-[44px]"
                  >
                    Continue to Form
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 2: Confirm Match */}
        {step === 'confirm' && scannedData && (
          <div className="space-y-4">
            {/* Preview card */}
            <div className="flex gap-4 p-4 rounded-lg bg-card border border-border">
              {scannedData.coverImageUrl ? (
                <img
                  src={scannedData.coverImageUrl}
                  alt={scannedData.title}
                  className="w-24 h-32 object-cover rounded"
                />
              ) : (
                <div className="w-24 h-32 bg-muted rounded flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">No Cover</span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {scannedData.title} #{scannedData.issueNumber}
                </h3>
                <p className="text-sm text-muted-foreground">{scannedData.publisher}</p>
                {scannedData.variant && (
                  <p className="text-sm text-muted-foreground">{scannedData.variant}</p>
                )}
                {scannedData.isGraded && (
                  <p className="text-sm text-primary mt-1">
                    Graded: {scannedData.gradingCompany?.toUpperCase()} {scannedData.grade}
                  </p>
                )}
                {scannedData.isKeyIssue && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-accent/20 text-accent text-xs rounded">
                    Key Issue: {scannedData.keyIssueReason}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('scan')}>
                Not Right
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                <Check className="w-4 h-4 mr-2" />
                Confirm
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Details Form */}
        {step === 'details' && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Amazing Spider-Man"
                />
              </div>

              <div className="space-y-2">
                <Label>Issue #</Label>
                <Input
                  value={formData.issueNumber || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, issueNumber: e.target.value }))}
                  placeholder="300"
                />
              </div>

              <div className="space-y-2">
                <Label>Publisher</Label>
                <Select
                  value={formData.publisher}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, publisher: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLISHERS.map((pub) => (
                      <SelectItem key={pub} value={pub}>{pub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cover Date</Label>
                <Input
                  type="date"
                  value={formData.coverDate || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    coverDate: e.target.value,
                    era: getEraFromDate(e.target.value),
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Variant</Label>
                <Input
                  value={formData.variant || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, variant: e.target.value }))}
                  placeholder="Cover A, 1:25, etc."
                />
              </div>
            </div>

            {/* Grading */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.gradeStatus}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, gradeStatus: v as GradeStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw">Raw</SelectItem>
                      <SelectItem value="cgc">CGC</SelectItem>
                      <SelectItem value="cbcs">CBCS</SelectItem>
                      <SelectItem value="pgx">PGX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.gradeStatus !== 'raw' && (
                  <>
                    <div className="space-y-2">
                      <Label>Grade</Label>
                      <Select
                        value={formData.grade}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, grade: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_OPTIONS.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cert #</Label>
                      <Input
                        value={formData.certNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, certNumber: e.target.value }))}
                        placeholder="1234567890"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Value */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || undefined }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Current Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.currentValue || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentValue: parseFloat(e.target.value) || undefined }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Key Issue */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Label>Key Issue</Label>
              <Switch
                checked={formData.isKeyIssue}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isKeyIssue: checked }))}
              />
            </div>

            {formData.isKeyIssue && (
              <div className="space-y-2">
                <Label>Key Issue Reason</Label>
                <Input
                  value={formData.keyIssueReason || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, keyIssueReason: e.target.value }))}
                  placeholder="1st Appearance of..."
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2 pt-4 border-t border-border">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            {/* Submit */}
            <Button onClick={handleSubmit} className="w-full">
              Add to Collection
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
