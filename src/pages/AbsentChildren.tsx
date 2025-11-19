import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Send, Calendar } from "lucide-react";
import { format } from "date-fns";

interface AbsentChild {
  id: string;
  full_name: string;
  parent_name: string;
  parent_phone: string;
}

const AbsentChildren = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [absentChildren, setAbsentChildren] = useState<AbsentChild[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!authLoading && userRole !== "admin" && userRole !== "servant") {
      navigate("/dashboard");
      toast.error("You don't have permission to access this page");
      return;
    }
    if (user && (userRole === "admin" || userRole === "servant")) {
      fetchAbsentChildren();
    }
  }, [user, userRole, authLoading, navigate, selectedDate]);

  const fetchAbsentChildren = async () => {
    try {
      setLoading(true);

      // Fetch all children that the user can see (RLS will filter)
      const { data: allChildren, error: childrenError } = await supabase
        .from("children")
        .select("id, full_name, parent_name, parent_phone");

      if (childrenError) throw childrenError;

      // Fetch attendance records for the selected date
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("child_id, present")
        .eq("service_date", selectedDate);

      if (attendanceError) throw attendanceError;

      // Find children who don't have attendance records or were marked absent
      const attendedChildIds = new Set(
        (attendanceData || [])
          .filter((a: any) => a.present)
          .map((a: any) => a.child_id)
      );

      const absentList = (allChildren || []).filter(
        (child: any) => !attendedChildIds.has(child.id)
      );

      setAbsentChildren(absentList);
    } catch (error: any) {
      toast.error("Failed to load absent children");
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendAbsenceNotifications = async () => {
    if (absentChildren.length === 0) {
      toast.error("No absent children to notify");
      return;
    }

    setSending(true);
    let successCount = 0;
    let failCount = 0;

    for (const child of absentChildren) {
      try {
        const { error } = await supabase.functions.invoke("send-whatsapp-absence", {
          body: {
            childName: child.full_name,
            parentPhone: child.parent_phone,
            date: format(new Date(selectedDate), "dd/MM/yyyy"),
          },
        });

        if (error) throw error;
        successCount++;
      } catch (error: any) {
        console.error(`Failed to send notification for ${child.full_name}:`, error);
        failCount++;
      }
    }

    setSending(false);

    if (successCount > 0) {
      toast.success(`Successfully sent ${successCount} WhatsApp notifications`);
    }
    if (failCount > 0) {
      toast.error(`Failed to send ${failCount} notifications`);
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
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Absent Children Report</h1>
              <p className="text-muted-foreground">View and notify parents of absent children</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {absentChildren.length > 0 && userRole === "admin" && (
            <Button
              onClick={sendAbsenceNotifications}
              disabled={sending}
              className="ml-auto"
            >
              <Send className="mr-2 h-4 w-4" />
              {sending ? "Sending..." : `Send WhatsApp to ${absentChildren.length} Parents`}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Absent Children on {format(new Date(selectedDate), "MMMM dd, yyyy")}</CardTitle>
            <CardDescription>
              {absentChildren.length === 0
                ? "All children attended on this date"
                : `${absentChildren.length} children were absent`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {absentChildren.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No absent children for this date
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Child Name</TableHead>
                    <TableHead>Parent Name</TableHead>
                    <TableHead>Parent Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absentChildren.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell className="font-medium">{child.full_name}</TableCell>
                      <TableCell>{child.parent_name}</TableCell>
                      <TableCell>{child.parent_phone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AbsentChildren;
