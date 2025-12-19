import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Comic } from '@/types/comic';

interface EnrichmentResult {
  coverImageUrl?: string;
  writer?: string;
  artist?: string;
  coverArtist?: string;
  coverDate?: string;
  comicvineId?: string;
}

export function useComicEnrichment() {
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);

  const needsEnrichment = (comic: Comic): boolean => {
    // Check for missing cover image OR missing creator data
    return !comic.coverImage || !comic.writer || !comic.artist || !comic.coverDate;
  };

  const enrichComic = useCallback(async (
    comic: Comic,
    onUpdate: (id: string, updates: Partial<Comic>) => Promise<void>
  ): Promise<Comic> => {
    // Skip if already has all data
    if (!needsEnrichment(comic)) {
      return comic;
    }

    setIsEnriching(true);
    setEnrichmentError(null);

    try {
      console.log(`[Enrichment] Fetching data for: ${comic.title} #${comic.issueNumber}`);
      
      const { data, error } = await supabase.functions.invoke('fetch-comic-cover', {
        body: {
          title: comic.title,
          issueNumber: comic.issueNumber,
          publisher: comic.publisher,
        },
      });

      if (error) {
        console.error('[Enrichment] Error:', error);
        setEnrichmentError('Failed to fetch comic details');
        return comic;
      }

      console.log('[Enrichment] Response:', data);

      if (!data || data.error || !data.success) {
        console.log('[Enrichment] No data found:', data?.error);
        return comic;
      }

      // Build updates only for missing fields
      // Note: API returns coverImageUrl, we map to coverImage
      const updates: Partial<Comic> = {};
      
      if (!comic.coverImage && data.coverImageUrl) {
        updates.coverImage = data.coverImageUrl;
      }
      if (!comic.writer && data.writer) {
        updates.writer = data.writer;
      }
      if (!comic.artist && data.artist) {
        updates.artist = data.artist;
      }
      if (!comic.coverArtist && data.coverArtist) {
        updates.coverArtist = data.coverArtist;
      }
      if (!comic.coverDate && data.coverDate) {
        updates.coverDate = data.coverDate;
      }

      console.log('[Enrichment] Updates to apply:', updates);

      // Only update if we have new data
      if (Object.keys(updates).length > 0) {
        await onUpdate(comic.id, updates);
        console.log('[Enrichment] Updated comic:', comic.id);
        return { ...comic, ...updates };
      }

      return comic;
    } catch (err) {
      console.error('[Enrichment] Failed:', err);
      setEnrichmentError('Failed to enrich comic data');
      return comic;
    } finally {
      setIsEnriching(false);
    }
  }, []);

  return {
    enrichComic,
    needsEnrichment,
    isEnriching,
    enrichmentError,
  };
}
