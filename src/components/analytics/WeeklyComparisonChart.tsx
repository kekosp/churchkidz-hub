import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface WeekData {
  week: string;
  present: number;
  absent: number;
}

interface WeeklyComparisonChartProps {
  data: WeekData[];
}

export function WeeklyComparisonChart({ data }: WeeklyComparisonChartProps) {
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
        <CardTitle>{t('analytics.weeklyComparison')}</CardTitle>
        <CardDescription>{t('analytics.presentVsAbsent')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="present" 
                fill="hsl(var(--chart-1))" 
                radius={[4, 4, 0, 0]}
                name={t('common.present')}
              />
              <Bar 
                dataKey="absent" 
                fill="hsl(var(--chart-5))" 
                radius={[4, 4, 0, 0]}
                name={t('common.absent')}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
