import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Comic } from '@/types/comic';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface EnrichmentStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  error?: string;
}

interface EnrichmentResult {
  comicId: string;
  credits?: number;
  synopsis?: string;
  value?: number;
  valueSource?: string;
  error?: string;
}

export function useAutoEnrichment() {
  const { toast } = useToast();
  const [isEnriching, setIsEnriching] = useState(false);
  const [steps, setSteps] = useState<EnrichmentStep[]>([]);

  const updateStep = (id: string, updates: Partial<EnrichmentStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  /**
   * Enrich a single comic with all available data:
   * 1. Credits from ComicVine -> Metron -> GCD
   * 2. Synopsis from ComicVine detail fetch
   * 3. Market value from aggregator (GoCollect, eBay, etc.)
   */
  const enrichComic = useCallback(async (
    comic: Comic,
    options: { credits?: boolean; values?: boolean } = { credits: true, values: true }
  ): Promise<EnrichmentResult> => {
    setIsEnriching(true);
    
    const result: EnrichmentResult = { comicId: comic.id };
    
    // Initialize steps
    const initialSteps: EnrichmentStep[] = [];
    if (options.credits) {
      initialSteps.push({ id: 'credits', label: 'Fetching creators...', status: 'pending' });
    }
    if (options.values) {
      initialSteps.push({ id: 'values', label: 'Looking up market values...', status: 'pending' });
    }
    setSteps(initialSteps);

    try {
      // Step 1: Credits enrichment (if needed)
      if (options.credits && (!comic.writer || !comic.artist)) {
        updateStep('credits', { status: 'running' });
        
        try {
          const { data: creditsData, error: creditsError } = await supabase.functions.invoke('enrich-credits', {
            body: { comic_ids: [comic.id] }
          });

          if (creditsError) {
            logger.error('[AutoEnrich] Credits error:', creditsError);
            updateStep('credits', { status: 'error', error: creditsError.message });
          } else if (creditsData?.enriched > 0) {
            result.credits = creditsData.results?.[0]?.creditsCount || 0;
            updateStep('credits', { status: 'done', label: `Found ${result.credits} creators` });
          } else {
            // Try GCD as fallback
            logger.log('[AutoEnrich] Trying GCD fallback...');
            const { data: gcdData } = await supabase.functions.invoke('fetch-gcd-data', {
              body: {
                title: comic.title,
                issue_number: comic.issueNumber,
                publisher: comic.publisher,
              }
            });

            if (gcdData?.success && gcdData.credits?.length > 0) {
              result.credits = gcdData.credits.length;
              updateStep('credits', { status: 'done', label: `Found ${result.credits} creators (GCD)` });
              
              // Update comic with GCD credits
              const writer = gcdData.credits.find((c: any) => c.role === 'writer')?.name;
              const artist = gcdData.credits.find((c: any) => c.role === 'artist')?.name;
              const coverArtist = gcdData.credits.find((c: any) => c.role === 'cover_artist')?.name;
              
              const updates: Record<string, any> = { credits_source: 'gcd' };
              if (writer) updates.writer = writer;
              if (artist) updates.artist = artist;
              if (coverArtist) updates.cover_artist = coverArtist;
              
              await supabase.from('comics').update(updates).eq('id', comic.id);
            } else {
              updateStep('credits', { status: 'done', label: 'No credits found' });
            }
          }
        } catch (err) {
          logger.error('[AutoEnrich] Credits exception:', err);
          updateStep('credits', { status: 'error', error: 'Failed to fetch credits' });
        }
      } else if (options.credits) {
        updateStep('credits', { status: 'done', label: 'Credits already present' });
      }

      // Step 2: Value aggregation (if needed)
      if (options.values && !comic.currentValue) {
        updateStep('values', { status: 'running' });
        
        try {
          const gradeForPricing = comic.gradeStatus === 'raw' 
            ? (comic.estimatedRawGrade || '5.0') 
            : comic.grade;

          const { data: valueData, error: valueError } = await supabase.functions.invoke('aggregate-comic-data', {
            body: {
              title: comic.title,
              issue_number: comic.issueNumber,
              publisher: comic.publisher,
              grade: gradeForPricing,
              grade_status: comic.gradeStatus,
              comic_id: comic.id,
              sources: ['gocollect', 'ebay', 'cpg']
            }
          });

          if (valueError) {
            logger.error('[AutoEnrich] Value error:', valueError);
            updateStep('values', { status: 'error', error: valueError.message });
          } else if (valueData?.recommended_value) {
            result.value = valueData.recommended_value;
            result.valueSource = valueData.primary_source || 'aggregated';
            updateStep('values', { status: 'done', label: `$${result.value} (${result.valueSource})` });
          } else {
            updateStep('values', { status: 'done', label: 'No market data found' });
          }
        } catch (err) {
          logger.error('[AutoEnrich] Value exception:', err);
          updateStep('values', { status: 'error', error: 'Failed to fetch values' });
        }
      } else if (options.values) {
        updateStep('values', { status: 'done', label: `$${comic.currentValue} (existing)` });
      }

    } catch (error) {
      logger.error('[AutoEnrich] Error:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    setIsEnriching(false);
    return result;
  }, []);

  /**
   * Retry credits lookup only for a comic
   */
  const retryCredits = useCallback(async (comic: Comic): Promise<boolean> => {
    setIsEnriching(true);
    setSteps([{ id: 'credits', label: 'Retrying credits lookup...', status: 'running' }]);

    try {
      // First try enrich-credits (ComicVine + Metron)
      const { data, error } = await supabase.functions.invoke('enrich-credits', {
        body: { comic_ids: [comic.id] }
      });

      if (!error && data?.enriched > 0) {
        const count = data.results?.[0]?.creditsCount || 0;
        setSteps([{ id: 'credits', label: `Found ${count} creators`, status: 'done' }]);
        toast({
          title: 'Credits Updated',
          description: `Found ${count} creator credits for ${comic.title} #${comic.issueNumber}`,
        });
        setIsEnriching(false);
        return true;
      }

      // Fallback to GCD
      const { data: gcdData } = await supabase.functions.invoke('fetch-gcd-data', {
        body: {
          title: comic.title,
          issue_number: comic.issueNumber,
          publisher: comic.publisher,
        }
      });

      if (gcdData?.success && gcdData.credits?.length > 0) {
        const writer = gcdData.credits.find((c: any) => c.role === 'writer')?.name;
        const artist = gcdData.credits.find((c: any) => c.role === 'artist')?.name;
        
        const updates: Record<string, any> = { credits_source: 'gcd' };
        if (writer) updates.writer = writer;
        if (artist) updates.artist = artist;
        
        await supabase.from('comics').update(updates).eq('id', comic.id);
        
        setSteps([{ id: 'credits', label: `Found ${gcdData.credits.length} creators (GCD)`, status: 'done' }]);
        toast({
          title: 'Credits Updated',
          description: `Found ${gcdData.credits.length} creator credits from Grand Comics Database`,
        });
        setIsEnriching(false);
        return true;
      }

      setSteps([{ id: 'credits', label: 'No credits found', status: 'error' }]);
      toast({
        title: 'No Credits Found',
        description: 'Could not find creator credits in any source.',
        variant: 'destructive',
      });
      setIsEnriching(false);
      return false;
    } catch (err) {
      logger.error('[RetryCredits] Error:', err);
      setSteps([{ id: 'credits', label: 'Lookup failed', status: 'error' }]);
      setIsEnriching(false);
      return false;
    }
  }, [toast]);

  /**
   * Retry value lookup only for a comic
   */
  const retryValues = useCallback(async (comic: Comic): Promise<boolean> => {
    setIsEnriching(true);
    setSteps([{ id: 'values', label: 'Fetching market values...', status: 'running' }]);

    try {
      const gradeForPricing = comic.gradeStatus === 'raw' 
        ? (comic.estimatedRawGrade || '5.0') 
        : comic.grade;

      const { data, error } = await supabase.functions.invoke('aggregate-comic-data', {
        body: {
          title: comic.title,
          issue_number: comic.issueNumber,
          publisher: comic.publisher,
          grade: gradeForPricing,
          grade_status: comic.gradeStatus,
          comic_id: comic.id,
          sources: ['gocollect', 'ebay', 'cpg', 'covrprice']
        }
      });

      if (!error && data?.recommended_value) {
        setSteps([{ id: 'values', label: `$${data.recommended_value} (${data.primary_source})`, status: 'done' }]);
        toast({
          title: 'Value Updated',
          description: `Market value: $${data.recommended_value} (${data.primary_source})`,
        });
        setIsEnriching(false);
        return true;
      }

      setSteps([{ id: 'values', label: 'No market data found', status: 'error' }]);
      toast({
        title: 'No Value Found',
        description: 'Could not find market data from any source.',
        variant: 'destructive',
      });
      setIsEnriching(false);
      return false;
    } catch (err) {
      logger.error('[RetryValues] Error:', err);
      setSteps([{ id: 'values', label: 'Lookup failed', status: 'error' }]);
      setIsEnriching(false);
      return false;
    }
  }, [toast]);

  return {
    enrichComic,
    retryCredits,
    retryValues,
    isEnriching,
    steps,
  };
}
