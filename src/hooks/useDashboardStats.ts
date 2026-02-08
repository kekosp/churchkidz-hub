import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const AUTO_REFRESH_INTERVAL = 30_000; // 30 seconds

interface DashboardStats {
  todayPresent: number;
  totalChildren: number;
  totalAttendanceRecords: number;
  loading: boolean;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useDashboardStats(): DashboardStats {
  const [data, setData] = useState({
    todayPresent: 0,
    totalChildren: 0,
    totalAttendanceRecords: 0,
    loading: true,
    lastUpdated: null as Date | null,
  });

  const fetchStats = useCallback(async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [childrenRes, todayRes, totalAttendanceRes] = await Promise.all([
        supabase.from('children').select('id', { count: 'exact', head: true }),
        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('service_date', today)
          .eq('present', true),
        supabase.from('attendance').select('id', { count: 'exact', head: true }),
      ]);

      setData({
        todayPresent: todayRes.count ?? 0,
        totalChildren: childrenRes.count ?? 0,
        totalAttendanceRecords: totalAttendanceRes.count ?? 0,
        loading: false,
        lastUpdated: new Date(),
      });
    } catch {
      setData(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { ...data, refresh: fetchStats };
}
