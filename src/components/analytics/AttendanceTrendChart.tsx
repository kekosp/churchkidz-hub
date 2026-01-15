import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface TrendDataPoint {
  date: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

interface AttendanceTrendChartProps {
  data: TrendDataPoint[];
}

export function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  const { t } = useLanguage();

  const chartConfig = {
    present: {
      label: t('common.present'),
      color: 'hsl(var(--chart-1))',
    },
    absent: {
      label: t('common.absent'),
      color: 'hsl(var(--chart-5))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.attendanceTrend')}</CardTitle>
        <CardDescription>{t('analytics.last8Weeks')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="present"
                stackId="1"
                stroke="hsl(var(--chart-1))"
                fill="url(#presentGradient)"
                name={t('common.present')}
              />
              <Area
                type="monotone"
                dataKey="absent"
                stackId="1"
                stroke="hsl(var(--chart-5))"
                fill="url(#absentGradient)"
                name={t('common.absent')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
