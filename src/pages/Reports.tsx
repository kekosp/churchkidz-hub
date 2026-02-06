import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TrendingUp, Users, Calendar, BarChart3, FileText } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { AppLayout } from "@/components/layout";

interface ChildStats {
  id: string;
  full_name: string;
  total_services: number;
  attended: number;
  attendance_percentage: number;
}

const Reports = () => {
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChildStats[]>([]);
  const [totalChildren, setTotalChildren] = useState(0);
  const [averageAttendance, setAverageAttendance] = useState(0);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select("id, full_name");

      if (childrenError) throw childrenError;

      setTotalChildren(childrenData?.length || 0);

      const childIds = (childrenData || []).map((child: any) => child.id);
      
      let attendanceData: any[] = [];
      if (childIds.length > 0) {
        const { data, error: attendanceError } = await supabase
          .from("attendance")
          .select("child_id, present")
          .in("child_id", childIds);

        if (attendanceError) throw attendanceError;
        attendanceData = data || [];
      }

      const childStats: ChildStats[] = (childrenData || []).map((child: any) => {
        const childAttendance = attendanceData.filter(
          (a: any) => a.child_id === child.id
        );
        const attended = childAttendance.filter((a: any) => a.present).length;
        const total = childAttendance.length;
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

        return {
          id: child.id,
          full_name: child.full_name,
          total_services: total,
          attended,
          attendance_percentage: percentage,
        };
      });

      childStats.sort((a, b) => b.attendance_percentage - a.attendance_percentage);

      setStats(childStats);

      const totalPercentage = childStats.reduce(
        (sum, stat) => sum + stat.attendance_percentage,
        0
      );
      setAverageAttendance(
        childStats.length > 0 ? Math.round(totalPercentage / childStats.length) : 0
      );
    } catch (error: any) {
      toast.error(t('reports.loadError'));
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const showAnalytics = userRole === "admin" || userRole === "servant";

  const StatsCards = () => (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('reports.totalChildren')}</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalChildren}</div>
          <p className="text-xs text-muted-foreground">{t('reports.registeredInSystem')}</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('reports.averageAttendance')}</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageAttendance}%</div>
          <p className="text-xs text-muted-foreground">{t('reports.acrossAllChildren')}</p>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('reports.totalRecords')}</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.reduce((sum, stat) => sum + stat.total_services, 0)}
          </div>
          <p className="text-xs text-muted-foreground">{t('reports.attendanceRecords')}</p>
        </CardContent>
      </Card>
    </div>
  );

  const StatsTable = () => (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>{t('reports.individualStats')}</CardTitle>
        <CardDescription>{t('reports.detailedBreakdown')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('reports.childName')}</TableHead>
                <TableHead className="text-center">{t('reports.totalServices')}</TableHead>
                <TableHead className="text-center">{t('reports.attended')}</TableHead>
                <TableHead className="text-center">{t('reports.attendanceRate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {t('reports.noData')}
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((stat) => (
                  <TableRow key={stat.id}>
                    <TableCell className="font-medium">{stat.full_name}</TableCell>
                    <TableCell className="text-center">{stat.total_services}</TableCell>
                    <TableCell className="text-center">{stat.attended}</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          stat.attendance_percentage >= 80
                            ? "default"
                            : stat.attendance_percentage >= 50
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {stat.attendance_percentage}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <AppLayout title={t('reports.title')}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('reports.title')}>
      <div className="space-y-6">
        {showAnalytics ? (
          <Tabs defaultValue="analytics" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                {t('analytics.title')}
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <FileText className="h-4 w-4" />
                {t('reports.individualStats')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analytics" className="space-y-6">
              <AnalyticsDashboard />
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <StatsCards />
              <StatsTable />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <StatsCards />
            <StatsTable />
          </>
        )}
      </div>
    </AppLayout>
  );
};

export default Reports;
