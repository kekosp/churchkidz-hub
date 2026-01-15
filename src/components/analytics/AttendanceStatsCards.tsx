import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AttendanceStatsCardsProps {
  totalChildren: number;
  averageAttendance: number;
  todayPresent: number;
  todayAbsent: number;
  weeklyTrend: number;
}

export function AttendanceStatsCards({
  totalChildren,
  averageAttendance,
  todayPresent,
  todayAbsent,
  weeklyTrend,
}: AttendanceStatsCardsProps) {
  const { t } = useLanguage();

  const stats = [
    {
      title: t('analytics.totalChildren'),
      value: totalChildren,
      icon: Users,
      description: t('analytics.registeredChildren'),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('analytics.averageAttendance'),
      value: `${averageAttendance.toFixed(1)}%`,
      icon: TrendingUp,
      description: t('analytics.last30Days'),
      color: 'text-chart-1',
      bgColor: 'bg-chart-1/10',
    },
    {
      title: t('analytics.presentToday'),
      value: todayPresent,
      icon: UserCheck,
      description: t('analytics.childrenPresent'),
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: t('analytics.absentToday'),
      value: todayAbsent,
      icon: UserX,
      description: t('analytics.childrenAbsent'),
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
