import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";

const Servants = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [servants, setServants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServants = servants.filter((servant) =>
    servant.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    servant.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    servant.profiles?.phone_number?.includes(searchQuery)
  );

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
          <div className="relative max-w-sm mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search') || "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
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
              {filteredServants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {servants.length === 0 ? t('servants.noServants') : "No results found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredServants.map((servant) => (
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
