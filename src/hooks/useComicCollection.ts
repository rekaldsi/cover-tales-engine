import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Comic, CollectionStats, ComicEra, getEraFromDate } from '@/types/comic';

const STORAGE_KEY = 'comic-collection';

// Sample data for demo (used when not authenticated)
const SAMPLE_COMICS: Comic[] = [
  {
    id: '1',
    title: 'Amazing Spider-Man',
    issueNumber: '300',
    volume: 1,
    coverDate: '1988-05-01',
    publisher: 'Marvel Comics',
    variant: 'Newsstand',
    era: 'copper',
    writer: 'David Michelinie',
    artist: 'Todd McFarlane',
    coverArtist: 'Todd McFarlane',
    gradeStatus: 'cgc',
    grade: '9.4',
    certNumber: '1234567890',
    purchasePrice: 450,
    currentValue: 1200,
    dateAdded: '2024-01-15',
    isKeyIssue: true,
    keyIssueReason: '1st Full Appearance of Venom',
  },
  {
    id: '2',
    title: 'Uncanny X-Men',
    issueNumber: '266',
    volume: 1,
    coverDate: '1990-08-01',
    publisher: 'Marvel Comics',
    era: 'copper',
    writer: 'Chris Claremont',
    artist: 'Mike Collins',
    coverArtist: 'Andy Kubert',
    gradeStatus: 'raw',
    purchasePrice: 75,
    currentValue: 350,
    dateAdded: '2024-02-20',
    isKeyIssue: true,
    keyIssueReason: '1st Appearance of Gambit',
  },
  {
    id: '3',
    title: 'Batman',
    issueNumber: '423',
    volume: 1,
    coverDate: '1988-09-01',
    publisher: 'DC Comics',
    era: 'copper',
    writer: 'Jim Starlin',
    artist: 'Dave Cockrum',
    coverArtist: 'Todd McFarlane',
    gradeStatus: 'cgc',
    grade: '9.8',
    certNumber: '9876543210',
    purchasePrice: 200,
    currentValue: 800,
    dateAdded: '2024-03-05',
    isKeyIssue: true,
    keyIssueReason: 'Classic Todd McFarlane Cover',
  },
  {
    id: '4',
    title: 'Saga',
    issueNumber: '1',
    volume: 1,
    coverDate: '2012-03-14',
    publisher: 'Image Comics',
    era: 'current',
    writer: 'Brian K. Vaughan',
    artist: 'Fiona Staples',
    coverArtist: 'Fiona Staples',
    gradeStatus: 'cgc',
    grade: '9.6',
    purchasePrice: 150,
    currentValue: 400,
    dateAdded: '2024-03-10',
    isKeyIssue: true,
    keyIssueReason: '1st Issue of Award-Winning Series',
  },
  {
    id: '5',
    title: 'New Mutants',
    issueNumber: '98',
    volume: 1,
    coverDate: '1991-02-01',
    publisher: 'Marvel Comics',
    era: 'copper',
    writer: 'Rob Liefeld & Fabian Nicieza',
    artist: 'Rob Liefeld',
    coverArtist: 'Rob Liefeld',
    gradeStatus: 'cgc',
    grade: '9.2',
    certNumber: '5555555555',
    purchasePrice: 600,
    currentValue: 1500,
    dateAdded: '2024-03-15',
    isKeyIssue: true,
    keyIssueReason: '1st Appearance of Deadpool',
  },
];

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
  };
}

export function useComicCollection() {
  const { user } = useAuth();
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
      // Use localStorage for demo
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setComics(JSON.parse(stored));
      } else {
        setComics(SAMPLE_COMICS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_COMICS));
      }
    }
    
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchComics();
  }, [fetchComics]);

  const addComic = useCallback(async (comic: Omit<Comic, 'id' | 'dateAdded'>) => {
    if (user) {
      // Add to Supabase
      const { data, error } = await supabase
        .from('comics')
        .insert(mapComicToDb(comic, user.id))
        .select()
        .single();

      if (error) {
        console.error('Error adding comic:', error);
        throw error;
      }

      const newComic = mapDbToComic(data);
      setComics(prev => [newComic, ...prev]);
      return newComic;
    } else {
      // Add to localStorage
      const newComic: Comic = {
        ...comic,
        id: Date.now().toString(),
        dateAdded: new Date().toISOString().split('T')[0],
      };
      const updated = [newComic, ...comics];
      setComics(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return newComic;
    }
  }, [user, comics]);

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
