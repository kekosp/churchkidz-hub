import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { Star, Trophy, CalendarCheck, CalendarX, User, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout";
import { format } from "date-fns";

interface ChildData {
  id: string;
  full_name: string;
  date_of_birth: string;
  school_grade: string | null;
  attendance_status: string | null;
  parent_name: string;
  notes: string | null;
  created_at: string;
}

interface AttendanceRecord {
  id: string;
  service_date: string;
  present: boolean;
  notes: string | null;
}

interface TayoTransaction {
  id: string;
  points: number;
  reason: string | null;
  created_at: string;
}

const ChildDashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [childData, setChildData] = useState<ChildData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [transactions, setTransactions] = useState<TayoTransaction[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchChildData();
  }, [user]);

  const fetchChildData = async () => {
    try {
      setLoading(true);

      // Fetch the child record linked to this user
      const { data: child, error: childError } = await supabase
        .from("children")
        .select("id, full_name, date_of_birth, school_grade, attendance_status, parent_name, notes, created_at")
        .eq("child_user_id", user!.id)
        .single();

      if (childError) {
        if (import.meta.env.DEV) console.error("Error fetching child:", childError);
        toast.error(t('childDashboard.loadError'));
        return;
      }

      setChildData(child);

      // Fetch attendance and tayo in parallel
      const [attendanceRes, tayoRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("id, service_date, present, notes")
          .eq("child_id", child.id)
          .order("service_date", { ascending: false })
          .limit(50),
        supabase
          .from("tayo_transactions")
          .select("id, points, reason, created_at")
          .eq("child_id", child.id)
          .order("created_at", { ascending: false }),
      ]);

      if (attendanceRes.error) throw attendanceRes.error;
      if (tayoRes.error) throw tayoRes.error;

      setAttendance(attendanceRes.data || []);
      setTransactions(tayoRes.data || []);
      setTotalPoints((tayoRes.data || []).reduce((sum, t) => sum + t.points, 0));
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error:", error);
      toast.error(t('childDashboard.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!childData) return;
    const svg = document.getElementById("child-qr") as HTMLElement;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${childData.full_name}-QR.png`;
      link.href = pngFile;
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const presentCount = attendance.filter((a) => a.present).length;
  const absentCount = attendance.filter((a) => !a.present).length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

  if (loading) {
    return (
      <AppLayout title={t('childDashboard.title')}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!childData) {
    return (
      <AppLayout title={t('childDashboard.title')}>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('childDashboard.notLinked')}
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`${t('dashboard.welcome')}, ${childData.full_name}`}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="animate-fade-in">
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totalPoints}</p>
              <p className="text-xs text-muted-foreground">{t('tayo.points')}</p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4 text-center">
              <CalendarCheck className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{presentCount}</p>
              <p className="text-xs text-muted-foreground">{t('common.present')}</p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-4 text-center">
              <CalendarX className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{absentCount}</p>
              <p className="text-xs text-muted-foreground">{t('common.absent')}</p>
            </CardContent>
          </Card>
          <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardContent className="p-4 text-center">
              <User className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{attendanceRate}%</p>
              <p className="text-xs text-muted-foreground">{t('reports.attendanceRate')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code */}
          <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">{t('childDashboard.myQRCode')}</CardTitle>
              <CardDescription>{t('childDashboard.qrDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <QRCodeSVG
                  id="child-qr"
                  value={childData.id}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <Button variant="outline" onClick={downloadQRCode} className="gap-2">
                <Download className="h-4 w-4" />
                {t('qr.download')}
              </Button>
            </CardContent>
          </Card>

          {/* Profile Info */}
          <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardHeader>
              <CardTitle className="text-lg">{t('childDashboard.myProfile')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('children.fullName')}</span>
                <span className="font-medium">{childData.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('children.dateOfBirth')}</span>
                <span className="font-medium">{format(new Date(childData.date_of_birth), 'yyyy-MM-dd')}</span>
              </div>
              {childData.school_grade && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('children.schoolGrade')}</span>
                  <span className="font-medium">{childData.school_grade}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('children.attendanceStatus')}</span>
                <Badge variant={childData.attendance_status === 'regular' ? 'default' : 'secondary'}>
                  {childData.attendance_status || t('children.new')}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('children.parentName')}</span>
                <span className="font-medium">{childData.parent_name}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tayo Points History */}
        <Card className="animate-fade-in" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-yellow-500" />
              {t('childDashboard.pointsHistory')}
            </CardTitle>
            <CardDescription>
              {t('childDashboard.totalPoints')}: {totalPoints} {t('tayo.points')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{t('tayo.noTransactions')}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{tx.reason || t('tayo.noReason')}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), 'yyyy-MM-dd')}
                      </p>
                    </div>
                    <span className={`font-bold ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance History */}
        <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarCheck className="h-5 w-5 text-primary" />
              {t('childDashboard.attendanceHistory')}
            </CardTitle>
            <CardDescription>
              {t('childDashboard.attendanceSummary')}: {presentCount}/{attendance.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">{t('childReport.noRecords')}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {attendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${record.present ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm">{format(new Date(record.service_date), 'yyyy-MM-dd')}</span>
                    </div>
                    <Badge variant={record.present ? 'default' : 'destructive'} className="text-xs">
                      {record.present ? t('common.present') : t('common.absent')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ChildDashboard;
