import { AttendanceStatsCards } from './AttendanceStatsCards';
import { AttendanceTrendChart } from './AttendanceTrendChart';
import { AttendanceDistributionChart } from './AttendanceDistributionChart';
import { TopAttendanceTable } from './TopAttendanceTable';
import { WeeklyComparisonChart } from './WeeklyComparisonChart';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useLanguage } from '@/contexts/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function AnalyticsDashboard() {
  const { t } = useLanguage();
  const {
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
    loading,
    error,
  } = useAnalyticsData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6 flex items-center gap-4">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <div>
            <p className="font-medium">{t('analytics.loadError')}</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <AttendanceStatsCards
        totalChildren={totalChildren}
        averageAttendance={averageAttendance}
        todayPresent={todayPresent}
        todayAbsent={todayAbsent}
        weeklyTrend={weeklyTrend}
      />

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AttendanceTrendChart data={trendData} />
        <AttendanceDistributionChart
          regularCount={regularCount}
          irregularCount={irregularCount}
          newCount={newCount}
        />
      </div>

      {/* Weekly Comparison & Top Attendance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WeeklyComparisonChart data={weeklyData} />
        <TopAttendanceTable children={topChildren} />
      </div>
    </div>
  );
}
