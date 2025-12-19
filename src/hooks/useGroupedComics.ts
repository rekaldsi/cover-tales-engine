import { useMemo } from 'react';
import { Comic } from '@/types/comic';

export interface ComicGroup {
  key: string;
  title: string;
  issueNumber: string;
  publisher: string;
  variant?: string;
  coverImage?: string;
  copies: Comic[];
  totalValue: number;
  highestValueCopy: Comic;
  hasGraded: boolean;
  hasSigned: boolean;
  hasRaw: boolean;
}

/**
 * Generate a unique key for grouping comics by issue
 * Groups by title + issue number + publisher (variants are kept separate)
 */
export function getIssueKey(comic: Comic): string {
  const normalizedTitle = comic.title.toLowerCase().trim();
  const normalizedIssue = comic.issueNumber.trim();
  const normalizedPublisher = (comic.publisher || '').toLowerCase().trim();
  const normalizedVariant = (comic.variant || '').toLowerCase().trim();
  
  return `${normalizedTitle}|${normalizedIssue}|${normalizedPublisher}|${normalizedVariant}`;
}

/**
 * Hook to get comics grouped by issue
 */
export function useGroupedComics(comics: Comic[]) {
  const groupedComics = useMemo(() => {
    const groups = new Map<string, Comic[]>();
    
    for (const comic of comics) {
      const key = getIssueKey(comic);
      const existing = groups.get(key) || [];
      existing.push(comic);
      groups.set(key, existing);
    }
    
    // Convert to ComicGroup array
    const result: ComicGroup[] = [];
    
    for (const [key, copies] of groups.entries()) {
      // Sort copies by value (highest first)
      const sortedCopies = [...copies].sort(
        (a, b) => (b.currentValue || 0) - (a.currentValue || 0)
      );
      
      const highestValueCopy = sortedCopies[0];
      const totalValue = copies.reduce((sum, c) => sum + (c.currentValue || 0), 0);
      
      result.push({
        key,
        title: highestValueCopy.title,
        issueNumber: highestValueCopy.issueNumber,
        publisher: highestValueCopy.publisher,
        variant: highestValueCopy.variant,
        coverImage: highestValueCopy.coverImage,
        copies: sortedCopies,
        totalValue,
        highestValueCopy,
        hasGraded: copies.some(c => c.gradeStatus !== 'raw'),
        hasSigned: copies.some(c => c.isSigned),
        hasRaw: copies.some(c => c.gradeStatus === 'raw'),
      });
    }
    
    return result;
  }, [comics]);
  
  // Count of issues with multiple copies
  const duplicateCount = useMemo(() => {
    return groupedComics.filter(g => g.copies.length > 1).length;
  }, [groupedComics]);
  
  return {
    groupedComics,
    duplicateCount,
    totalGroups: groupedComics.length,
  };
}
