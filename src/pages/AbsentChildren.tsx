import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, MessageCircle, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface AbsentChild {
  id: string;
  full_name: string;
  parent_name: string;
  parent_phone: string;
  school_grade: string | null;
}

const AbsentChildren = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [absentChildren, setAbsentChildren] = useState<AbsentChild[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only update if valid date string
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

      // Use secure view that masks sensitive parent contact info based on user role
      const { data: allChildren, error: childrenError } = await supabase
        .from("children_safe_view" as any)
        .select("id, full_name, parent_name, parent_phone, school_grade") as { data: AbsentChild[] | null; error: any };

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

  const openWhatsApp = (child: AbsentChild) => {
    // Format phone number - remove any non-digit characters
    let phone = child.parent_phone.replace(/\D/g, '');
    
    // Ensure it starts with country code (assume Egypt +20 if not present)
    if (!phone.startsWith('20') && phone.startsWith('0')) {
      phone = '20' + phone.substring(1);
    } else if (!phone.startsWith('20')) {
      phone = '20' + phone;
    }
    
    const formattedDate = format(parseISO(selectedDate), "dd/MM/yyyy");
    const grade = child.school_grade || '';
    const message = encodeURIComponent(
      `صباح الخير ${child.parent_name}،\n\nنود إعلامكم بأن ${child.full_name} لم يحضر اجتماع يوم ${formattedDate}.\n\nنتمنى أن يكون كل شيء على ما يرام. نحن نفتقدهم!\n\n#${grade}`
    );
    
    // Open WhatsApp Web link
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
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
              onChange={handleDateChange}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="ltr"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('absentChildren.title')} - {getFormattedDate(selectedDate)}</CardTitle>
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
                    <TableHead className="w-[100px]">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absentChildren.map((child) => (
                    <TableRow key={child.id}>
                      <TableCell className="font-medium">{child.full_name}</TableCell>
                      <TableCell>{child.parent_name}</TableCell>
                      <TableCell dir="ltr">{child.parent_phone}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openWhatsApp(child)}
                          className="gap-1"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </Button>
                      </TableCell>
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
