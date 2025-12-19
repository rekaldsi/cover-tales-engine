import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Comic, CollectionStats, ComicEra, getEraFromDate } from '@/types/comic';

const STORAGE_KEY = 'comic-collection-v4';

// Map database row to Comic type
function mapDbToComic(row: any): Comic {
  return {
    id: row.id,
    title: row.title,
    issueNumber: row.issue_number || '',
    volume: row.volume ? parseInt(row.volume) : undefined,
    coverDate: row.cover_date,
    publisher: row.publisher,
    variant: row.variant_type,
    coverImage: row.cover_image_url,
    era: row.era || 'current',
    writer: row.writer,
    artist: row.artist,
    coverArtist: row.cover_artist,
    gradeStatus: row.grade_status || 'raw',
    grade: row.grade?.toString(),
    certNumber: row.cert_number,
    purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : undefined,
    currentValue: row.current_value ? parseFloat(row.current_value) : undefined,
    dateAdded: row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    location: row.location,
    notes: row.notes,
    isKeyIssue: row.is_key_issue || false,
    keyIssueReason: row.key_issue_reason,
    // Signature fields
    isSigned: row.is_signed || false,
    signedBy: row.signed_by,
    signedDate: row.signed_date,
    signatureType: row.signature_type,
    // Enhanced data
    firstAppearanceOf: row.first_appearance_of,
    characters: row.characters,
    mediaTieIn: row.media_tie_in,
    // Grading details
    labelType: row.label_type,
    pageQuality: row.page_quality,
    graderNotes: row.grader_notes,
    gradedDate: row.graded_date,
    innerWellNotes: row.inner_well_notes,
    // AI condition analysis
    estimatedRawGrade: row.estimated_raw_grade,
    conditionNotes: row.condition_notes,
    visibleDefects: row.visible_defects,
    conditionConfidence: row.condition_confidence,
  };
}

// Map Comic to database row
function mapComicToDb(comic: Omit<Comic, 'id' | 'dateAdded'>, userId: string) {
  return {
    user_id: userId,
    title: comic.title,
    issue_number: comic.issueNumber,
    volume: comic.volume?.toString(),
    cover_date: comic.coverDate || null,
    publisher: comic.publisher,
    variant_type: comic.variant,
    cover_image_url: comic.coverImage,
    era: comic.era || getEraFromDate(comic.coverDate),
    writer: comic.writer,
    artist: comic.artist,
    cover_artist: comic.coverArtist,
    grade_status: comic.gradeStatus || 'raw',
    grade: comic.grade ? parseFloat(comic.grade) : null,
    cert_number: comic.certNumber,
    purchase_price: comic.purchasePrice,
    current_value: comic.currentValue,
    location: comic.location,
    notes: comic.notes,
    is_key_issue: comic.isKeyIssue || false,
    key_issue_reason: comic.keyIssueReason,
    // Signature fields
    is_signed: comic.isSigned || false,
    signed_by: comic.signedBy,
    signed_date: comic.signedDate,
    signature_type: comic.signatureType,
    // Enhanced data
    first_appearance_of: comic.firstAppearanceOf,
    characters: comic.characters,
    media_tie_in: comic.mediaTieIn,
    // Grading details
    label_type: comic.labelType,
    page_quality: comic.pageQuality,
    grader_notes: comic.graderNotes,
    graded_date: comic.gradedDate,
    inner_well_notes: comic.innerWellNotes,
    // AI condition analysis
    estimated_raw_grade: comic.estimatedRawGrade,
    condition_notes: comic.conditionNotes,
    visible_defects: comic.visibleDefects,
    condition_confidence: comic.conditionConfidence,
  };
}

export function useComicCollection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comics, setComics] = useState<Comic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingValues, setIsRefreshingValues] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState({ current: 0, total: 0 });

  // Fetch comics from Supabase or localStorage
  const fetchComics = useCallback(async () => {
    setIsLoading(true);
    
    if (user) {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('comics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comics:', error);
        setComics([]);
      } else {
        setComics((data || []).map(mapDbToComic));
      }
    } else {
      // Not authenticated - show empty state, no demo data
      setComics([]);
    }
    
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchComics();
  }, [fetchComics]);

  // Backfill values for comics that don't have a currentValue
  // Uses tiered fallback: GoCollect -> eBay -> ComicsPriceGuide
  const backfillValues = useCallback(async (comicsToUpdate: Comic[]) => {
    const comicsWithoutValue = comicsToUpdate.filter(c => c.currentValue === undefined || c.currentValue === null);
    
    if (comicsWithoutValue.length === 0) return;
    
    console.log(`Backfilling values for ${comicsWithoutValue.length} comics...`);
    
    for (const comic of comicsWithoutValue) {
      try {
        // Use estimated raw grade or default to 5.0 (VG/FN)
        const gradeForPricing = comic.gradeStatus === 'raw' 
          ? (comic.estimatedRawGrade || '5.0') 
          : comic.grade;
        
        let rawValue: number | null = null;
        let valueSource = '';
        
        // Tier 1: Try GoCollect
        console.log(`[Backfill] Trying GoCollect for ${comic.title} #${comic.issueNumber}`);
        const { data: goCollectData } = await supabase.functions.invoke('fetch-gocollect-value', {
          body: {
            title: comic.title,
            issue_number: comic.issueNumber,
            publisher: comic.publisher,
            grade: gradeForPricing,
          }
        });

        if (goCollectData?.success && goCollectData.fmv) {
          rawValue = goCollectData.fmv.raw || goCollectData.fmv[gradeForPricing] || goCollectData.fmv['8.0'] || goCollectData.fmv['9.0'];
          valueSource = 'gocollect';
        }
        
        // Tier 2: Try eBay if GoCollect failed
        if (!rawValue) {
          console.log(`[Backfill] Trying eBay for ${comic.title} #${comic.issueNumber}`);
          const { data: ebayData } = await supabase.functions.invoke('fetch-ebay-prices', {
            body: {
              title: comic.title,
              issueNumber: comic.issueNumber,
              publisher: comic.publisher,
              grade: gradeForPricing,
              gradeStatus: comic.gradeStatus,
            }
          });
          
          if (ebayData?.success && ebayData.listingCount > 0) {
            rawValue = ebayData.estimatedSoldPrice || ebayData.averageAskingPrice;
            valueSource = 'ebay';
          }
        }
        
        // Tier 3: Try ComicsPriceGuide if others failed
        if (!rawValue) {
          console.log(`[Backfill] Trying CPG for ${comic.title} #${comic.issueNumber}`);
          const { data: cpgData } = await supabase.functions.invoke('fetch-cpg-value', {
            body: {
              title: comic.title,
              issueNumber: comic.issueNumber,
              publisher: comic.publisher,
              grade: gradeForPricing,
            }
          });
          
          if (cpgData?.success && cpgData.fmv?.current) {
            rawValue = cpgData.fmv.current;
            valueSource = 'cpg';
          }
        }
        
        if (rawValue) {
          // Update in database
          await supabase.from('comics').update({ current_value: rawValue }).eq('id', comic.id);
          // Update local state
          setComics(prev => prev.map(c => c.id === comic.id ? { ...c, currentValue: rawValue! } : c));
          console.log(`Backfilled value for ${comic.title} #${comic.issueNumber}: $${rawValue} (source: ${valueSource})`);
        }
      } catch (err) {
        console.log(`Failed to backfill value for ${comic.title}:`, err);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }, []);

  // Manual refresh all values with tiered fallback
  const refreshAllValues = useCallback(async () => {
    if (!user || comics.length === 0) return;
    
    setIsRefreshingValues(true);
    setRefreshProgress({ current: 0, total: comics.length });
    
    let updatedCount = 0;
    
    for (let i = 0; i < comics.length; i++) {
      const comic = comics[i];
      setRefreshProgress({ current: i + 1, total: comics.length });
      
      try {
        // Use estimated raw grade or default to 5.0 (VG/FN)
        const gradeForPricing = comic.gradeStatus === 'raw' 
          ? (comic.estimatedRawGrade || '5.0') 
          : comic.grade;
        
        let rawValue: number | null = null;
        let valueSource = '';
        
        // Tier 1: Try GoCollect
        const { data: goCollectData } = await supabase.functions.invoke('fetch-gocollect-value', {
          body: {
            title: comic.title,
            issue_number: comic.issueNumber,
            publisher: comic.publisher,
            grade: gradeForPricing,
          }
        });

        if (goCollectData?.success && goCollectData.fmv) {
          rawValue = goCollectData.fmv.raw || goCollectData.fmv[gradeForPricing] || goCollectData.fmv['8.0'] || goCollectData.fmv['9.0'];
          valueSource = 'gocollect';
        }
        
        // Tier 2: Try eBay if GoCollect failed
        if (!rawValue) {
          const { data: ebayData } = await supabase.functions.invoke('fetch-ebay-prices', {
            body: {
              title: comic.title,
              issueNumber: comic.issueNumber,
              publisher: comic.publisher,
              grade: gradeForPricing,
              gradeStatus: comic.gradeStatus,
            }
          });
          
          if (ebayData?.success && ebayData.listingCount > 0) {
            rawValue = ebayData.estimatedSoldPrice || ebayData.averageAskingPrice;
            valueSource = 'ebay';
          }
        }
        
        // Tier 3: Try ComicsPriceGuide if others failed
        if (!rawValue) {
          const { data: cpgData } = await supabase.functions.invoke('fetch-cpg-value', {
            body: {
              title: comic.title,
              issueNumber: comic.issueNumber,
              publisher: comic.publisher,
              grade: gradeForPricing,
            }
          });
          
          if (cpgData?.success && cpgData.fmv?.current) {
            rawValue = cpgData.fmv.current;
            valueSource = 'cpg';
          }
        }

        if (rawValue && rawValue !== comic.currentValue) {
          // Update in database
          await supabase.from('comics').update({ current_value: rawValue }).eq('id', comic.id);
          // Update local state
          setComics(prev => prev.map(c => c.id === comic.id ? { ...c, currentValue: rawValue! } : c));
          updatedCount++;
          console.log(`Updated value for ${comic.title} #${comic.issueNumber}: $${rawValue} (source: ${valueSource})`);
        }
      } catch (err) {
        console.log(`Failed to refresh value for ${comic.title}:`, err);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRefreshingValues(false);
    toast({
      title: 'Values Refreshed',
      description: `Updated ${updatedCount} of ${comics.length} comics with current market values.`,
    });
  }, [user, comics, toast]);

  // Manual refresh enrichment (ComicVine data)
  const refreshAllDetails = useCallback(async () => {
    if (!user || comics.length === 0) return;
    
    // Only refresh comics missing creator data
    const needsEnrichment = comics.filter(c => !c.writer && !c.artist);
    
    if (needsEnrichment.length === 0) {
      toast({
        title: 'All Details Complete',
        description: 'All comics already have creator information.',
      });
      return;
    }
    
    setIsRefreshingValues(true);
    setRefreshProgress({ current: 0, total: needsEnrichment.length });
    
    let updatedCount = 0;
    
    for (let i = 0; i < needsEnrichment.length; i++) {
      const comic = needsEnrichment[i];
      setRefreshProgress({ current: i + 1, total: needsEnrichment.length });
      
      try {
        console.log(`[Detail Refresh] Fetching for ${comic.title} #${comic.issueNumber}`);
        
        const { data: enrichData } = await supabase.functions.invoke('fetch-comic-cover', {
          body: {
            title: comic.title,
            issueNumber: comic.issueNumber,
            publisher: comic.publisher,
          }
        });

        if (enrichData?.success) {
          const dbUpdates: Record<string, any> = {};
          if (enrichData.coverImageUrl && !comic.coverImage) dbUpdates.cover_image_url = enrichData.coverImageUrl;
          if (enrichData.writer) dbUpdates.writer = enrichData.writer;
          if (enrichData.artist) dbUpdates.artist = enrichData.artist;
          if (enrichData.coverArtist) dbUpdates.cover_artist = enrichData.coverArtist;
          if (enrichData.coverDate && !comic.coverDate) dbUpdates.cover_date = enrichData.coverDate;
          
          if (Object.keys(dbUpdates).length > 0) {
            await supabase.from('comics').update(dbUpdates).eq('id', comic.id);
            
            setComics(prev => prev.map(c => 
              c.id === comic.id 
                ? { 
                    ...c, 
                    coverImage: enrichData.coverImageUrl || c.coverImage,
                    writer: enrichData.writer || c.writer,
                    artist: enrichData.artist || c.artist,
                    coverArtist: enrichData.coverArtist || c.coverArtist,
                    coverDate: enrichData.coverDate || c.coverDate,
                  } 
                : c
            ));
            updatedCount++;
            console.log(`[Detail Refresh] Updated ${comic.title} #${comic.issueNumber}`);
          }
        }
      } catch (err) {
        console.log(`Failed to refresh details for ${comic.title}:`, err);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    setIsRefreshingValues(false);
    toast({
      title: 'Details Refreshed',
      description: `Updated ${updatedCount} of ${needsEnrichment.length} comics with creator details.`,
    });
  }, [user, comics, toast]);

  // Trigger backfill once comics are loaded
  useEffect(() => {
    if (!isLoading && comics.length > 0 && user) {
      backfillValues(comics);
    }
  }, [isLoading, comics.length, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const addComic = useCallback(async (comic: Omit<Comic, 'id' | 'dateAdded'>) => {
    if (!user) {
      // User is not authenticated - show error and don't save
      console.error('addComic called without authenticated user - data will NOT be saved!');
      toast({
        title: 'Login Required',
        description: 'Please log in to save comics to your collection.',
        variant: 'destructive',
      });
      throw new Error('Authentication required to save comics');
    }

    // Auto-fetch value if not already set - using tiered fallback
    let comicWithValue = { ...comic };
    if (!comic.currentValue && comic.title) {
      try {
        // Use estimated raw grade or default to 5.0 (VG/FN)
        const gradeForPricing = comic.gradeStatus === 'raw' 
          ? (comic.estimatedRawGrade || '5.0') 
          : comic.grade;
        
        let rawValue: number | null = null;
        
        // Tier 1: Try GoCollect
        console.log(`[AddComic] Trying GoCollect for ${comic.title} #${comic.issueNumber}`);
        const { data: goCollectData } = await supabase.functions.invoke('fetch-gocollect-value', {
          body: {
            title: comic.title,
            issue_number: comic.issueNumber,
            publisher: comic.publisher,
            grade: gradeForPricing,
          }
        });

        if (goCollectData?.success && goCollectData.fmv) {
          rawValue = goCollectData.fmv.raw || goCollectData.fmv[gradeForPricing] || goCollectData.fmv['8.0'] || goCollectData.fmv['9.0'];
          if (rawValue) console.log(`[AddComic] GoCollect value: $${rawValue}`);
        }
        
        // Tier 2: Try eBay if GoCollect failed
        if (!rawValue) {
          console.log(`[AddComic] Trying eBay for ${comic.title} #${comic.issueNumber}`);
          const { data: ebayData } = await supabase.functions.invoke('fetch-ebay-prices', {
            body: {
              title: comic.title,
              issueNumber: comic.issueNumber,
              publisher: comic.publisher,
              grade: gradeForPricing,
              gradeStatus: comic.gradeStatus,
            }
          });
          
          if (ebayData?.success && ebayData.listingCount > 0) {
            rawValue = ebayData.estimatedSoldPrice || ebayData.averageAskingPrice;
            if (rawValue) console.log(`[AddComic] eBay value: $${rawValue}`);
          }
        }
        
        // Tier 3: Try ComicsPriceGuide if others failed
        if (!rawValue) {
          console.log(`[AddComic] Trying CPG for ${comic.title} #${comic.issueNumber}`);
          const { data: cpgData } = await supabase.functions.invoke('fetch-cpg-value', {
            body: {
              title: comic.title,
              issueNumber: comic.issueNumber,
              publisher: comic.publisher,
              grade: gradeForPricing,
            }
          });
          
          if (cpgData?.success && cpgData.fmv?.current) {
            rawValue = cpgData.fmv.current;
            if (rawValue) console.log(`[AddComic] CPG value: $${rawValue}`);
          }
        }
        
        if (rawValue) {
          comicWithValue.currentValue = rawValue;
          console.log('Auto-fetched value for', comic.title, ':', rawValue);
        } else {
          console.log('No value found from any source');
        }
      } catch (err) {
        console.log('Value lookup failed:', err);
      }
    }

    // Add to Supabase
    const { data, error } = await supabase
      .from('comics')
      .insert(mapComicToDb(comicWithValue, user.id))
      .select()
      .single();

    if (error) {
      console.error('Error adding comic to database:', error);
      toast({
        title: 'Save Failed',
        description: `Could not save comic: ${error.message}`,
        variant: 'destructive',
      });
      throw error;
    }

    const newComic = mapDbToComic(data);
    setComics(prev => [newComic, ...prev]);
    
    // Background enrichment - fetch creator details if missing
    // Done asynchronously after returning to avoid blocking
    if (!newComic.writer && !newComic.artist) {
      setTimeout(async () => {
        try {
          console.log(`[BG Enrichment] Fetching for ${newComic.title} #${newComic.issueNumber}`);
          
          const { data: enrichData, error: enrichError } = await supabase.functions.invoke('fetch-comic-cover', {
            body: {
              title: newComic.title,
              issueNumber: newComic.issueNumber,
              publisher: newComic.publisher,
            }
          });
          
          if (enrichError) {
            console.log('[BG Enrichment] Error:', enrichError);
            return;
          }
          
          console.log('[BG Enrichment] Response:', enrichData);
          
          if (enrichData?.success) {
            const dbUpdates: Record<string, any> = {};
            // Note: API returns coverImageUrl, map to cover_image_url for DB
            if (enrichData.coverImageUrl) dbUpdates.cover_image_url = enrichData.coverImageUrl;
            if (enrichData.writer) dbUpdates.writer = enrichData.writer;
            if (enrichData.artist) dbUpdates.artist = enrichData.artist;
            if (enrichData.coverArtist) dbUpdates.cover_artist = enrichData.coverArtist;
            if (enrichData.coverDate) dbUpdates.cover_date = enrichData.coverDate;
            if (enrichData.isKeyIssue !== undefined) dbUpdates.is_key_issue = enrichData.isKeyIssue;
            if (enrichData.keyIssueReason) dbUpdates.key_issue_reason = enrichData.keyIssueReason;
            
            console.log('[BG Enrichment] DB updates:', dbUpdates);
            
            if (Object.keys(dbUpdates).length > 0) {
              const { error: updateError } = await supabase.from('comics').update(dbUpdates).eq('id', newComic.id);
              
              if (updateError) {
                console.log('[BG Enrichment] Update error:', updateError);
                return;
              }
              
              // Update local state - map API response to Comic type
              setComics(prev => prev.map(c => 
                c.id === newComic.id 
                  ? { 
                      ...c, 
                      coverImage: enrichData.coverImageUrl || c.coverImage,
                      writer: enrichData.writer || c.writer,
                      artist: enrichData.artist || c.artist,
                      coverArtist: enrichData.coverArtist || c.coverArtist,
                      coverDate: enrichData.coverDate || c.coverDate,
                      isKeyIssue: enrichData.isKeyIssue ?? c.isKeyIssue,
                      keyIssueReason: enrichData.keyIssueReason || c.keyIssueReason,
                    } 
                  : c
              ));
              
              console.log('[BG Enrichment] Successfully updated comic');
            }
          }
        } catch (err) {
          console.log('[BG Enrichment] Failed:', err);
        }
      }, 100);
    }
    
    return newComic;
  }, [user, toast]);

  const updateComic = useCallback(async (id: string, updates: Partial<Comic>) => {
    if (user) {
      // Update in Supabase - handle all possible fields
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.issueNumber !== undefined) dbUpdates.issue_number = updates.issueNumber;
      if (updates.publisher !== undefined) dbUpdates.publisher = updates.publisher;
      if (updates.currentValue !== undefined) dbUpdates.current_value = updates.currentValue;
      if (updates.gradeStatus !== undefined) dbUpdates.grade_status = updates.gradeStatus;
      if (updates.grade !== undefined) dbUpdates.grade = parseFloat(updates.grade);
      if (updates.isKeyIssue !== undefined) dbUpdates.is_key_issue = updates.isKeyIssue;
      if (updates.keyIssueReason !== undefined) dbUpdates.key_issue_reason = updates.keyIssueReason;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      // ComicVine enrichment fields
      if (updates.coverImage !== undefined) dbUpdates.cover_image_url = updates.coverImage;
      if (updates.writer !== undefined) dbUpdates.writer = updates.writer;
      if (updates.artist !== undefined) dbUpdates.artist = updates.artist;
      if (updates.coverArtist !== undefined) dbUpdates.cover_artist = updates.coverArtist;
      if (updates.coverDate !== undefined) dbUpdates.cover_date = updates.coverDate;
      // Signature fields
      if (updates.isSigned !== undefined) dbUpdates.is_signed = updates.isSigned;
      if (updates.signedBy !== undefined) dbUpdates.signed_by = updates.signedBy;
      if (updates.signedDate !== undefined) dbUpdates.signed_date = updates.signedDate;
      if (updates.signatureType !== undefined) dbUpdates.signature_type = updates.signatureType;
      // Enhanced data
      if (updates.firstAppearanceOf !== undefined) dbUpdates.first_appearance_of = updates.firstAppearanceOf;
      if (updates.characters !== undefined) dbUpdates.characters = updates.characters;
      if (updates.mediaTieIn !== undefined) dbUpdates.media_tie_in = updates.mediaTieIn;
      // Grading details
      if (updates.labelType !== undefined) dbUpdates.label_type = updates.labelType;
      if (updates.pageQuality !== undefined) dbUpdates.page_quality = updates.pageQuality;
      if (updates.graderNotes !== undefined) dbUpdates.grader_notes = updates.graderNotes;
      if (updates.gradedDate !== undefined) dbUpdates.graded_date = updates.gradedDate;
      if (updates.innerWellNotes !== undefined) dbUpdates.inner_well_notes = updates.innerWellNotes;

      const { error } = await supabase
        .from('comics')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('Error updating comic:', error);
        throw error;
      }
    }

    // Update local state
    setComics(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    
    if (!user) {
      const updated = comics.map(c => c.id === id ? { ...c, ...updates } : c);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }, [user, comics]);

  const deleteComic = useCallback(async (id: string) => {
    if (user) {
      // Delete from Supabase
      const { error } = await supabase
        .from('comics')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting comic:', error);
        throw error;
      }
    }

    // Update local state
    setComics(prev => prev.filter(c => c.id !== id));
    
    if (!user) {
      const updated = comics.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  }, [user, comics]);

  const getStats = useCallback((): CollectionStats => {
    const byEra = comics.reduce((acc, comic) => {
      acc[comic.era] = (acc[comic.era] || 0) + 1;
      return acc;
    }, {} as Record<ComicEra, number>);

    const byPublisher = comics.reduce((acc, comic) => {
      acc[comic.publisher] = (acc[comic.publisher] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalValue = comics.reduce((sum, c) => sum + (c.currentValue || 0), 0);

    const recentlyAdded = [...comics]
      .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
      .slice(0, 5);

    return {
      totalComics: comics.length,
      totalValue,
      byEra,
      byPublisher,
      recentlyAdded,
    };
  }, [comics]);

  return {
    comics,
    isLoading,
    addComic,
    updateComic,
    deleteComic,
    getStats,
    refetch: fetchComics,
    refreshAllValues,
    refreshAllDetails,
    isRefreshingValues,
    refreshProgress,
  };
}
