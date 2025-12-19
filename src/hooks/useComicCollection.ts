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
  };
}

export function useComicCollection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comics, setComics] = useState<Comic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    // Auto-fetch value if not already set
    let comicWithValue = { ...comic };
    if (!comic.currentValue && comic.title) {
      try {
        const { data: valueData } = await supabase.functions.invoke('fetch-gocollect-value', {
          body: {
            title: comic.title,
            issueNumber: comic.issueNumber,
            publisher: comic.publisher,
          }
        });

        if (valueData?.success) {
          // Use raw value estimate (VG/FN grade ~4.0-6.0)
          const rawValue = valueData.fmv?.['4.0'] || valueData.fmv?.['2.0'] || valueData.fmv?.['6.0'];
          if (rawValue) {
            comicWithValue.currentValue = rawValue;
            console.log('Auto-fetched value:', rawValue);
          }
        }
      } catch (err) {
        console.log('Value lookup failed, continuing without value');
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
          const { data: enrichData } = await supabase.functions.invoke('fetch-comic-cover', {
            body: {
              title: newComic.title,
              issueNumber: newComic.issueNumber,
              publisher: newComic.publisher,
            }
          });
          
          if (enrichData?.success) {
            const dbUpdates: Record<string, any> = {};
            if (enrichData.writer) dbUpdates.writer = enrichData.writer;
            if (enrichData.artist) dbUpdates.artist = enrichData.artist;
            if (enrichData.coverArtist) dbUpdates.cover_artist = enrichData.coverArtist;
            if (enrichData.coverDate) dbUpdates.cover_date = enrichData.coverDate;
            if (enrichData.isKeyIssue !== undefined) dbUpdates.is_key_issue = enrichData.isKeyIssue;
            if (enrichData.keyIssueReason) dbUpdates.key_issue_reason = enrichData.keyIssueReason;
            
            if (Object.keys(dbUpdates).length > 0) {
              await supabase.from('comics').update(dbUpdates).eq('id', newComic.id);
              // Update local state
              setComics(prev => prev.map(c => 
                c.id === newComic.id 
                  ? { 
                      ...c, 
                      writer: enrichData.writer || c.writer,
                      artist: enrichData.artist || c.artist,
                      coverArtist: enrichData.coverArtist || c.coverArtist,
                      coverDate: enrichData.coverDate || c.coverDate,
                      isKeyIssue: enrichData.isKeyIssue ?? c.isKeyIssue,
                      keyIssueReason: enrichData.keyIssueReason || c.keyIssueReason,
                    } 
                  : c
              ));
            }
          }
        } catch (err) {
          console.log('Background enrichment failed:', err);
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
  };
}
