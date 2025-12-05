import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Servants = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [servants, setServants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    if (authLoading || userRole === null) {
      return;
    }
    
    if (userRole === "admin" || userRole === "servant") {
      fetchServants();
    } else {
      navigate("/dashboard");
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
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
            {t('common.back')}
          </Button>
          <h1 className="text-3xl font-bold">{t('servants.title')}</h1>
        </div>

        <Card>
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
      </div>
    </div>
  );
};

export default Servants;
