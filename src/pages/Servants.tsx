import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";

const Servants = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [servants, setServants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || userRole === null) {
      return;
    }
    
    if (userRole !== "admin" && userRole !== "servant") {
      navigate("/dashboard");
      return;
    }
    
    if (user) {
      fetchServants();
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchServants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, profiles(full_name, phone_number, email)")
        .eq("role", "servant") as any;

      if (error) throw error;
      setServants(data || []);
    } catch (error: any) {
      toast.error("Failed to load servants");
      if (import.meta.env.DEV) {
        console.error("Error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title={t('servants.title')}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('servants.title')}>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{t('servants.title')}</CardTitle>
          <CardDescription>
            {servants.length} {t('roles.servant')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.name')}</TableHead>
                <TableHead>{t('common.email')}</TableHead>
                <TableHead>{t('common.phone')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {t('servants.noServants')}
                  </TableCell>
                </TableRow>
              ) : (
                servants.map((servant) => (
                  <TableRow key={servant.user_id}>
                    <TableCell className="font-medium">{servant.profiles?.full_name}</TableCell>
                    <TableCell dir="ltr">{servant.profiles?.email}</TableCell>
                    <TableCell dir="ltr">{servant.profiles?.phone_number || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Servants;
