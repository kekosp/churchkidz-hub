import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, TrendingUp, Users, Calendar } from "lucide-react";

interface ChildStats {
  id: string;
  full_name: string;
  total_services: number;
  attended: number;
  attendance_percentage: number;
}

const Reports = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ChildStats[]>([]);
  const [totalChildren, setTotalChildren] = useState(0);
  const [averageAttendance, setAverageAttendance] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchReports();
    }
  }, [user, authLoading, navigate]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Fetch all children
      const { data: childrenData, error: childrenError } = await supabase
        .from("children")
        .select("id, full_name") as any;

      if (childrenError) throw childrenError;

      setTotalChildren(childrenData?.length || 0);

      // Fetch all attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("child_id, present") as any;

      if (attendanceError) throw attendanceError;

      // Calculate stats for each child
      const childStats: ChildStats[] = (childrenData || []).map((child: any) => {
        const childAttendance = (attendanceData || []).filter(
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

      // Sort by attendance percentage
      childStats.sort((a, b) => b.attendance_percentage - a.attendance_percentage);

      setStats(childStats);

      // Calculate average attendance
      const totalPercentage = childStats.reduce(
        (sum, stat) => sum + stat.attendance_percentage,
        0
      );
      setAverageAttendance(
        childStats.length > 0 ? Math.round(totalPercentage / childStats.length) : 0
      );
    } catch (error: any) {
      toast.error("Failed to load reports");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Reports & Statistics</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Children</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalChildren}</div>
              <p className="text-xs text-muted-foreground">Registered in the system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageAttendance}%</div>
              <p className="text-xs text-muted-foreground">Across all children</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.reduce((sum, stat) => sum + stat.total_services, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Attendance records</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Individual Attendance Statistics</CardTitle>
            <CardDescription>
              Detailed attendance breakdown for each child
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Child Name</TableHead>
                    <TableHead className="text-center">Total Services</TableHead>
                    <TableHead className="text-center">Attended</TableHead>
                    <TableHead className="text-center">Attendance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No attendance data available yet
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
      </div>
    </div>
  );
};

export default Reports;