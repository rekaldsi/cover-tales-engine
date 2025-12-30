import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RealtimeSnapshotsOptions {
  onSnapshotChange?: () => void;
  onValueHistoryChange?: (comicId: string) => void;
}

export function useRealtimeSnapshots({ onSnapshotChange, onValueHistoryChange }: RealtimeSnapshotsOptions = {}) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to collection_snapshots changes
    const snapshotsChannel = supabase
      .channel('portfolio-snapshots')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collection_snapshots',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Portfolio snapshot updated:', payload);
          onSnapshotChange?.();
        }
      )
      .subscribe();

    // Subscribe to comic_value_history changes
    const valueHistoryChannel = supabase
      .channel('value-history')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comic_value_history',
        },
        (payload) => {
          console.log('Value history updated:', payload);
          const comicId = (payload.new as any)?.comic_id;
          if (comicId) {
            onValueHistoryChange?.(comicId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(snapshotsChannel);
      supabase.removeChannel(valueHistoryChannel);
    };
  }, [user, onSnapshotChange, onValueHistoryChange]);
}
