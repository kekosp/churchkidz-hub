import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Save, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { attendanceSchema } from "@/lib/validation-schemas";
import { useLanguage } from "@/contexts/LanguageContext";

interface Child {
  id: string;
  full_name: string;
}

interface AttendanceRecord {
  child_id: string;
  present: boolean;
  notes: string;
}

const Attendance = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchChildren();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (children.length > 0) {
      fetchExistingAttendance();
    }
  }, [serviceDate, children]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("children")
        .select("id, full_name")
        .order("full_name") as any;

      if (error) throw error;
      setChildren(data || []);
      
      const initialAttendance: Record<string, AttendanceRecord> = {};
      (data || []).forEach((child: Child) => {
        initialAttendance[child.id] = {
          child_id: child.id,
          present: true,
          notes: "",
        };
      });
      setAttendance(initialAttendance);
    } catch (error: any) {
      toast.error("Failed to load children");
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("service_date", serviceDate) as any;

      if (error) throw error;

      if (data && data.length > 0) {
        const existingAttendance: Record<string, AttendanceRecord> = {};
        data.forEach((record: any) => {
          existingAttendance[record.child_id] = {
            child_id: record.child_id,
            present: record.present,
            notes: record.notes || "",
          };
        });
        setAttendance((prev) => ({ ...prev, ...existingAttendance }));
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error fetching existing attendance:", error);
      }
    }
  };

  const handleAttendanceChange = (childId: string, field: "present" | "notes", value: boolean | string) => {
    setAttendance((prev) => ({
      ...prev,
      [childId]: {
        ...prev[childId],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);

      const validation = attendanceSchema.safeParse({
        service_date: serviceDate,
        notes: "",
      });

      if (!validation.success) {
        const errors = validation.error.errors.map((e) => e.message).join(", ");
        toast.error(errors);
        setSaving(false);
        return;
      }

      const records = Object.values(attendance).map((record) => {
        const noteValidation = attendanceSchema.shape.notes.safeParse(record.notes);
        if (!noteValidation.success) {
          throw new Error("Notes must be less than 500 characters");
        }
        return {
          child_id: record.child_id,
          service_date: serviceDate,
          present: record.present,
          notes: record.notes,
          recorded_by: user.id,
        };
      });

      const { error } = await supabase
        .from("attendance")
        .upsert(records, {
          onConflict: "child_id,service_date",
        }) as any;

      if (error) throw error;

      toast.success("Attendance saved successfully");
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error saving attendance:", error);
      }
      if (error.message.includes("Notes must be")) {
        toast.error(error.message);
      } else {
        toast.error("Unable to save attendance. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  const canEdit = userRole === "admin" || userRole === "servant";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
              {t('common.back')}
            </Button>
            <h1 className="text-3xl font-bold">
              {userRole === "parent" ? t('dashboard.attendanceHistory') : t('attendance.title')}
            </h1>
          </div>
          {canEdit && (
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          )}
        </div>

        {userRole === "parent" && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">{t('dashboard.attendanceHistory')}</CardTitle>
              <CardDescription>
                {t('dashboard.attendanceHistoryDesc')}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('attendance.selectDate')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label htmlFor="service_date">{t('common.date')}</Label>
              <Input
                id="service_date"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                disabled={!canEdit}
                dir="ltr"
              />
            </div>
          </CardContent>
        </Card>

        {children.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-green-500/30 bg-green-500/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {Object.values(attendance).filter((a) => a.present).length}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('common.present')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-500/30 bg-red-500/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <UserX className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {Object.values(attendance).filter((a) => !a.present).length}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('common.absent')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {children.length}
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{children.length}</p>
                    <p className="text-sm text-muted-foreground">{t('landing.childrenManagement')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('attendance.title')}</CardTitle>
            <CardDescription>
              {children.length} {t('landing.childrenManagement')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {children.map((child) => {
                const isPresent = attendance[child.id]?.present;
                return (
                  <div
                    key={child.id}
                    className={`flex items-start gap-4 rounded-lg border p-4 transition-colors ${
                      isPresent
                        ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
                        : "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <Checkbox
                        id={`present-${child.id}`}
                        checked={isPresent}
                        onCheckedChange={(checked) =>
                          handleAttendanceChange(child.id, "present", checked === true)
                        }
                        disabled={!canEdit}
                      />
                      <Label
                        htmlFor={`present-${child.id}`}
                        className="text-base font-medium cursor-pointer"
                      >
                        {child.full_name}
                      </Label>
                      <Badge
                        variant={isPresent ? "default" : "destructive"}
                        className={isPresent ? "bg-green-600" : ""}
                      >
                        {isPresent ? t('common.present') : t('common.absent')}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <Textarea
                        placeholder={t('common.notes')}
                        value={attendance[child.id]?.notes || ""}
                        onChange={(e) =>
                          handleAttendanceChange(child.id, "notes", e.target.value)
                        }
                        rows={2}
                        disabled={!canEdit}
                        className="text-sm"
                      />
                    </div>
                  </div>
                );
              })}
              {children.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  {t('children.noChildren')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Attendance;
