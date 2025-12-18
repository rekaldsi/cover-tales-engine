import { useState, useEffect, useCallback } from 'react';

interface RecentScan {
  id: string;
  title: string;
  issueNumber: string;
  publisher: string;
  coverImageUrl?: string;
  timestamp: number;
}

const STORAGE_KEY = 'comic_recent_scans';
const MAX_RECENT = 5;

export function useRecentScans() {
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RecentScan[];
        // Filter out old entries (older than 7 days)
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const valid = parsed.filter(s => s.timestamp > cutoff);
        setRecentScans(valid);
      }
    } catch (e) {
      console.error('Failed to load recent scans:', e);
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentScans));
    } catch (e) {
      console.error('Failed to save recent scans:', e);
    }
  }, [recentScans]);

  const addRecentScan = useCallback((scan: Omit<RecentScan, 'id' | 'timestamp'>) => {
    setRecentScans(prev => {
      // Check if this comic is already in recent scans
      const exists = prev.find(
        s => s.title === scan.title && s.issueNumber === scan.issueNumber
      );
      
      if (exists) {
        // Move to front and update timestamp
        return [
          { ...exists, timestamp: Date.now() },
          ...prev.filter(s => s.id !== exists.id),
        ].slice(0, MAX_RECENT);
      }

      // Add new entry
      const newScan: RecentScan = {
        id: crypto.randomUUID(),
        ...scan,
        timestamp: Date.now(),
      };

      return [newScan, ...prev].slice(0, MAX_RECENT);
    });
  }, []);

  const clearRecentScans = useCallback(() => {
    setRecentScans([]);
  }, []);

  return {
    recentScans,
    addRecentScan,
    clearRecentScans,
  };
}
