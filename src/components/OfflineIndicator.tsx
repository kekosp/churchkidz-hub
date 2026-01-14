import { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getSyncStatus, syncPendingAttendance, SyncResult } from '@/services/attendance-sync';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface OfflineIndicatorProps {
  onSyncComplete?: (result: SyncResult) => void;
}

export function OfflineIndicator({ onSyncComplete }: OfflineIndicatorProps) {
  const { isOnline } = useOnlineStatus();
  const { t } = useLanguage();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const updatePendingCount = async () => {
      const status = await getSyncStatus();
      setPendingCount(status.pendingCount);
    };

    updatePendingCount();
    
    // Update count periodically
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await syncPendingAttendance();
      
      if (result.success && result.synced > 0) {
        toast.success(`Synced ${result.synced} attendance records`);
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2000);
      } else if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} records`);
      }

      const status = await getSyncStatus();
      setPendingCount(status.pendingCount);
      
      onSyncComplete?.(result);
    } catch (error) {
      toast.error('Sync failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show indicator when online and nothing pending
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {!isOnline ? (
        <Badge 
          variant="destructive" 
          className="flex items-center gap-1.5 px-3 py-1"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline</span>
        </Badge>
      ) : justSynced ? (
        <Badge 
          variant="default"
          className="flex items-center gap-1.5 px-3 py-1 bg-green-600"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Synced!</span>
        </Badge>
      ) : null}

      {pendingCount > 0 && (
        <Badge 
          variant="secondary"
          className="flex items-center gap-1.5 px-3 py-1"
        >
          <CloudOff className="h-3.5 w-3.5" />
          <span>{pendingCount} pending</span>
        </Badge>
      )}

      {isOnline && pendingCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualSync}
          disabled={isSyncing}
          className="h-7 px-2"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="ml-1.5 text-xs">
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </span>
        </Button>
      )}
    </div>
  );
}
