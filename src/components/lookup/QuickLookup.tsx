import { useState } from 'react';
import { Search, Loader2, X, Star, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface LookupResult {
  title: string;
  issueNumber: string;
  isKeyIssue: boolean;
  keyReason?: string;
  estimatedValue?: {
    raw?: number;
    graded98?: number;
  };
  publisher?: string;
  coverDate?: string;
  coverImage?: string;
  firstAppearance?: string;
}

interface QuickLookupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCollection?: (result: LookupResult) => void;
}

export function QuickLookup({ open, onOpenChange, onAddToCollection }: QuickLookupProps) {
  const [title, setTitle] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!title.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // First search for the comic
      const { data: searchData, error: searchError } = await supabase.functions.invoke('search-metron', {
        body: { title: title.trim(), issueNumber: issueNumber.trim() }
      });

      if (searchError) throw searchError;

      if (!searchData?.results?.length) {
        setError('No comics found. Try a different search.');
        setIsLoading(false);
        return;
      }

      const comic = searchData.results[0];
      
      // Check for key issue indicators
      const isKeyIssue = comic.is_key_issue || 
        comic.key_issue_reason || 
        comic.first_appearance_of ||
        (comic.issue_number === '1');
      
      const lookupResult: LookupResult = {
        title: comic.series?.name || comic.title || title,
        issueNumber: comic.number?.toString() || issueNumber,
        isKeyIssue,
        keyReason: comic.key_issue_reason || comic.first_appearance_of || (comic.issue_number === '1' ? 'First Issue' : undefined),
        publisher: comic.publisher?.name,
        coverDate: comic.cover_date,
        coverImage: comic.image,
        firstAppearance: comic.first_appearance_of,
      };

      // Try to get value estimate from GoCollect
      try {
        const { data: valueData } = await supabase.functions.invoke('fetch-gocollect-value', {
          body: { 
            title: lookupResult.title, 
            issueNumber: lookupResult.issueNumber,
            publisher: lookupResult.publisher 
          }
        });

        if (valueData?.value) {
          lookupResult.estimatedValue = {
            raw: valueData.value.raw,
            graded98: valueData.value.graded98 || valueData.value.graded,
          };
          // If GoCollect says it's a key issue
          if (valueData.isKeyIssue) {
            lookupResult.isKeyIssue = true;
            lookupResult.keyReason = lookupResult.keyReason || valueData.keyReason;
          }
        }
      } catch (valueError) {
        console.log('Could not fetch value:', valueError);
      }

      setResult(lookupResult);
    } catch (err) {
      console.error('Lookup error:', err);
      setError('Failed to look up comic. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setIssueNumber('');
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" />
            Quick Lookup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              <div className="space-y-3">
                <Input
                  placeholder="Comic title (e.g., Amazing Spider-Man)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
                <Input
                  placeholder="Issue # (e.g., 300)"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button 
                onClick={handleSearch} 
                disabled={isLoading || !title.trim()}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Look Up
                  </>
                )}
              </Button>
            </>
          ) : (
            <LookupResultCard 
              result={result} 
              onReset={handleReset}
              onAdd={onAddToCollection}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface LookupResultCardProps {
  result: LookupResult;
  onReset: () => void;
  onAdd?: (result: LookupResult) => void;
}

function LookupResultCard({ result, onReset, onAdd }: LookupResultCardProps) {
  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Key Issue Banner */}
      {result.isKeyIssue ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/20 border border-accent/50">
          <Star className="w-5 h-5 text-accent fill-accent" />
          <div>
            <span className="font-semibold text-accent">KEY ISSUE!</span>
            {result.keyReason && (
              <p className="text-sm text-accent/80">{result.keyReason}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
          <span className="text-muted-foreground">Regular Issue</span>
        </div>
      )}

      {/* Comic Details */}
      <div className="flex gap-4">
        {result.coverImage && (
          <img 
            src={result.coverImage} 
            alt={`${result.title} #${result.issueNumber}`}
            className="w-20 h-28 object-cover rounded-md"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl truncate">{result.title}</h3>
          <p className="text-muted-foreground">Issue #{result.issueNumber}</p>
          {result.publisher && (
            <Badge variant="secondary" className="mt-1">{result.publisher}</Badge>
          )}
        </div>
      </div>

      {/* Value Estimate */}
      {result.estimatedValue && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground">Raw Value</div>
            <div className="font-display text-lg flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-primary" />
              {formatCurrency(result.estimatedValue.raw)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-secondary">
            <div className="text-xs text-muted-foreground">9.8 Graded</div>
            <div className="font-display text-lg flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-accent" />
              {formatCurrency(result.estimatedValue.graded98)}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onReset} className="flex-1">
          <X className="w-4 h-4 mr-2" />
          New Search
        </Button>
        {onAdd && (
          <Button onClick={() => onAdd(result)} className="flex-1">
            Add to Collection
          </Button>
        )}
      </div>
    </div>
  );
}
