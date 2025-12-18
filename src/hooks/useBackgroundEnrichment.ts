import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Comic } from '@/types/comic';
import { useAuth } from '@/contexts/AuthContext';

const RATE_LIMIT_MS = 2000; // 2 seconds between API calls
const MAX_CONCURRENT = 1; // Process one at a time

interface EnrichmentProgress {
  total: number;
  completed: number;
  isRunning: boolean;
}

export function useBackgroundEnrichment(
  comics: Comic[],
  updateComic: (id: string, updates: Partial<Comic>) => Promise<void>
) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<EnrichmentProgress>({
    total: 0,
    completed: 0,
    isRunning: false,
  });
  const isProcessingRef = useRef(false);
  const hasRunRef = useRef(false);

  const needsEnrichment = (comic: Comic): boolean => {
    return !comic.coverImage || !comic.writer || !comic.artist;
  };

  const enrichSingleComic = async (comic: Comic): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-comic-cover', {
        body: {
          title: comic.title,
          issueNumber: comic.issueNumber,
          publisher: comic.publisher,
        },
      });

      if (error || !data || data.error) {
        console.log(`Enrichment skipped for ${comic.title} #${comic.issueNumber}:`, error || data?.error);
        return false;
      }

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

      if (Object.keys(updates).length > 0) {
        await updateComic(comic.id, updates);
        console.log(`Enriched: ${comic.title} #${comic.issueNumber}`);
        return true;
      }

      return false;
    } catch (err) {
      console.error(`Failed to enrich ${comic.title}:`, err);
      return false;
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runBackgroundEnrichment = useCallback(async () => {
    // Only run for authenticated users
    if (!user || isProcessingRef.current || hasRunRef.current) return;
    
    const comicsToEnrich = comics.filter(needsEnrichment);
    
    if (comicsToEnrich.length === 0) {
      hasRunRef.current = true;
      return;
    }

    isProcessingRef.current = true;
    hasRunRef.current = true;
    
    setProgress({
      total: comicsToEnrich.length,
      completed: 0,
      isRunning: true,
    });

    console.log(`Starting background enrichment for ${comicsToEnrich.length} comics`);

    for (let i = 0; i < comicsToEnrich.length; i++) {
      const comic = comicsToEnrich[i];
      
      await enrichSingleComic(comic);
      
      setProgress(prev => ({
        ...prev,
        completed: i + 1,
      }));

      // Rate limit: wait between API calls
      if (i < comicsToEnrich.length - 1) {
        await sleep(RATE_LIMIT_MS);
      }
    }

    setProgress(prev => ({
      ...prev,
      isRunning: false,
    }));
    
    isProcessingRef.current = false;
    console.log('Background enrichment complete');
  }, [comics, user, updateComic]);

  // Auto-start enrichment when comics load
  useEffect(() => {
    if (comics.length > 0 && user && !hasRunRef.current) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => {
        runBackgroundEnrichment();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [comics.length, user, runBackgroundEnrichment]);

  return {
    progress,
    isEnriching: progress.isRunning,
  };
}
