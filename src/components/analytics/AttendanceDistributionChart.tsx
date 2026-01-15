import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

interface AttendanceDistributionChartProps {
  regularCount: number;
  irregularCount: number;
  newCount: number;
}

export function AttendanceDistributionChart({
  regularCount,
  irregularCount,
  newCount,
}: AttendanceDistributionChartProps) {
  const { t } = useLanguage();

  const data: DistributionData[] = [
    { name: t('children.regular'), value: regularCount, color: 'hsl(var(--chart-1))' },
    { name: t('children.irregular'), value: irregularCount, color: 'hsl(var(--chart-3))' },
    { name: t('children.new'), value: newCount, color: 'hsl(var(--chart-4))' },
  ];

  const chartConfig = {
    regular: { label: t('children.regular'), color: 'hsl(var(--chart-1))' },
    irregular: { label: t('children.irregular'), color: 'hsl(var(--chart-3))' },
    new: { label: t('children.new'), color: 'hsl(var(--chart-4))' },
  };

  const total = regularCount + irregularCount + newCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.childrenDistribution')}</CardTitle>
        <CardDescription>{t('analytics.byAttendanceStatus')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="flex justify-center gap-6 mt-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">
                {item.name}: {item.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
