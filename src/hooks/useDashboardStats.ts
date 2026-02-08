import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface DashboardStats {
  todayPresent: number;
  totalChildren: number;
  totalAttendanceRecords: number;
  loading: boolean;
}

export function useDashboardStats(): DashboardStats {
  const [stats, setStats] = useState<DashboardStats>({
    todayPresent: 0,
    totalChildren: 0,
    totalAttendanceRecords: 0,
    loading: true,
  });

  useEffect(() => {
    async function fetchStats() {
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

        setStats({
          todayPresent: todayRes.count ?? 0,
          totalChildren: childrenRes.count ?? 0,
          totalAttendanceRecords: totalAttendanceRes.count ?? 0,
          loading: false,
        });
      } catch {
        setStats(prev => ({ ...prev, loading: false }));
      }
    }

    fetchStats();
  }, []);

  return stats;
}
