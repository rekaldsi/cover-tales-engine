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
      const { data, error } = await supabase.functions.invoke('fetch-comic-cover', {
        body: {
          title: comic.title,
          issueNumber: comic.issueNumber,
          publisher: comic.publisher,
        },
      });

      if (error) {
        console.error('Enrichment error:', error);
        setEnrichmentError('Failed to fetch comic details');
        return comic;
      }

      if (!data || data.error) {
        console.log('No enrichment data found:', data?.error);
        return comic;
      }

      // Build updates only for missing fields
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

      // Only update if we have new data
      if (Object.keys(updates).length > 0) {
        await onUpdate(comic.id, updates);
        return { ...comic, ...updates };
      }

      return comic;
    } catch (err) {
      console.error('Enrichment failed:', err);
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
