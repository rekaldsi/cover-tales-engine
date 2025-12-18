import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PortfolioSnapshot {
  id: string;
  totalValue: number;
  comicCount: number;
  gradedCount: number;
  keyIssueCount: number;
  snapshotDate: string;
}

interface PortfolioTrend {
  percentChange: number;
  valueChange: number;
  periodLabel: string;
}

export function usePortfolioSnapshots() {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trend, setTrend] = useState<PortfolioTrend | null>(null);

  const fetchSnapshots = useCallback(async () => {
    if (!user) {
      setSnapshots([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('collection_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('snapshot_date', { ascending: false })
        .limit(90); // Last 90 days

      if (error) throw error;

      const mapped = (data || []).map(row => ({
        id: row.id,
        totalValue: Number(row.total_value),
        comicCount: row.comic_count,
        gradedCount: row.graded_count,
        keyIssueCount: row.key_issue_count,
        snapshotDate: row.snapshot_date,
      }));

      setSnapshots(mapped);

      // Calculate trend (compare today vs 30 days ago)
      if (mapped.length >= 2) {
        const latest = mapped[0];
        const thirtyDaysAgo = mapped.find((s, i) => i >= 25 && i <= 35) || mapped[mapped.length - 1];
        
        if (thirtyDaysAgo && thirtyDaysAgo.totalValue > 0) {
          const valueChange = latest.totalValue - thirtyDaysAgo.totalValue;
          const percentChange = (valueChange / thirtyDaysAgo.totalValue) * 100;
          setTrend({
            percentChange,
            valueChange,
            periodLabel: '30 days',
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch portfolio snapshots:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveSnapshot = useCallback(async (stats: {
    totalValue: number;
    comicCount: number;
    gradedCount: number;
    keyIssueCount: number;
  }) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Upsert - update if exists for today, insert otherwise
      const { error } = await supabase
        .from('collection_snapshots')
        .upsert({
          user_id: user.id,
          total_value: stats.totalValue,
          comic_count: stats.comicCount,
          graded_count: stats.gradedCount,
          key_issue_count: stats.keyIssueCount,
          snapshot_date: today,
        }, {
          onConflict: 'user_id,snapshot_date',
        });

      if (error) throw error;
      
      // Refresh snapshots
      await fetchSnapshots();
    } catch (err) {
      console.error('Failed to save portfolio snapshot:', err);
    }
  }, [user, fetchSnapshots]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  return {
    snapshots,
    trend,
    isLoading,
    saveSnapshot,
    refetch: fetchSnapshots,
  };
}