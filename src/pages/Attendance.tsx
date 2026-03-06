import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, UserCheck, UserX, CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { attendanceSchema } from "@/lib/validation-schemas";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { AppLayout } from "@/components/layout";
import {
  savePendingAttendance,
  getAttendanceByDate,
  cacheChildren,
  getCachedChildren,
  isCacheValid,
} from "@/lib/offline-db";
import { setupAutoSync, syncPendingAttendance, SyncResult } from "@/services/attendance-sync";

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
  const { user, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { isOnline } = useOnlineStatus();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [saving, setSaving] = useState(false);
  const [hasOfflineData, setHasOfflineData] = useState(false);

  // Set up auto-sync when coming back online
  useEffect(() => {
    const cleanup = setupAutoSync((result: SyncResult) => {
      if (result.success && result.synced > 0) {
        toast.success(`Auto-synced ${result.synced} attendance records`);
        fetchExistingAttendance(); // Refresh to show synced data
      }
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (user) {
      fetchChildren();
    }
  }, [user]);

  useEffect(() => {
    if (children.length > 0) {
      fetchExistingAttendance();
    }
  }, [serviceDate, children]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      
      if (isOnline) {
        // Fetch from server
        const { data, error } = await supabase
          .from("children")
          .select("id, full_name")
          .order("full_name") as any;

        if (error) throw error;
        
        const childrenData = data || [];
        setChildren(childrenData);
        
        // Cache children for offline use
        await cacheChildren(childrenData);
        
        initializeAttendance(childrenData);
      } else {
        // Load from cache when offline
        const cacheIsValid = await isCacheValid();
        if (cacheIsValid) {
          const cachedChildren = await getCachedChildren();
          setChildren(cachedChildren);
          initializeAttendance(cachedChildren);
          toast.info("Using cached children list (offline mode)");
        } else {
          toast.error("No cached data available. Please connect to the internet.");
        }
      }
    } catch (error: any) {
      // Try loading from cache on error
      const cachedChildren = await getCachedChildren();
      if (cachedChildren.length > 0) {
        setChildren(cachedChildren);
        initializeAttendance(cachedChildren);
        toast.warning("Using cached data due to connection error");
      } else {
        toast.error("Failed to load children");
        if (import.meta.env.DEV) {
          console.error("Error:", error);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const initializeAttendance = (childrenData: Child[]) => {
    const initialAttendance: Record<string, AttendanceRecord> = {};
    childrenData.forEach((child: Child) => {
      initialAttendance[child.id] = {
        child_id: child.id,
        present: true,
        notes: "",
      };
    });
    setAttendance(initialAttendance);
  };

  const fetchExistingAttendance = useCallback(async () => {
    try {
      // First check for offline data for this date
      const offlineRecords = await getAttendanceByDate(serviceDate);
      const hasOffline = offlineRecords.some(r => !r.synced);
      setHasOfflineData(hasOffline);

      if (isOnline) {
        // Fetch from server
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
      }

      // Apply offline records on top (they take precedence)
      if (offlineRecords.length > 0) {
        const offlineAttendance: Record<string, AttendanceRecord> = {};
        offlineRecords.forEach((record) => {
          offlineAttendance[record.child_id] = {
            child_id: record.child_id,
            present: record.present,
            notes: record.notes || "",
          };
        });
        setAttendance((prev) => ({ ...prev, ...offlineAttendance }));
      }
    } catch (error: any) {
      // Load from offline storage on error
      const offlineRecords = await getAttendanceByDate(serviceDate);
      if (offlineRecords.length > 0) {
        const offlineAttendance: Record<string, AttendanceRecord> = {};
        offlineRecords.forEach((record) => {
          offlineAttendance[record.child_id] = {
            child_id: record.child_id,
            present: record.present,
            notes: record.notes || "",
          };
        });
        setAttendance((prev) => ({ ...prev, ...offlineAttendance }));
        toast.info("Loaded offline attendance data");
      }
      
      if (import.meta.env.DEV) {
        console.error("Error fetching existing attendance:", error);
      }
    }
  }, [serviceDate, isOnline]);

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

      if (isOnline) {
        // Try to save directly to server
        const { error } = await supabase
          .from("attendance")
          .upsert(records, {
            onConflict: "child_id,service_date",
          }) as any;

        if (error) throw error;

        // Also sync any pending offline records
        await syncPendingAttendance();
        
        toast.success("Attendance saved successfully");
        setHasOfflineData(false);
      } else {
        // Save to offline storage
        await savePendingAttendance(records);
        toast.success("Attendance saved offline. Will sync when online.", {
          icon: <CloudOff className="h-4 w-4" />,
        });
        setHasOfflineData(true);
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error saving attendance:", error);
      }
      
      // Fallback to offline storage on any error
      if (!isOnline || error.message.includes("network") || error.message.includes("fetch")) {
        try {
          const records = Object.values(attendance).map((record) => ({
            child_id: record.child_id,
            service_date: serviceDate,
            present: record.present,
            notes: record.notes,
            recorded_by: user.id,
          }));
          await savePendingAttendance(records);
          toast.warning("Connection failed. Saved offline - will sync later.");
          setHasOfflineData(true);
        } catch (offlineError) {
          toast.error("Unable to save attendance. Please try again.");
        }
      } else if (error.message.includes("Notes must be")) {
        toast.error(error.message);
      } else {
        toast.error("Unable to save attendance. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const canEdit = userRole === "admin" || userRole === "servant";

  const headerActions = (
    <div className="flex items-center gap-3">
      <OfflineIndicator onSyncComplete={() => fetchExistingAttendance()} />
      {canEdit && (
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? t('common.loading') : t('common.save')}
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <AppLayout 
        title={userRole === "parent" ? t('dashboard.attendanceHistory') : t('attendance.title')}
        headerActions={headerActions}
      >
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={userRole === "parent" ? t('dashboard.attendanceHistory') : t('attendance.title')}
      headerActions={headerActions}
    >
      <div className="space-y-4 md:space-y-6">

        {!isOnline && (
          <Card className="border-warning/50 bg-warning/10">
            <CardContent className="p-4 md:pt-6">
              <div className="flex items-center gap-3 text-warning-foreground">
                <CloudOff className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">You're offline</p>
                  <p className="text-xs opacity-80">
                    Changes will be saved locally and synced when you're back online.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasOfflineData && isOnline && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 md:pt-6">
              <div className="flex items-center gap-3">
                <CloudOff className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">Unsynced offline data detected</p>
                  <p className="text-xs text-muted-foreground">
                    Use the Sync button to upload them.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {userRole === "parent" && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-base md:text-lg">{t('dashboard.attendanceHistory')}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {t('dashboard.attendanceHistoryDesc')}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">{t('attendance.selectDate')}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4">
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
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <Card className="border-green-500/30 bg-green-500/10">
              <CardContent className="p-3 md:pt-6">
                <div className="flex flex-col items-center gap-1 md:flex-row md:gap-3">
                  <UserCheck className="h-5 w-5 md:h-8 md:w-8 text-green-600" />
                  <div className="text-center md:text-left">
                    <p className="text-lg md:text-2xl font-bold text-green-600">
                      {Object.values(attendance).filter((a) => a.present).length}
                    </p>
                    <p className="text-[10px] md:text-sm text-muted-foreground">{t('common.present')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-500/30 bg-red-500/10">
              <CardContent className="p-3 md:pt-6">
                <div className="flex flex-col items-center gap-1 md:flex-row md:gap-3">
                  <UserX className="h-5 w-5 md:h-8 md:w-8 text-red-600" />
                  <div className="text-center md:text-left">
                    <p className="text-lg md:text-2xl font-bold text-red-600">
                      {Object.values(attendance).filter((a) => !a.present).length}
                    </p>
                    <p className="text-[10px] md:text-sm text-muted-foreground">{t('common.absent')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 md:pt-6">
                <div className="flex flex-col items-center gap-1 md:flex-row md:gap-3">
                  <div className="h-5 w-5 md:h-8 md:w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs md:text-base">
                    {children.length}
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-lg md:text-2xl font-bold">{children.length}</p>
                    <p className="text-[10px] md:text-sm text-muted-foreground">{t('landing.childrenManagement')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg">{t('attendance.title')}</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {children.length} {t('landing.childrenManagement')}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 pb-4">
            <div className="space-y-3 md:space-y-4">
              {children.map((child) => {
                const isPresent = attendance[child.id]?.present;
                return (
                  <div
                    key={child.id}
                    className={`flex flex-col md:flex-row md:items-start gap-2 md:gap-4 rounded-lg border p-3 md:p-4 transition-colors ${
                      isPresent
                        ? "border-green-500/30 bg-green-500/5 hover:bg-green-500/10"
                        : "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 md:min-w-[200px]">
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
                        className="text-sm md:text-base font-medium cursor-pointer truncate"
                      >
                        {child.full_name}
                      </Label>
                      <Badge
                        variant={isPresent ? "default" : "destructive"}
                        className={`text-[10px] md:text-xs shrink-0 ${isPresent ? "bg-green-600" : ""}`}
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
                        rows={1}
                        disabled={!canEdit}
                        className="text-xs md:text-sm resize-none"
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
    </AppLayout>
  );
};

export default Attendance;
