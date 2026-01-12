import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface EnrichmentProgress {
  total: number;
  processed: number;
  enriched: number;
  errors: number;
}

export function useCreatorEnrichment() {
  const [isEnriching, setIsEnriching] = useState(false);
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const runEnrichment = useCallback(async () => {
    setIsEnriching(true);
    setError(null);
    setProgress({ total: 0, processed: 0, enriched: 0, errors: 0 });

    try {
      logger.log('[CreatorEnrichment] Starting enrichment...');
      
      const { data, error: fnError } = await supabase.functions.invoke('enrich-credits', {
        body: {},
      });

      if (fnError) {
        logger.error('[CreatorEnrichment] Function error:', fnError);
        setError('Failed to run creator enrichment');
        return { success: false, error: fnError.message };
      }

      logger.log('[CreatorEnrichment] Result:', data);

      if (data?.success) {
        setProgress({
          total: data.total || 0,
          processed: data.processed || 0,
          enriched: data.enriched || 0,
          errors: data.errors || 0,
        });
        
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['comics'] });
        
        return { success: true, data };
      } else {
        setError(data?.error || 'Unknown error during enrichment');
        return { success: false, error: data?.error };
      }
    } catch (err) {
      logger.error('[CreatorEnrichment] Failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to enrich creator data';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsEnriching(false);
    }
  }, [queryClient]);

  return {
    runEnrichment,
    isEnriching,
    progress,
    error,
  };
}
