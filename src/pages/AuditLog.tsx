import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, History, UserPlus, UserMinus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  user_email?: string;
}

const AuditLog = () => {
  const navigate = useNavigate();
  const { userRole, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTable, setFilterTable] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    if (!authLoading && userRole !== "admin") {
      toast.error(t("auditLog.adminOnly"));
      navigate("/dashboard");
    }
  }, [userRole, authLoading, navigate, t]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterTable !== "all") {
        query = query.eq("table_name", filterTable);
      }
      if (filterAction !== "all") {
        query = query.eq("action", filterAction);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user emails for display
      const userIds = [...new Set((data || []).map(l => l.user_id).filter(Boolean))] as string[];
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);
        if (profiles) {
          profiles.forEach(p => {
            profilesMap[p.id] = p.email || p.full_name;
          });
        }
      }

      setLogs((data || []).map(l => ({
        ...l,
        old_data: l.old_data as Record<string, unknown> | null,
        new_data: l.new_data as Record<string, unknown> | null,
        user_email: l.user_id ? profilesMap[l.user_id] || "Unknown" : "System",
      })));
    } catch (error) {
      toast.error(t("auditLog.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "admin") {
      fetchLogs();
    }
  }, [userRole, filterTable, filterAction]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "INSERT": return <UserPlus className="h-4 w-4" />;
      case "UPDATE": return <Pencil className="h-4 w-4" />;
      case "DELETE": return <Trash2 className="h-4 w-4" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT": return "bg-green-500/10 text-green-700 border-green-500/20";
      case "UPDATE": return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "DELETE": return "bg-red-500/10 text-red-700 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTableLabel = (table: string) => {
    switch (table) {
      case "children": return t("auditLog.tableChildren");
      case "attendance": return t("auditLog.tableAttendance");
      case "user_roles": return t("auditLog.tableRoles");
      default: return table;
    }
  };

  const getRecordSummary = (entry: AuditLogEntry) => {
    const data = entry.new_data || entry.old_data;
    if (!data) return entry.record_id || "";
    if (data.full_name) return String(data.full_name);
    if (data.role) return String(data.role);
    if (data.child_id) return `Child: ${String(data.child_id).slice(0, 8)}...`;
    return entry.record_id?.slice(0, 8) + "..." || "";
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.user_email?.toLowerCase().includes(q)) ||
      (log.table_name.toLowerCase().includes(q)) ||
      (getRecordSummary(log).toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout title={t("auditLog.title")}>
      <div className="space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("auditLog.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t("auditLog.filterTable")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("auditLog.allTables")}</SelectItem>
                  <SelectItem value="children">{t("auditLog.tableChildren")}</SelectItem>
                  <SelectItem value="attendance">{t("auditLog.tableAttendance")}</SelectItem>
                  <SelectItem value="user_roles">{t("auditLog.tableRoles")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t("auditLog.filterAction")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("auditLog.allActions")}</SelectItem>
                  <SelectItem value="INSERT">{t("auditLog.actionCreate")}</SelectItem>
                  <SelectItem value="UPDATE">{t("auditLog.actionUpdate")}</SelectItem>
                  <SelectItem value="DELETE">{t("auditLog.actionDelete")}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {t("bugAdmin.refresh")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {t("auditLog.title")} ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("common.noData")}</p>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                    <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{log.user_email}</span>
                        <Badge variant="outline" className="text-xs">
                          {log.action === "INSERT" ? t("auditLog.actionCreate") : 
                           log.action === "UPDATE" ? t("auditLog.actionUpdate") : 
                           t("auditLog.actionDelete")}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {getTableLabel(log.table_name)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getRecordSummary(log)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AuditLog;
