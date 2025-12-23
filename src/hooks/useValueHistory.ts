import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ValueHistoryPoint {
  id: string;
  comicId: string;
  value: number;
  source: string;
  recordedAt: string;
}

interface ValueChange {
  change: number;
  percentChange: number;
  periodLabel: string;
}

export function useValueHistory() {
  const [isLoading, setIsLoading] = useState(false);

  const getComicValueHistory = useCallback(async (comicId: string, days = 90): Promise<ValueHistoryPoint[]> => {
    setIsLoading(true);
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('comic_value_history')
        .select('*')
        .eq('comic_id', comicId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        comicId: row.comic_id,
        value: Number(row.value),
        source: row.source,
        recordedAt: row.recorded_at,
      }));
    } catch (err) {
      console.error('Failed to fetch value history:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateValueChange = useCallback((history: ValueHistoryPoint[]): ValueChange | null => {
    if (history.length < 2) return null;

    const latest = history[history.length - 1];
    const oldest = history[0];

    if (oldest.value === 0) return null;

    const change = latest.value - oldest.value;
    const percentChange = (change / oldest.value) * 100;

    // Calculate period label
    const daysDiff = Math.floor(
      (new Date(latest.recordedAt).getTime() - new Date(oldest.recordedAt).getTime()) 
      / (1000 * 60 * 60 * 24)
    );

    let periodLabel = `${daysDiff} days`;
    if (daysDiff >= 30) {
      periodLabel = `${Math.floor(daysDiff / 30)} month${daysDiff >= 60 ? 's' : ''}`;
    }

    return {
      change: Math.round(change * 100) / 100,
      percentChange: Math.round(percentChange * 100) / 100,
      periodLabel,
    };
  }, []);

  const recordValue = useCallback(async (comicId: string, value: number, source: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('comic_value_history')
        .insert({
          comic_id: comicId,
          value,
          source,
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to record value:', err);
      return false;
    }
  }, []);

  return {
    isLoading,
    getComicValueHistory,
    calculateValueChange,
    recordValue,
  };
}
