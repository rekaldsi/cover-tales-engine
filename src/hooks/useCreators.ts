import { useMemo } from 'react';
import { Comic } from '@/types/comic';

export interface Creator {
  name: string;
  role: 'writer' | 'artist' | 'coverArtist';
  comicCount: number;
  comics: Comic[];
  totalValue: number;
  keyIssueCount: number;
}

export interface CreatorAggregate {
  name: string;
  roles: ('writer' | 'artist' | 'coverArtist')[];
  comicCount: number;
  comics: Comic[];
  totalValue: number;
  keyIssueCount: number;
}

export function useCreators(comics: Comic[]) {
  const creators = useMemo(() => {
    const creatorMap = new Map<string, CreatorAggregate>();

    comics.forEach((comic) => {
      const addCreator = (name: string | undefined, role: 'writer' | 'artist' | 'coverArtist') => {
        if (!name || name.trim() === '') return;
        
        const normalizedName = name.trim();
        const existing = creatorMap.get(normalizedName);
        
        if (existing) {
          if (!existing.roles.includes(role)) {
            existing.roles.push(role);
          }
          if (!existing.comics.find(c => c.id === comic.id)) {
            existing.comics.push(comic);
            existing.comicCount++;
            existing.totalValue += comic.currentValue || 0;
            if (comic.isKeyIssue) existing.keyIssueCount++;
          }
        } else {
          creatorMap.set(normalizedName, {
            name: normalizedName,
            roles: [role],
            comicCount: 1,
            comics: [comic],
            totalValue: comic.currentValue || 0,
            keyIssueCount: comic.isKeyIssue ? 1 : 0,
          });
        }
      };

      addCreator(comic.writer, 'writer');
      addCreator(comic.artist, 'artist');
      addCreator(comic.coverArtist, 'coverArtist');
    });

    return Array.from(creatorMap.values()).sort((a, b) => b.comicCount - a.comicCount);
  }, [comics]);

  const getComicsByCreator = (creatorName: string) => {
    return comics.filter(
      (comic) =>
        comic.writer === creatorName ||
        comic.artist === creatorName ||
        comic.coverArtist === creatorName
    );
  };

  const searchCreators = (query: string) => {
    if (!query.trim()) return creators;
    const lowerQuery = query.toLowerCase();
    return creators.filter((creator) =>
      creator.name.toLowerCase().includes(lowerQuery)
    );
  };

  return {
    creators,
    getComicsByCreator,
    searchCreators,
    totalCreators: creators.length,
  };
}
