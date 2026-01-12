import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Barcode, 
  Search, 
  Loader2, 
  Star, 
  TrendingUp, 
  Plus,
  RotateCcw,
  Flame,
  Sparkles,
  LogIn,
  Zap,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { BarcodeScanner, type ParsedUPC } from './BarcodeScanner';
import { ContinuousHunting } from './ContinuousHunting';
import { EnhancedValueDisplay } from './EnhancedValueDisplay';
import { OwnedBadge, MissingBadge } from './OwnedBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useHuntingFeedback } from '@/hooks/useHuntingFeedback';
import { useScanResultCache, CachedScanResult } from '@/hooks/useScanResultCache';
import { getIssueKey } from '@/hooks/useGroupedComics';
import type { Comic } from '@/types/comic';

interface HuntingModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCollection?: (comic: Omit<Comic, 'id' | 'dateAdded'>) => void;
  ownedComics?: Comic[];
}

type Verdict = 'get' | 'consider' | 'pass' | null;

interface HuntingResult {
  title: string;
  issueNumber: string;
  publisher?: string;
  variant?: string;
  coverImageUrl?: string;
  isKeyIssue: boolean;
  keyIssueReason?: string;
  rawValue?: number;
  gradedValue98?: number;
  valueRange?: { low: number; high: number };
  valueConfidence?: 'high' | 'medium' | 'low';
  confidenceScore?: number;
  verdict: Verdict;
  alreadyOwned: boolean;
  ownedCopyCount: number;
}

function getVerdict(result: Partial<HuntingResult>): Verdict {
  const rawValue = result.rawValue || 0;
  const isKeyIssue = result.isKeyIssue || false;
  
  if (rawValue >= 50 || isKeyIssue) {
    return 'get';
  } else if (rawValue >= 15 || result.issueNumber === '1') {
    return 'consider';
  }
  return 'pass';
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (!verdict) return null;
  
  const config = {
    get: { 
      icon: Flame, 
      label: 'GET IT!', 
      className: 'bg-green-500/20 text-green-400 border-green-500/30 animate-pulse' 
    },
    consider: { 
      icon: AlertCircle, 
      label: 'CONSIDER', 
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
    },
    pass: { 
      icon: XCircle, 
      label: 'PASS', 
      className: 'bg-muted text-muted-foreground border-border' 
    },
  };
  
  const { icon: Icon, label, className } = config[verdict];
  
  return (
    <Badge variant="outline" className={`text-lg px-4 py-2 gap-2 ${className}`}>
      <Icon className="w-5 h-5" />
      {label}
    </Badge>
  );
}

export function HuntingMode({ open, onOpenChange, onAddToCollection, ownedComics = [] }: HuntingModeProps) {
  const [activeTab, setActiveTab] = useState<'scan' | 'search' | 'rapid'>('scan');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<HuntingResult | null>(null);
  const [searchTitle, setSearchTitle] = useState('');
  const [searchIssue, setSearchIssue] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const { triggerFeedback } = useHuntingFeedback();
  const { get: getCachedResult, set: setCachedResult } = useScanResultCache();

  // Variant-aware collection check using getIssueKey
  const checkIfOwned = useCallback((title: string, issueNumber: string, publisher?: string, variant?: string): { isOwned: boolean; copyCount: number } => {
    const tempComic = {
      title,
      issueNumber,
      publisher: publisher || '',
      variant_type: variant || '',
    } as unknown as Comic;
    
    const issueKey = getIssueKey(tempComic);
    const matchingCopies = ownedComics.filter(c => getIssueKey(c) === issueKey);
    
    return {
      isOwned: matchingCopies.length > 0,
      copyCount: matchingCopies.length,
    };
  }, [ownedComics]);

  const lookupComic = useCallback(async (title: string, issueNumber: string, publisher?: string, barcode?: string) => {
    setIsSearching(true);
    setResult(null);
    
    try {
      // Generate issue key for caching
      const tempComic = {
        title,
        issueNumber,
        publisher: publisher || '',
        variant_type: '',
      } as unknown as Comic;
      const issueKey = getIssueKey(tempComic);

      // Check cache first
      const cached = getCachedResult(issueKey);
      if (cached) {
        const huntingResult: HuntingResult = {
          ...cached,
          alreadyOwned: cached.alreadyOwned,
          ownedCopyCount: cached.ownedCopyCount || 0,
        };
        setResult(huntingResult);
        triggerFeedback(cached.verdict, cached.isKeyIssue);
        setIsSearching(false);
        return;
      }

      // Step 1: Search for comic info
      const searchBody = barcode 
        ? { barcode } 
        : { title, issueNumber, publisher };
      
      const { data: searchData, error: searchError } = await supabase.functions.invoke('search-metron', {
        body: searchBody
      });

      if (searchError) throw searchError;

      let comicInfo = searchData?.results?.[0];
      
      // Fallback to generic search if Metron fails
      if (!comicInfo && !barcode) {
        const { data: fallbackData } = await supabase.functions.invoke('search-comic', {
          body: { title, issueNumber }
        });
        comicInfo = fallbackData?.results?.[0];
      }

      if (!comicInfo) {
        toast({
          title: 'Comic Not Found',
          description: 'Could not find this comic. Try different search terms.',
          variant: 'destructive',
        });
        setIsSearching(false);
        return;
      }

      // Check ownership (variant-aware)
      const { isOwned, copyCount } = checkIfOwned(
        comicInfo.title, 
        comicInfo.issueNumber, 
        comicInfo.publisher,
        comicInfo.variant
      );

      // Step 2: Fetch aggregated value data
      let rawValue: number | undefined;
      let gradedValue98: number | undefined;
      let valueRange: { low: number; high: number } | undefined;
      let confidenceScore: number | undefined;
      let valueConfidence: 'high' | 'medium' | 'low' = 'low';

      try {
        const { data: valueData } = await supabase.functions.invoke('aggregate-comic-data', {
          body: {
            title: comicInfo.title,
            issue_number: comicInfo.issueNumber,
            publisher: comicInfo.publisher,
            grade_status: 'raw',
            include_sources: ['gocollect', 'ebay'], // Fast sources only
          }
        });

        if (valueData?.success !== false) {
          rawValue = valueData?.recommendedValue || valueData?.rawValue;
          gradedValue98 = valueData?.fmvByGrade?.['9.8']?.recommended || valueData?.graded98Value;
          valueRange = valueData?.valueRange;
          confidenceScore = valueData?.confidenceScore;
          valueConfidence = confidenceScore && confidenceScore >= 70 ? 'high' : 
                           confidenceScore && confidenceScore >= 40 ? 'medium' : 'low';
        }
      } catch (err) {
        console.log('Value lookup failed, continuing without values');
      }

      // Build result
      const partialResult = {
        title: comicInfo.title,
        issueNumber: comicInfo.issueNumber,
        publisher: comicInfo.publisher || 'Unknown',
        variant: comicInfo.variant,
        coverImageUrl: comicInfo.coverImageUrl,
        isKeyIssue: comicInfo.isKeyIssue || false,
        keyIssueReason: comicInfo.keyIssueReason,
        rawValue,
        gradedValue98,
        valueRange,
        valueConfidence,
        confidenceScore,
        alreadyOwned: isOwned,
        ownedCopyCount: copyCount,
        verdict: null as Verdict,
      };

      partialResult.verdict = getVerdict(partialResult);

      // Cache the result
      const cacheEntry: CachedScanResult = {
        title: partialResult.title,
        issueNumber: partialResult.issueNumber,
        publisher: partialResult.publisher,
        variant: partialResult.variant,
        coverImageUrl: partialResult.coverImageUrl,
        isKeyIssue: partialResult.isKeyIssue,
        keyIssueReason: partialResult.keyIssueReason,
        rawValue,
        gradedValue98,
        valueRange,
        valueConfidence,
        confidenceScore,
        verdict: partialResult.verdict,
        alreadyOwned: isOwned,
        ownedCopyCount: copyCount,
      };
      setCachedResult(issueKey, cacheEntry);

      setResult(partialResult);
      
      // Trigger audio/haptic feedback based on verdict
      triggerFeedback(partialResult.verdict, partialResult.isKeyIssue);

    } catch (err) {
      console.error('Hunting lookup error:', err);
      toast({
        title: 'Lookup Failed',
        description: 'Could not complete the lookup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [checkIfOwned, toast, triggerFeedback, getCachedResult, setCachedResult]);

  const handleBarcodeScan = useCallback(async (barcode: string, format: string, parsedUPC?: ParsedUPC) => {
    console.log('Hunting mode scan:', barcode, format);
    await lookupComic('', '', undefined, barcode);
  }, [lookupComic]);

  const handleManualSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTitle.trim()) return;
    await lookupComic(searchTitle.trim(), searchIssue.trim() || '1');
  }, [searchTitle, searchIssue, lookupComic]);

  const handleAddToCollection = useCallback(() => {
    if (!result) return;
    
    // Check if user is authenticated
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to add comics to your collection.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!onAddToCollection) return;
    
    onAddToCollection({
      title: result.title,
      issueNumber: result.issueNumber,
      publisher: result.publisher,
      coverImage: result.coverImageUrl,
      isKeyIssue: result.isKeyIssue,
      keyIssueReason: result.keyIssueReason,
      currentValue: result.rawValue,
      gradeStatus: 'raw',
      era: 'modern',
    });

    toast({
      title: 'Added to Collection!',
      description: `${result.title} #${result.issueNumber} has been added.`,
    });

    // Update result to show as owned
    setResult(prev => prev ? { 
      ...prev, 
      alreadyOwned: true, 
      ownedCopyCount: (prev.ownedCopyCount || 0) + 1 
    } : null);
  }, [result, onAddToCollection, toast, user]);

  const handleReset = useCallback(() => {
    setResult(null);
    setSearchTitle('');
    setSearchIssue('');
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onOpenChange(false);
  }, [handleReset, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent fullScreenMobile className="max-w-lg max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="p-4 pb-0 shrink-0 pt-safe">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Hunting Mode
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Scan or search to instantly evaluate comics
          </p>
        </DialogHeader>

        <div className="p-4 flex-1 overflow-y-auto pb-safe">
          {/* Auth Warning */}
          {!user && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-sm text-yellow-400">
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Log in to save comics to your collection</span>
            </div>
          )}

          {/* Results Display */}
          {result ? (
            <div className="space-y-4 animate-fade-in">
              {/* Verdict & Ownership Header */}
              <div className="flex items-center justify-between">
                <VerdictBadge verdict={result.verdict} />
                {result.alreadyOwned ? (
                  <OwnedBadge isOwned={true} copyCount={result.ownedCopyCount} size="lg" />
                ) : (
                  <MissingBadge size="lg" />
                )}
              </div>

              {/* Cover & Basic Info */}
              <div className="flex gap-4">
                {result.coverImageUrl ? (
                  <img 
                    src={result.coverImageUrl} 
                    alt={result.title}
                    className="w-24 h-36 object-cover rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-36 bg-muted rounded-lg flex items-center justify-center">
                    <Barcode className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-xl truncate">{result.title}</h3>
                  <p className="text-muted-foreground">#{result.issueNumber}</p>
                  <p className="text-sm text-muted-foreground">{result.publisher}</p>
                  {result.variant && (
                    <Badge variant="outline" className="mt-1">{result.variant}</Badge>
                  )}
                </div>
              </div>

              <Separator />

              {/* Value Display - Most Prominent */}
              <EnhancedValueDisplay
                rawValue={result.rawValue}
                gradedValue98={result.gradedValue98}
                valueRange={result.valueRange}
                confidence={result.valueConfidence}
                confidenceScore={result.confidenceScore}
              />

              {/* Key Issue Badge */}
              {result.isKeyIssue && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <Star className="w-5 h-5 fill-primary text-primary" />
                  <div>
                    <p className="font-medium text-primary">Key Issue</p>
                    {result.keyIssueReason && (
                      <p className="text-xs text-muted-foreground italic">
                        "{result.keyIssueReason}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {onAddToCollection && !result.alreadyOwned && (
                  <Button 
                    className="flex-1 min-h-[48px]" 
                    onClick={handleAddToCollection}
                    disabled={!user}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {user ? 'Add to Collection' : 'Login to Add'}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className={`min-h-[48px] ${onAddToCollection && !result.alreadyOwned ? '' : 'flex-1'}`}
                  onClick={handleReset}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Scan Next
                </Button>
              </div>
            </div>
          ) : (
            /* Scanner / Search UI */
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'scan' | 'search' | 'rapid')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="rapid" className="min-h-[44px]">
                  <Zap className="w-4 h-4 mr-2" />
                  Rapid Fire
                </TabsTrigger>
                <TabsTrigger value="scan" className="min-h-[44px]">
                  <Barcode className="w-4 h-4 mr-2" />
                  Barcode
                </TabsTrigger>
                <TabsTrigger value="search" className="min-h-[44px]">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rapid" className="mt-4">
                <ContinuousHunting 
                  ownedComics={ownedComics}
                  onExit={() => setActiveTab('scan')}
                />
              </TabsContent>

              <TabsContent value="scan" className="mt-4">
                {isSearching ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Looking up comic...</p>
                  </div>
                ) : (
                  <BarcodeScanner 
                    onScan={handleBarcodeScan}
                    onError={(err) => toast({ 
                      title: 'Scanner Error', 
                      description: err, 
                      variant: 'destructive' 
                    })}
                  />
                )}
              </TabsContent>

              <TabsContent value="search" className="mt-4">
                <form onSubmit={handleManualSearch} className="space-y-4">
                  <div>
                    <Input
                      placeholder="Title (e.g. Amazing Spider-Man)"
                      value={searchTitle}
                      onChange={(e) => setSearchTitle(e.target.value)}
                      className="min-h-[48px]"
                    />
                  </div>
                  <div>
                    <Input
                      placeholder="Issue # (e.g. 300)"
                      value={searchIssue}
                      onChange={(e) => setSearchIssue(e.target.value)}
                      className="min-h-[48px]"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full min-h-[48px]"
                    disabled={!searchTitle.trim() || isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4 mr-2" />
                    )}
                    Get Value
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
