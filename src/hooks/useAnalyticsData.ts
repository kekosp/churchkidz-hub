import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';

interface TrendDataPoint {
  date: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

interface ChildAttendance {
  id: string;
  name: string;
  totalSessions: number;
  attended: number;
  percentage: number;
}

interface WeekData {
  week: string;
  present: number;
  absent: number;
}

interface AnalyticsData {
  totalChildren: number;
  averageAttendance: number;
  todayPresent: number;
  todayAbsent: number;
  weeklyTrend: number;
  regularCount: number;
  irregularCount: number;
  newCount: number;
  trendData: TrendDataPoint[];
  topChildren: ChildAttendance[];
  weeklyData: WeekData[];
  loading: boolean;
  error: string | null;
}

export function useAnalyticsData(): AnalyticsData {
  const [data, setData] = useState<AnalyticsData>({
    totalChildren: 0,
    averageAttendance: 0,
    todayPresent: 0,
    todayAbsent: 0,
    weeklyTrend: 0,
    regularCount: 0,
    irregularCount: 0,
    newCount: 0,
    trendData: [],
    topChildren: [],
    weeklyData: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

        // Fetch all children
        const { data: children, error: childrenError } = await supabase
          .from('children')
          .select('id, full_name, attendance_status');

        if (childrenError) throw childrenError;

        // Fetch attendance for last 30 days
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('child_id, service_date, present')
          .gte('service_date', thirtyDaysAgo)
          .lte('service_date', today);

        if (attendanceError) throw attendanceError;

        // Calculate statistics
        const totalChildren = children?.length || 0;
        
        // Distribution by status
        const regularCount = children?.filter(c => c.attendance_status === 'regular').length || 0;
        const irregularCount = children?.filter(c => c.attendance_status === 'irregular').length || 0;
        const newCount = children?.filter(c => c.attendance_status === 'new' || !c.attendance_status).length || 0;

        // Today's attendance
        const todayAttendance = attendanceData?.filter(a => a.service_date === today) || [];
        const todayPresent = todayAttendance.filter(a => a.present).length;
        const todayAbsent = todayAttendance.filter(a => !a.present).length;

        // Average attendance
        const totalRecords = attendanceData?.length || 0;
        const presentRecords = attendanceData?.filter(a => a.present).length || 0;
        const averageAttendance = totalRecords > 0 ? (presentRecords / totalRecords) * 100 : 0;

        // Weekly trend data
        const weeks = eachWeekOfInterval({
          start: subWeeks(new Date(), 7),
          end: new Date(),
        });

        const trendData: TrendDataPoint[] = weeks.map(weekStart => {
          const weekEnd = endOfWeek(weekStart);
          const weekAttendance = attendanceData?.filter(a => {
            const date = new Date(a.service_date);
            return date >= weekStart && date <= weekEnd;
          }) || [];
          
          const present = weekAttendance.filter(a => a.present).length;
          const absent = weekAttendance.filter(a => !a.present).length;
          const total = present + absent;
          
          return {
            date: format(weekStart, 'MMM d'),
            present,
            absent,
            total,
            percentage: total > 0 ? (present / total) * 100 : 0,
          };
        });

        // Weekly comparison data (last 4 weeks)
        const weeklyData: WeekData[] = weeks.slice(-4).map((weekStart, index) => {
          const weekEnd = endOfWeek(weekStart);
          const weekAttendance = attendanceData?.filter(a => {
            const date = new Date(a.service_date);
            return date >= weekStart && date <= weekEnd;
          }) || [];
          
          return {
            week: `Week ${index + 1}`,
            present: weekAttendance.filter(a => a.present).length,
            absent: weekAttendance.filter(a => !a.present).length,
          };
        });

        // Top children by attendance
        const childAttendanceMap = new Map<string, { name: string; attended: number; total: number }>();
        
        children?.forEach(child => {
          childAttendanceMap.set(child.id, {
            name: child.full_name,
            attended: 0,
            total: 0,
          });
        });

        attendanceData?.forEach(record => {
          const child = childAttendanceMap.get(record.child_id);
          if (child) {
            child.total += 1;
            if (record.present) child.attended += 1;
          }
        });

        const topChildren: ChildAttendance[] = Array.from(childAttendanceMap.entries())
          .map(([id, data]) => ({
            id,
            name: data.name,
            totalSessions: data.total,
            attended: data.attended,
            percentage: data.total > 0 ? (data.attended / data.total) * 100 : 0,
          }))
          .filter(c => c.totalSessions > 0)
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 10);

        // Calculate weekly trend (compare this week to last week)
        const thisWeekPresent = trendData[trendData.length - 1]?.percentage || 0;
        const lastWeekPresent = trendData[trendData.length - 2]?.percentage || 0;
        const weeklyTrend = thisWeekPresent - lastWeekPresent;

        setData({
          totalChildren,
          averageAttendance,
          todayPresent,
          todayAbsent,
          weeklyTrend,
          regularCount,
          irregularCount,
          newCount,
          trendData,
          topChildren,
          weeklyData,
          loading: false,
          error: null,
        });
      } catch (error: any) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
      }
    }

    fetchAnalytics();
  }, []);

  return data;
}
