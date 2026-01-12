import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Comic } from '@/types/comic';
import { useAuth } from '@/contexts/AuthContext';

const RATE_LIMIT_MS = 2000; // 2 seconds between API calls

interface EnrichmentProgress {
  total: number;
  completed: number;
  isRunning: boolean;
  currentStep?: string;
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

  // Expanded check: missing cover, creators, synopsis, or value
  const needsEnrichment = (comic: Comic): boolean => {
    const missingCover = !comic.coverImage;
    const missingCreators = !comic.writer && !comic.artist;
    const missingSynopsis = !comic.synopsis;
    const missingValue = !comic.currentValue;
    
    return missingCover || missingCreators || missingSynopsis || missingValue;
  };

  const enrichSingleComic = async (comic: Comic): Promise<boolean> => {
    let enriched = false;

    try {
      // Step 1: Cover and basic creator data from fetch-comic-cover
      if (!comic.coverImage || !comic.writer || !comic.artist) {
        setProgress(prev => ({ ...prev, currentStep: `Fetching details for ${comic.title}...` }));
        
        const { data, error } = await supabase.functions.invoke('fetch-comic-cover', {
          body: {
            title: comic.title,
            issueNumber: comic.issueNumber,
            publisher: comic.publisher,
          },
        });

        if (!error && data?.success) {
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
          // Save comicvine_id if returned for future enrichment
          if (data.comicvineId) {
            const { error: cvError } = await supabase
              .from('comics')
              .update({ comicvine_id: data.comicvineId })
              .eq('id', comic.id);
            if (cvError) logger.log('[BG] Failed to save comicvine_id:', cvError);
          }

          if (Object.keys(updates).length > 0) {
            await updateComic(comic.id, updates);
            enriched = true;
            logger.log(`[BG] Enriched cover/creators: ${comic.title} #${comic.issueNumber}`);
          }
        }
      }

      // Step 2: Credits enrichment if still missing creators
      if (!comic.writer && !comic.artist) {
        setProgress(prev => ({ ...prev, currentStep: `Looking up creators for ${comic.title}...` }));
        
        const { data: creditsData } = await supabase.functions.invoke('enrich-credits', {
          body: { comic_ids: [comic.id] }
        });

        if (creditsData?.enriched > 0) {
          enriched = true;
          logger.log(`[BG] Credits enriched: ${comic.title} #${comic.issueNumber}`);
        } else {
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
            
            if (writer || artist) {
              await updateComic(comic.id, { 
                writer: writer || comic.writer, 
                artist: artist || comic.artist 
              });
              enriched = true;
              logger.log(`[BG] GCD credits: ${comic.title} #${comic.issueNumber}`);
            }
          }
        }
      }

      // Step 3: Value aggregation if missing
      if (!comic.currentValue) {
        setProgress(prev => ({ ...prev, currentStep: `Fetching value for ${comic.title}...` }));
        
        const gradeForPricing = comic.gradeStatus === 'raw' 
          ? (comic.estimatedRawGrade || '5.0') 
          : comic.grade;

        const { data: valueData } = await supabase.functions.invoke('aggregate-comic-data', {
          body: {
            title: comic.title,
            issue_number: comic.issueNumber,
            publisher: comic.publisher,
            grade: gradeForPricing,
            grade_status: comic.gradeStatus,
            comic_id: comic.id,
            sources: ['gocollect', 'ebay']
          }
        });

        if (valueData?.recommended_value) {
          await updateComic(comic.id, { currentValue: valueData.recommended_value });
          enriched = true;
          logger.log(`[BG] Value enriched: ${comic.title} = $${valueData.recommended_value}`);
        }
      }

      return enriched;
    } catch (err) {
      logger.error(`[BG] Failed to enrich ${comic.title}:`, err);
      return false;
    }
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const runBackgroundEnrichment = useCallback(async () => {
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
      currentStep: 'Starting enrichment...',
    });

    logger.log(`[BG] Starting enrichment for ${comicsToEnrich.length} comics`);

    for (let i = 0; i < comicsToEnrich.length; i++) {
      const comic = comicsToEnrich[i];
      
      await enrichSingleComic(comic);
      
      setProgress(prev => ({
        ...prev,
        completed: i + 1,
      }));

      // Rate limit between comics
      if (i < comicsToEnrich.length - 1) {
        await sleep(RATE_LIMIT_MS);
      }
    }

    setProgress(prev => ({
      ...prev,
      isRunning: false,
      currentStep: undefined,
    }));
    
    isProcessingRef.current = false;
    logger.log('[BG] Enrichment complete');
  }, [comics, user, updateComic]);

  // Auto-start enrichment when comics load
  useEffect(() => {
    if (comics.length > 0 && user && !hasRunRef.current) {
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
