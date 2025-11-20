import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState<ChildData | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchChildData();
  }, [childId]);

  const fetchChildData = async () => {
    try {
      setLoading(true);

      // Fetch child data
      const { data: childData, error: childError } = await supabase
        .from("children")
        .select("*")
        .eq("id", childId)
        .single();

      if (childError) throw childError;
      setChild(childData);

      // Fetch attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("service_date, present, notes")
        .eq("child_id", childId)
        .order("service_date", { ascending: false });

      if (attendanceError) throw attendanceError;
      setAttendanceRecords(attendanceData || []);
    } catch (error: any) {
      console.error("Error fetching child data:", error);
      toast.error("Failed to load child report");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Use browser's print to PDF functionality
    toast.info("Use Print > Save as PDF to export the report");
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
        <p>Loading report...</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p>Child not found</p>
        <Button onClick={() => navigate("/children")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Children
        </Button>
      </div>
    );
  }

  const stats = calculateAttendanceStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Action buttons - hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <Button variant="outline" onClick={() => navigate("/children")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Report content - optimized for printing */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Child Profile Report</h1>
          <p className="text-muted-foreground">
            Generated on {format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}
          </p>
        </div>

        {/* Personal Information */}
        <Card className="mb-6 print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p className="text-base font-semibold">{child.full_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                <p className="text-base">
                  {format(new Date(child.date_of_birth), "MMMM dd, yyyy")} 
                  <span className="text-muted-foreground ml-2">
                    ({calculateAge(child.date_of_birth)} years old)
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">School Grade</p>
                <p className="text-base">{child.school_grade || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="text-base capitalize">{child.attendance_status || "Active"}</p>
              </div>
            </div>
            {child.address && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-base">{child.address}</p>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Parent Name</p>
                <p className="text-base">{child.parent_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Parent Phone</p>
                <p className="text-base" dir="ltr">{child.parent_phone}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Registration Date</p>
              <p className="text-base">{format(new Date(child.created_at), "MMMM dd, yyyy")}</p>
            </div>
          </CardContent>
        </Card>

        {/* General Notes */}
        {child.notes && (
          <Card className="mb-6 print:shadow-none print:border-2">
            <CardHeader>
              <CardTitle>General Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base whitespace-pre-wrap">{child.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Attendance Summary */}
        <Card className="mb-6 print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.percentage}%</p>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance History */}
        <Card className="print:shadow-none print:border-2">
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceRecords.length === 0 ? (
              <p className="text-muted-foreground">No attendance records found</p>
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
                        {record.present ? "Present" : "Absent"}
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
          <p>End of Report</p>
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
