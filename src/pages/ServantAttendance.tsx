import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Users, UserCheck, UserX, Save } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface Servant {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
}

interface AttendanceRecord {
  servant_id: string;
  present: boolean;
  notes: string;
}

const ServantAttendance = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [servants, setServants] = useState<Servant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    if (authLoading || userRole === null) {
      return;
    }
    
    if (userRole !== "admin") {
      toast.error(t('manageRoles.adminOnly'));
      navigate("/dashboard");
      return;
    }
    
    fetchServants();
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (servants.length > 0) {
      fetchExistingAttendance();
    }
  }, [selectedDate, servants]);

  const fetchServants = async () => {
    try {
      setLoading(true);
      
      // Fetch all users with servant role
      const { data: servantRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "servant");

      if (rolesError) throw rolesError;

      if (!servantRoles || servantRoles.length === 0) {
        setServants([]);
        setLoading(false);
        return;
      }

      const servantIds = servantRoles.map(r => r.user_id);

      // Fetch profiles for these servants
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone_number")
        .in("id", servantIds);

      if (profilesError) throw profilesError;

      setServants(profiles || []);
      
      // Initialize attendance records
      const initialAttendance: Record<string, AttendanceRecord> = {};
      (profiles || []).forEach(servant => {
        initialAttendance[servant.id] = {
          servant_id: servant.id,
          present: false,
          notes: ""
        };
      });
      setAttendance(initialAttendance);
    } catch (error: any) {
      toast.error(t('servantAttendance.loadError'));
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
        .from("servant_attendance")
        .select("servant_id, present, notes")
        .eq("service_date", selectedDate);

      if (error) throw error;

      if (data && data.length > 0) {
        const existingAttendance: Record<string, AttendanceRecord> = {};
        servants.forEach(servant => {
          const record = data.find(r => r.servant_id === servant.id);
          existingAttendance[servant.id] = {
            servant_id: servant.id,
            present: record?.present || false,
            notes: record?.notes || ""
          };
        });
        setAttendance(existingAttendance);
      } else {
        // Reset to defaults if no existing records
        const defaultAttendance: Record<string, AttendanceRecord> = {};
        servants.forEach(servant => {
          defaultAttendance[servant.id] = {
            servant_id: servant.id,
            present: false,
            notes: ""
          };
        });
        setAttendance(defaultAttendance);
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error fetching existing attendance:", error);
      }
    }
  };

  const handleAttendanceChange = (servantId: string, field: 'present' | 'notes', value: boolean | string) => {
    setAttendance(prev => ({
      ...prev,
      [servantId]: {
        ...prev[servantId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const records = Object.values(attendance).map(record => ({
        servant_id: record.servant_id,
        service_date: selectedDate,
        present: record.present,
        notes: record.notes || null,
        recorded_by: user.id
      }));

      const { error } = await supabase
        .from("servant_attendance")
        .upsert(records, { 
          onConflict: 'servant_id,service_date',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast.success(t('servantAttendance.saveSuccess'));
    } catch (error: any) {
      toast.error(t('servantAttendance.saveError'));
      if (import.meta.env.DEV) {
        console.error("Error saving attendance:", error);
      }
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(a => a.present).length;
  const absentCount = servants.length - presentCount;

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t('servantAttendance.title')}</h1>
              <p className="text-muted-foreground">{t('servantAttendance.subtitle')}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving || servants.length === 0} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>

        {/* Date Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('servantAttendance.selectDate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="ltr"
            />
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('servantAttendance.presentCount')}</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{presentCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('servantAttendance.absentCount')}</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{absentCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('servantAttendance.totalCount')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{servants.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Servants List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('servants.title')}</CardTitle>
            <CardDescription>
              {servants.length} {t('roles.servant')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {servants.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {t('servantAttendance.noServants')}
              </div>
            ) : (
              <div className="space-y-4">
                {servants.map((servant) => (
                  <div
                    key={servant.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          id={`servant-${servant.id}`}
                          checked={attendance[servant.id]?.present || false}
                          onCheckedChange={(checked) =>
                            handleAttendanceChange(servant.id, 'present', checked as boolean)
                          }
                        />
                        <div>
                          <label
                            htmlFor={`servant-${servant.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {servant.full_name}
                          </label>
                          <p className="text-sm text-muted-foreground" dir="ltr">
                            {servant.email || servant.phone_number || '-'}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={attendance[servant.id]?.present ? "default" : "outline"}
                        className={attendance[servant.id]?.present ? "bg-green-600" : ""}
                      >
                        {attendance[servant.id]?.present ? t('common.present') : t('common.absent')}
                      </Badge>
                    </div>
                    <Textarea
                      placeholder={t('common.notes')}
                      value={attendance[servant.id]?.notes || ""}
                      onChange={(e) =>
                        handleAttendanceChange(servant.id, 'notes', e.target.value)
                      }
                      className="min-h-[60px]"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServantAttendance;
