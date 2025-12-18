import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PUBLISHERS } from '@/types/comic';
import { cn } from '@/lib/utils';

interface SearchResult {
  title: string;
  issueNumber: string;
  volume?: number;
  publisher: string;
  coverDate?: string;
  writer?: string;
  artist?: string;
  coverArtist?: string;
  description?: string;
  coverImageUrl?: string;
  isKeyIssue?: boolean;
  keyIssueReason?: string;
  variants?: string[];
}

interface ComicSearchProps {
  onSelect: (result: SearchResult) => void;
}

export function ComicSearch({ onSelect }: ComicSearchProps) {
  const [title, setTitle] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [publisher, setPublisher] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const { toast } = useToast();

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: 'Search Required',
        description: 'Please enter a comic title to search.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('search-comic', {
        body: { title, issueNumber, publisher }
      });

      if (error) throw error;

      if (data.success && data.results) {
        setResults(data.results);
        if (data.results.length === 0) {
          toast({
            title: 'No Results',
            description: 'No comics found. Try a different search.',
          });
        }
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      toast({
        title: 'Search Failed',
        description: err instanceof Error ? err.message : 'Could not search comics',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  }, [title, issueNumber, publisher, toast]);

  return (
    <div className="w-full">
      {/* Search form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="search-title">Series Title</Label>
          <Input
            id="search-title"
            placeholder="e.g. Amazing Spider-Man"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search-issue">Issue #</Label>
            <Input
              id="search-issue"
              placeholder="e.g. 300"
              value={issueNumber}
              onChange={(e) => setIssueNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-publisher">Publisher</Label>
            <Select value={publisher} onValueChange={setPublisher}>
              <SelectTrigger id="search-publisher">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any Publisher</SelectItem>
                {PUBLISHERS.map((pub) => (
                  <SelectItem key={pub} value={pub}>{pub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSearching}>
          {isSearching ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          Search
        </Button>
      </form>

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </h3>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => onSelect(result)}
                className={cn(
                  "w-full p-3 rounded-lg border border-border/50 bg-card/50 text-left",
                  "hover:bg-card hover:border-primary/50 transition-colors"
                )}
              >
                <div className="flex gap-3">
                  {/* Cover thumbnail */}
                  {result.coverImageUrl ? (
                    <img
                      src={result.coverImageUrl}
                      alt={result.title}
                      className="w-12 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">?</span>
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {result.title} #{result.issueNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.publisher}
                      {result.coverDate && ` • ${result.coverDate}`}
                    </p>
                    {result.isKeyIssue && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-accent/20 text-accent text-xs rounded">
                        Key Issue
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
