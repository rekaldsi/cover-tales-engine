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
import { 
  Barcode, 
  Search, 
  Loader2, 
  Star, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Plus,
  RotateCcw,
  Flame,
  Sparkles
} from 'lucide-react';
import { BarcodeScanner, type ParsedUPC } from './BarcodeScanner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  publisher: string;
  coverImageUrl?: string;
  isKeyIssue: boolean;
  keyIssueReason?: string;
  rawValue?: number;
  gradedValue?: number; // 9.8 value
  verdict: Verdict;
  alreadyOwned: boolean;
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
      className: 'bg-green-500/20 text-green-400 border-green-500/30' 
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
  const [activeTab, setActiveTab] = useState<'scan' | 'search'>('scan');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<HuntingResult | null>(null);
  const [searchTitle, setSearchTitle] = useState('');
  const [searchIssue, setSearchIssue] = useState('');
  const { toast } = useToast();

  const checkIfOwned = useCallback((title: string, issueNumber: string) => {
    return ownedComics.some(
      c => c.title.toLowerCase() === title.toLowerCase() && 
           c.issueNumber === issueNumber
    );
  }, [ownedComics]);

  const lookupComic = useCallback(async (title: string, issueNumber: string, publisher?: string, barcode?: string) => {
    setIsSearching(true);
    setResult(null);
    
    try {
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

      // Step 2: Fetch value data
      let rawValue: number | undefined;
      let gradedValue: number | undefined;

      try {
        const { data: valueData } = await supabase.functions.invoke('fetch-gocollect-value', {
          body: {
            title: comicInfo.title,
            issueNumber: comicInfo.issueNumber,
            publisher: comicInfo.publisher,
          }
        });

        if (valueData?.success) {
          rawValue = valueData.fmv?.['2.0'] || valueData.fmv?.['4.0'];
          gradedValue = valueData.fmv?.['9.8'];
        }
      } catch (err) {
        console.log('Value lookup failed, continuing without values');
      }

      // Build result
      const alreadyOwned = checkIfOwned(comicInfo.title, comicInfo.issueNumber);
      const partialResult = {
        title: comicInfo.title,
        issueNumber: comicInfo.issueNumber,
        publisher: comicInfo.publisher || 'Unknown',
        coverImageUrl: comicInfo.coverImageUrl,
        isKeyIssue: comicInfo.isKeyIssue || false,
        keyIssueReason: comicInfo.keyIssueReason,
        rawValue,
        gradedValue,
        alreadyOwned,
        verdict: null as Verdict,
      };

      partialResult.verdict = getVerdict(partialResult);
      setResult(partialResult);

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
  }, [checkIfOwned, toast]);

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
    if (!result || !onAddToCollection) return;
    
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

    // Reset for next scan
    handleReset();
  }, [result, onAddToCollection, toast]);

  const handleReset = useCallback(() => {
    setResult(null);
    setSearchTitle('');
    setSearchIssue('');
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onOpenChange(false);
  }, [handleReset, onOpenChange]);

  const formatValue = (value?: number) => {
    if (!value) return '—';
    return `$${value.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Hunting Mode
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Scan or search to instantly evaluate comics
          </p>
        </DialogHeader>

        <div className="p-4">
          {/* Results Display */}
          {result ? (
            <div className="space-y-4 animate-fade-in">
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
                  
                  {result.isKeyIssue && (
                    <div className="mt-2 flex items-center gap-1 text-primary">
                      <Star className="w-4 h-4 fill-primary" />
                      <span className="text-sm font-medium">Key Issue</span>
                    </div>
                  )}
                  
                  {result.keyIssueReason && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      "{result.keyIssueReason}"
                    </p>
                  )}
                </div>
              </div>

              {/* Values */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Raw</p>
                  <p className="text-xl font-bold">{formatValue(result.rawValue)}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">9.8 Graded</p>
                  <p className="text-xl font-bold">{formatValue(result.gradedValue)}</p>
                </div>
              </div>

              {/* Verdict */}
              <div className="flex justify-center py-2">
                <VerdictBadge verdict={result.verdict} />
              </div>

              {/* Already Owned Check */}
              {result.alreadyOwned ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground bg-secondary/30 rounded-lg py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm">Already in your collection</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-green-400 bg-green-500/10 rounded-lg py-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Not in your collection</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {onAddToCollection && !result.alreadyOwned && (
                  <Button 
                    className="flex-1 min-h-[48px]" 
                    onClick={handleAddToCollection}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Collection
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
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'scan' | 'search')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="scan" className="min-h-[44px]">
                  <Barcode className="w-4 h-4 mr-2" />
                  Scan Barcode
                </TabsTrigger>
                <TabsTrigger value="search" className="min-h-[44px]">
                  <Search className="w-4 h-4 mr-2" />
                  Manual Search
                </TabsTrigger>
              </TabsList>

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
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Look Up Comic
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
