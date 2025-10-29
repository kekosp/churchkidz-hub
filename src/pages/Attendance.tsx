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
import { ArrowLeft, Save } from "lucide-react";

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
      
      // Initialize attendance state
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
      console.error("Error:", error);
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
      console.error("Error fetching existing attendance:", error);
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
      
      const records = Object.values(attendance).map((record) => ({
        child_id: record.child_id,
        service_date: serviceDate,
        present: record.present,
        notes: record.notes,
        recorded_by: user.id,
      }));

      const { error } = await supabase
        .from("attendance")
        .upsert(records, {
          onConflict: "child_id,service_date",
        }) as any;

      if (error) throw error;

      toast.success("Attendance saved successfully");
    } catch (error: any) {
      toast.error("Failed to save attendance");
      console.error("Error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const canEdit = userRole === "admin" || userRole === "servant";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Attendance Tracking</h1>
          </div>
          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Attendance"}
            </Button>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Service Date</CardTitle>
            <CardDescription>Select the date for attendance recording</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label htmlFor="service_date">Date</Label>
              <Input
                id="service_date"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Children Attendance</CardTitle>
            <CardDescription>
              Mark attendance for {children.length} {children.length === 1 ? "child" : "children"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="flex items-start gap-4 rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`present-${child.id}`}
                      checked={attendance[child.id]?.present}
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
                  </div>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Add notes (optional)"
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
              ))}
              {children.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No children found. Add children first to record attendance.
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