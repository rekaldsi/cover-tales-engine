import { useRef, useCallback } from 'react';

interface CachedResult<T> {
  issueKey: string;
  result: T;
  timestamp: number;
}

/**
 * LRU cache for scan results with time-based expiration
 * Prevents duplicate API calls during hunting session
 *
 * @param maxSize - Maximum number of entries (default: 50)
 * @param ttlMs - Time-to-live in milliseconds (default: 5 minutes)
 */
export function useScanResultCache<T = any>(maxSize = 50, ttlMs = 300000) {
  const cacheRef = useRef<Map<string, CachedResult<T>>>(new Map());

  /**
   * Get cached result if not expired
   */
  const get = useCallback((issueKey: string): T | null => {
    const cached = cacheRef.current.get(issueKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > ttlMs) {
      cacheRef.current.delete(issueKey);
      return null;
    }

    return cached.result;
  }, [ttlMs]);

  /**
   * Set result in cache with LRU eviction
   */
  const set = useCallback((issueKey: string, result: T) => {
    // LRU eviction: Remove oldest entry if at capacity
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

  /**
   * Clear all cached entries
   */
  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  /**
   * Get cache stats for debugging
   */
  const getStats = useCallback(() => {
    return {
      size: cacheRef.current.size,
      maxSize,
      ttlMs,
    };
  }, [maxSize, ttlMs]);

  return { get, set, clear, getStats };
}
