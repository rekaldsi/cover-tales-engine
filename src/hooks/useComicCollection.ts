import { useState, useEffect } from 'react';
import { Comic, CollectionStats, ComicEra } from '@/types/comic';

const STORAGE_KEY = 'comic-collection';

// Sample data for demo
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

export function useComicCollection() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setComics(JSON.parse(stored));
    } else {
      // Load sample data for demo
      setComics(SAMPLE_COMICS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_COMICS));
    }
    setIsLoading(false);
  }, []);

  const saveComics = (newComics: Comic[]) => {
    setComics(newComics);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newComics));
  };

  const addComic = (comic: Omit<Comic, 'id' | 'dateAdded'>) => {
    const newComic: Comic = {
      ...comic,
      id: Date.now().toString(),
      dateAdded: new Date().toISOString().split('T')[0],
    };
    saveComics([newComic, ...comics]);
    return newComic;
  };

  const updateComic = (id: string, updates: Partial<Comic>) => {
    const updated = comics.map(c => c.id === id ? { ...c, ...updates } : c);
    saveComics(updated);
  };

  const deleteComic = (id: string) => {
    saveComics(comics.filter(c => c.id !== id));
  };

  const getStats = (): CollectionStats => {
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
  };

  return {
    comics,
    isLoading,
    addComic,
    updateComic,
    deleteComic,
    getStats,
  };
}
