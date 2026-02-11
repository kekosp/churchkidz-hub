import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";

interface PresentChild {
  id: string;
  full_name: string;
  parent_name: string;
  school_grade: string | null;
}

const PresentChildren = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [presentChildren, setPresentChildren] = useState<PresentChild[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setSelectedDate(value);
    }
  };

  const getFormattedDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    if (!authLoading && userRole !== "admin" && userRole !== "servant") {
      navigate("/dashboard");
      toast.error(t('presentChildren.noPermission'));
      return;
    }
    if (user && (userRole === "admin" || userRole === "servant")) {
      fetchPresentChildren();
    }
  }, [user, userRole, authLoading, navigate, selectedDate]);

  const fetchPresentChildren = async () => {
    try {
      setLoading(true);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("child_id")
        .eq("service_date", selectedDate)
        .eq("present", true);

      if (attendanceError) throw attendanceError;

      const presentChildIds = (attendanceData || []).map((a: any) => a.child_id);

      if (presentChildIds.length === 0) {
        setPresentChildren([]);
        return;
      }

      const { data: children, error: childrenError } = await supabase
        .from("children_safe_view" as any)
        .select("id, full_name, parent_name, school_grade")
        .in("id", presentChildIds) as { data: PresentChild[] | null; error: any };

      if (childrenError) throw childrenError;

      setPresentChildren(children || []);
    } catch (error: any) {
      toast.error(t('presentChildren.loadError'));
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title={t('presentChildren.title')}>
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            dir="ltr"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('presentChildren.title')} - {getFormattedDate(selectedDate)}</CardTitle>
          <CardDescription>
            {presentChildren.length === 0
              ? t('presentChildren.nonePresent')
              : `${presentChildren.length} ${t('presentChildren.presentCount')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : presentChildren.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {t('presentChildren.nonePresent')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t('presentChildren.childName')}</TableHead>
                  <TableHead>{t('presentChildren.parentName')}</TableHead>
                  <TableHead>{t('presentChildren.grade')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presentChildren.map((child, index) => (
                  <TableRow key={child.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{child.full_name}</TableCell>
                    <TableCell>{child.parent_name}</TableCell>
                    <TableCell>{child.school_grade || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default PresentChildren;
