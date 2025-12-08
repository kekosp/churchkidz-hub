import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Send, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface AbsentChild {
  id: string;
  full_name: string;
  parent_name: string;
  parent_phone: string;
}

const AbsentChildren = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
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
      toast.error(t('absentChildren.noPermission'));
      return;
    }
    if (user && (userRole === "admin" || userRole === "servant")) {
      fetchAbsentChildren();
    }
  }, [user, userRole, authLoading, navigate, selectedDate]);

  const fetchAbsentChildren = async () => {
    try {
      setLoading(true);

      const { data: allChildren, error: childrenError } = await supabase
        .from("children")
        .select("id, full_name, parent_name, parent_phone");

      if (childrenError) throw childrenError;

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("child_id, present")
        .eq("service_date", selectedDate);

      if (attendanceError) throw attendanceError;

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
      toast.error(t('absentChildren.loadError'));
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendAbsenceNotifications = async () => {
    if (absentChildren.length === 0) {
      toast.error(t('absentChildren.noChildren'));
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
            date: format(parseISO(selectedDate), "dd/MM/yyyy"),
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
      toast.success(`${t('absentChildren.notifySuccess')} (${successCount})`);
    }
    if (failCount > 0) {
      toast.error(`${t('absentChildren.notifyPartialError')} (${failCount})`);
    }
  };

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
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('absentChildren.title')}</h1>
              <p className="text-muted-foreground">{t('absentChildren.subtitle')}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>
          {absentChildren.length > 0 && userRole === "admin" && (
            <Button
              onClick={sendAbsenceNotifications}
              disabled={sending}
              className={isRTL ? "mr-auto" : "ml-auto"}
            >
              <Send className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {sending ? t('absentChildren.sending') : `${t('absentChildren.sendWhatsApp')} ${absentChildren.length} ${t('absentChildren.parents')}`}
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('absentChildren.title')} - {format(parseISO(selectedDate), "MMMM dd, yyyy")}</CardTitle>
            <CardDescription>
              {absentChildren.length === 0
                ? t('absentChildren.allAttended')
                : `${absentChildren.length} ${t('absentChildren.absentCount')}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {absentChildren.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {t('absentChildren.noAbsent')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('absentChildren.childName')}</TableHead>
                    <TableHead>{t('absentChildren.parentName')}</TableHead>
                    <TableHead>{t('absentChildren.parentPhone')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absentChildren.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell className="font-medium">{child.full_name}</TableCell>
                      <TableCell>{child.parent_name}</TableCell>
                      <TableCell dir="ltr">{child.parent_phone}</TableCell>
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
