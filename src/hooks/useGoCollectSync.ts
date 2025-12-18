import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResult {
  success: boolean;
  imported: number;
  updated: number;
  total: number;
  message: string;
}

interface FMVData {
  raw?: number;
  '9.8'?: number;
  '9.6'?: number;
  '9.4'?: number;
  '9.2'?: number;
  '9.0'?: number;
  '8.0'?: number;
  current?: number;
}

interface ValueResult {
  success: boolean;
  fmv?: FMVData;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  error?: string;
}

export function useGoCollectSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const syncCollection = async (): Promise<SyncResult | null> => {
    setIsSyncing(true);
    setSyncProgress('Connecting to GoCollect...');

    try {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to sync with GoCollect');
      }

      setSyncProgress('Fetching your GoCollect collection...');

      const { data, error } = await supabase.functions.invoke('sync-gocollect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Sync failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      const result: SyncResult = {
        success: true,
        imported: data.imported,
        updated: data.updated,
        total: data.total,
        message: data.message,
      };

      setLastSyncResult(result);
      setSyncProgress('');
      
      toast.success(`Imported ${result.imported} new comics, updated ${result.updated} existing`);
      
      return result;
    } catch (error) {
      console.error('GoCollect sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync with GoCollect';
      toast.error(errorMessage);
      setSyncProgress('');
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchComicValue = async (
    title: string,
    issueNumber: string,
    publisher?: string,
    grade?: number
  ): Promise<ValueResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-gocollect-value', {
        body: {
          title,
          issue_number: issueNumber,
          publisher,
          grade,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        return { success: false, error: data.error };
      }

      return {
        success: true,
        fmv: data.fmv,
        trend: data.trend,
      };
    } catch (error) {
      console.error('GoCollect value fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch value',
      };
    }
  };

  return {
    syncCollection,
    fetchComicValue,
    isSyncing,
    syncProgress,
    lastSyncResult,
  };
}
