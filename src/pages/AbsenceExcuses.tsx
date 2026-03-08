import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, X, Clock, FileText } from "lucide-react";

interface Excuse {
  id: string;
  child_id: string;
  parent_id: string;
  service_date: string;
  reason: string;
  status: string;
  created_at: string;
}

const AbsenceExcuses = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [excuses, setExcuses] = useState<Excuse[]>([]);
  const [children, setChildren] = useState<Record<string, string>>({});
  const [parents, setParents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && userRole !== "admin" && userRole !== "servant") {
      navigate("/dashboard");
    }
  }, [userRole, authLoading, navigate]);

  const fetchExcuses = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("absence_excuses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setExcuses(data || []);

      // Fetch child names
      const childIds = [...new Set((data || []).map((e) => e.child_id))];
      if (childIds.length > 0) {
        const { data: childData } = await supabase
          .from("children")
          .select("id, full_name")
          .in("id", childIds);
        const childMap: Record<string, string> = {};
        (childData || []).forEach((c: any) => { childMap[c.id] = c.full_name; });
        setChildren(childMap);
      }

      // Fetch parent names
      const parentIds = [...new Set((data || []).map((e) => e.parent_id))];
      if (parentIds.length > 0) {
        const { data: parentData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", parentIds);
        const parentMap: Record<string, string> = {};
        (parentData || []).forEach((p: any) => { parentMap[p.id] = p.full_name; });
        setParents(parentMap);
      }
    } catch {
      toast.error(t("excuses.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((userRole === "admin" || userRole === "servant") && user) {
      fetchExcuses();
    }
  }, [userRole, user]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("absence_excuses")
        .update({ status, reviewed_by: user?.id })
        .eq("id", id);
      if (error) throw error;
      toast.success(t("excuses.statusUpdated"));
      setExcuses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status, reviewed_by: user?.id || null } : e))
      );
    } catch {
      toast.error(t("excuses.updateError"));
    }
  };

  const filteredExcuses = filter === "all" ? excuses : excuses.filter((e) => e.status === filter);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-700 border-green-500/20">{t("parentPortal.statusApproved")}</Badge>;
      case "rejected":
        return <Badge variant="destructive">{t("parentPortal.statusRejected")}</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t("parentPortal.statusPending")}</Badge>;
    }
  };

  return (
    <AppLayout title={t("excuses.title")}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("excuses.title")}</h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("excuses.all")}</SelectItem>
              <SelectItem value="pending">{t("parentPortal.statusPending")}</SelectItem>
              <SelectItem value="approved">{t("parentPortal.statusApproved")}</SelectItem>
              <SelectItem value="rejected">{t("parentPortal.statusRejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
        ) : filteredExcuses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mb-2" />
              <p className="text-sm">{t("excuses.noExcuses")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredExcuses.map((excuse) => (
              <Card key={excuse.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {children[excuse.child_id] || excuse.child_id.slice(0, 8)}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("excuses.submittedBy")}: {parents[excuse.parent_id] || excuse.parent_id.slice(0, 8)}
                      </p>
                    </div>
                    {getStatusBadge(excuse.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">{excuse.reason}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {t("excuses.serviceDate")}: {new Date(excuse.service_date).toLocaleDateString()}
                    </p>
                    {excuse.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          onClick={() => updateStatus(excuse.id, "approved")}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {t("excuses.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => updateStatus(excuse.id, "rejected")}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          {t("excuses.reject")}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AbsenceExcuses;
