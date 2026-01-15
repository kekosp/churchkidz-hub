import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { Trophy, Medal, Award } from 'lucide-react';

interface ChildAttendance {
  id: string;
  name: string;
  totalSessions: number;
  attended: number;
  percentage: number;
}

interface TopAttendanceTableProps {
  children: ChildAttendance[];
}

export function TopAttendanceTable({ children }: TopAttendanceTableProps) {
  const { t } = useLanguage();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 1:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 2:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-muted-foreground text-sm">{index + 1}</span>;
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-success';
    if (percentage >= 70) return 'bg-chart-1';
    if (percentage >= 50) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.topAttendance')}</CardTitle>
        <CardDescription>{t('analytics.bestAttendingChildren')}</CardDescription>
      </CardHeader>
      <CardContent>
        {children.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t('common.noData')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead className="text-center">{t('reports.attended')}</TableHead>
                <TableHead className="text-center">{t('reports.totalServices')}</TableHead>
                <TableHead>{t('reports.attendanceRate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {children.map((child, index) => (
                <TableRow key={child.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-center">
                      {getRankIcon(index)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{child.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{child.attended}</Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {child.totalSessions}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={child.percentage} 
                        className={`h-2 flex-1 ${getPercentageColor(child.percentage)}`}
                      />
                      <span className="text-sm font-medium w-12">
                        {child.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
