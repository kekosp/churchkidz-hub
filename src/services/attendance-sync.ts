import { supabase } from '@/integrations/supabase/client';
import {
  getPendingAttendance,
  markAttendanceSynced,
  clearSyncedAttendance,
  getPendingCount,
  PendingAttendance,
} from '@/lib/offline-db';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export async function syncPendingAttendance(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    const pendingRecords = await getPendingAttendance();
    
    if (pendingRecords.length === 0) {
      return result;
    }

    // Group records by service_date for batch upsert
    const recordsByDate = pendingRecords.reduce((acc, record) => {
      if (!acc[record.service_date]) {
        acc[record.service_date] = [];
      }
      acc[record.service_date].push(record);
      return acc;
    }, {} as Record<string, PendingAttendance[]>);

    const syncedIds: string[] = [];

    for (const [serviceDate, records] of Object.entries(recordsByDate)) {
      try {
        const upsertData = records.map(record => ({
          child_id: record.child_id,
          service_date: record.service_date,
          present: record.present,
          notes: record.notes,
          recorded_by: record.recorded_by,
        }));

        const { error } = await supabase
          .from('attendance')
          .upsert(upsertData, {
            onConflict: 'child_id,service_date',
          });

        if (error) {
          result.failed += records.length;
          result.errors.push(`Failed to sync ${serviceDate}: ${error.message}`);
        } else {
          result.synced += records.length;
          syncedIds.push(...records.map(r => r.id));
        }
      } catch (error: any) {
        result.failed += records.length;
        result.errors.push(`Error syncing ${serviceDate}: ${error.message}`);
      }
    }

    // Mark synced records
    if (syncedIds.length > 0) {
      await markAttendanceSynced(syncedIds);
    }

    // Clean up old synced records
    await clearSyncedAttendance();

    result.success = result.failed === 0;
  } catch (error: any) {
    result.success = false;
    result.errors.push(`Sync error: ${error.message}`);
  }

  return result;
}

export async function getSyncStatus(): Promise<{
  pendingCount: number;
  lastSyncAttempt: Date | null;
}> {
  const pendingCount = await getPendingCount();
  const lastSyncAttempt = localStorage.getItem('lastSyncAttempt');
  
  return {
    pendingCount,
    lastSyncAttempt: lastSyncAttempt ? new Date(lastSyncAttempt) : null,
  };
}

export function recordSyncAttempt(): void {
  localStorage.setItem('lastSyncAttempt', new Date().toISOString());
}

// Auto-sync when coming back online
export function setupAutoSync(onSync: (result: SyncResult) => void): () => void {
  const handleOnline = async () => {
    const pendingCount = await getPendingCount();
    if (pendingCount > 0) {
      recordSyncAttempt();
      const result = await syncPendingAttendance();
      onSync(result);
    }
  };

  window.addEventListener('online', handleOnline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
