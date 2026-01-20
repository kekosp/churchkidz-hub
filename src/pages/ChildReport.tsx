import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChildData {
  id: string;
  full_name: string;
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  address: string | null;
  school_grade: string | null;
  notes: string | null;
  attendance_status: string | null;
  created_at: string;
}

interface AttendanceRecord {
  service_date: string;
  present: boolean;
  notes: string | null;
}

const ChildReport = () => {
  const { childId } = useParams();
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<ChildData | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchChildData();
  }, [childId]);

  const fetchChildData = async () => {
    try {
      setLoading(true);

      // Use secure view that masks sensitive parent contact info based on user role
      const { data: childData, error: childError } = await supabase
        .from("children_safe_view" as any)
        .select("*")
        .eq("id", childId)
        .single() as { data: ChildData | null; error: any };

      if (childError) throw childError;
      setChild(childData);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("service_date, present, notes")
        .eq("child_id", childId)
        .order("service_date", { ascending: false });

      if (attendanceError) throw attendanceError;
      setAttendanceRecords(attendanceData || []);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error fetching child data:", error);
      }
      toast.error(t('childReport.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    toast.info(t('childReport.exportHint'));
    window.print();
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateAttendanceStats = () => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.present).length;
    const absent = total - present;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : "0.0";
    return { total, present, absent, percentage };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{t('childReport.loadingReport')}</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p>{t('childReport.notFound')}</p>
        <Button onClick={() => navigate("/children")}>
          <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2 rtl-flip' : 'mr-2'}`} />
          {t('childReport.backToChildren')}
        </Button>
      </div>
    );
  }

  const stats = calculateAttendanceStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Action buttons - hidden when printing */}
      <div className="no-print fixed top-4 z-50 flex gap-2" style={{ [isRTL ? 'left' : 'right']: '1rem' }}>
        <Button variant="outline" onClick={() => navigate("/children")}>
          <ArrowLeft className={`h-4 w-4 ${isRTL ? 'ml-2 rtl-flip' : 'mr-2'}`} />
          {t('common.back')}
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {t('childReport.print')}
        </Button>
        <Button onClick={handleExport}>
          <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {t('childReport.exportPDF')}
        </Button>
      </div>

      {/* Report content - optimized for printing */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('childReport.title')}</h1>
          <p className="text-muted-foreground">
            {t('childReport.generatedOn')} {format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}
          </p>
        </div>

        {/* Personal Information */}
        <Card className="mb-6 print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle>{t('childReport.personalInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('childReport.fullName')}</p>
                <p className="text-base font-semibold">{child.full_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('childReport.dateOfBirth')}</p>
                <p className="text-base">
                  {format(new Date(child.date_of_birth), "MMMM dd, yyyy")} 
                  <span className="text-muted-foreground mx-2">
                    ({calculateAge(child.date_of_birth)} {t('childReport.yearsOld')})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('childReport.schoolGrade')}</p>
                <p className="text-base">{child.school_grade || t('childReport.notSpecified')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('childReport.status')}</p>
                <p className="text-base capitalize">{child.attendance_status || t('childReport.active')}</p>
              </div>
            </div>
            {child.address && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('childReport.address')}</p>
                <p className="text-base">{child.address}</p>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('childReport.parentName')}</p>
                <p className="text-base">{child.parent_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('childReport.parentPhone')}</p>
                <p className="text-base" dir="ltr">{child.parent_phone}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('childReport.registrationDate')}</p>
              <p className="text-base">{format(new Date(child.created_at), "MMMM dd, yyyy")}</p>
            </div>
          </CardContent>
        </Card>

        {/* General Notes */}
        {child.notes && (
          <Card className="mb-6 print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle>{t('childReport.generalNotes')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base whitespace-pre-wrap">{child.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Attendance Summary */}
        <Card className="mb-6 print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle>{t('childReport.attendanceSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-sm text-muted-foreground">{t('childReport.totalSessions')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                <p className="text-sm text-muted-foreground">{t('common.present')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                <p className="text-sm text-muted-foreground">{t('common.absent')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.percentage}%</p>
                <p className="text-sm text-muted-foreground">{t('reports.attendanceRate')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance History */}
        <Card className="print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle>{t('childReport.attendanceHistory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceRecords.length === 0 ? (
              <p className="text-muted-foreground">{t('childReport.noRecords')}</p>
            ) : (
              <div className="space-y-3">
                {attendanceRecords.map((record, index) => (
                  <div key={index} className="border rounded-lg p-3 print:break-inside-avoid">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">
                        {format(new Date(record.service_date), "EEEE, MMMM dd, yyyy")}
                      </p>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          record.present
                            ? "bg-green-100 text-green-800 print:border print:border-green-600"
                            : "bg-red-100 text-red-800 print:border print:border-red-600"
                        }`}
                      >
                        {record.present ? t('common.present') : t('common.absent')}
                      </span>
                    </div>
                    {record.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{record.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-muted-foreground print:mt-12">
          <p>{t('childReport.endOfReport')}</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          @page {
            margin: 1.5cm;
          }
        }
      `}</style>
    </div>
  );
};

export default ChildReport;
