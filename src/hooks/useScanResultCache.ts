import { useCallback, useRef } from 'react';

export interface CachedScanResult {
  title: string;
  issueNumber: string;
  publisher?: string;
  variant?: string;
  coverImageUrl?: string;
  isKeyIssue: boolean;
  keyIssueReason?: string;
  rawValue?: number;
  gradedValue98?: number;
  valueRange?: { low: number; high: number };
  valueConfidence?: 'high' | 'medium' | 'low';
  confidenceScore?: number;
  verdict: 'get' | 'consider' | 'pass' | null;
  alreadyOwned: boolean;
  ownedCopyCount?: number;
}

interface CacheEntry {
  issueKey: string;
  result: CachedScanResult;
  timestamp: number;
}

/**
 * LRU cache hook for scan results during hunting sessions
 * Prevents duplicate API calls when rescanning the same comic
 */
export function useScanResultCache(maxSize = 50, ttlMs = 300000) {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const get = useCallback((issueKey: string): CachedScanResult | null => {
    const cached = cacheRef.current.get(issueKey);
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > ttlMs) {
      cacheRef.current.delete(issueKey);
      return null;
    }
    
    // Move to end for LRU ordering
    cacheRef.current.delete(issueKey);
    cacheRef.current.set(issueKey, cached);
    
    return cached.result;
  }, [ttlMs]);

  const set = useCallback((issueKey: string, result: CachedScanResult) => {
    // LRU eviction if at capacity
    if (cacheRef.current.size >= maxSize) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        cacheRef.current.delete(firstKey);
      }
    }
    
    cacheRef.current.set(issueKey, {
      issueKey,
      result,
      timestamp: Date.now(),
    });
  }, [maxSize]);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const has = useCallback((issueKey: string): boolean => {
    const cached = cacheRef.current.get(issueKey);
    if (!cached) return false;
    
    if (Date.now() - cached.timestamp > ttlMs) {
      cacheRef.current.delete(issueKey);
      return false;
    }
    
    return true;
  }, [ttlMs]);

  const size = useCallback(() => cacheRef.current.size, []);

  return { get, set, clear, has, size };
}
