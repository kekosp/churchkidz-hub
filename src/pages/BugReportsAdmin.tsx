import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Filter, ExternalLink, Eye, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { AppLayout } from "@/components/layout";

interface BugReport {
  id: string;
  description: string;
  screenshot_url: string | null;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  browser_info: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  user_email?: string;
  signed_screenshot_url?: string;
}

const STATUS_OPTIONS = [
  { value: "open", label: "bugAdmin.statusOpen", color: "bg-yellow-500" },
  { value: "in_progress", label: "bugAdmin.statusInProgress", color: "bg-blue-500" },
  { value: "resolved", label: "bugAdmin.statusResolved", color: "bg-green-500" },
  { value: "closed", label: "bugAdmin.statusClosed", color: "bg-gray-500" },
  { value: "wont_fix", label: "bugAdmin.statusWontFix", color: "bg-red-500" },
];

const BugReportsAdmin = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (userRole !== "admin") {
        navigate("/dashboard");
        toast.error(t("bugAdmin.adminOnly"));
      } else {
        fetchBugReports();
      }
    }
  }, [user, userRole, authLoading, navigate]);

  const fetchBugReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bug_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reportsWithExtras = await Promise.all(
        (data || []).map(async (report) => {
          let user_email = "Anonymous";
          let signed_screenshot_url: string | undefined;
          
          if (report.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", report.user_id)
              .maybeSingle();
            user_email = profile?.email || "Unknown";
          }
          
          if (report.screenshot_url) {
            const { data: signedUrlData } = await supabase.storage
              .from("bug-screenshots")
              .createSignedUrl(report.screenshot_url, 3600);
            signed_screenshot_url = signedUrlData?.signedUrl;
          }
          
          return { ...report, user_email, signed_screenshot_url };
        })
      );

      setBugReports(reportsWithExtras);
    } catch (error) {
      console.error("Error fetching bug reports:", error);
      toast.error(t("bugAdmin.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (reportId: string, newStatus: string) => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("bug_reports")
        .update({ status: newStatus })
        .eq("id", reportId);

      if (error) throw error;

      setBugReports((prev) =>
        prev.map((report) =>
          report.id === reportId ? { ...report, status: newStatus } : report
        )
      );
      
      if (selectedReport?.id === reportId) {
        setSelectedReport((prev) => prev ? { ...prev, status: newStatus } : null);
      }

      toast.success(t("bugAdmin.statusUpdated"));
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(t("bugAdmin.updateError"));
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredReports = bugReports.filter((report) => {
    const matchesSearch =
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={`${statusOption?.color || "bg-gray-500"} text-white`}>
        {t(statusOption?.label || "bugAdmin.statusOpen")}
      </Badge>
    );
  };

  return (
    <AppLayout
      title={t("bugAdmin.title")}
      headerActions={
        <Button onClick={fetchBugReports} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 me-2" />
          {t("bugAdmin.refresh")}
        </Button>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("bugAdmin.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("bugAdmin.filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("bugAdmin.allStatuses")}</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {t(status.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {STATUS_OPTIONS.map((status) => {
          const count = bugReports.filter((r) => r.status === status.value).length;
          return (
            <Card key={status.value} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(status.value)}>
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">{t(status.label)}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("bugAdmin.reportsTitle")}</CardTitle>
          <CardDescription>
            {filteredReports.length} {t("bugAdmin.totalReports")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("bugAdmin.noReports")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("bugAdmin.dateColumn")}</TableHead>
                    <TableHead>{t("bugAdmin.userColumn")}</TableHead>
                    <TableHead className="min-w-[300px]">{t("bugAdmin.descriptionColumn")}</TableHead>
                    <TableHead>{t("bugAdmin.statusColumn")}</TableHead>
                    <TableHead>{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(report.created_at), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{report.user_email}</TableCell>
                      <TableCell>
                        <p className="line-clamp-2 text-sm">{report.description}</p>
                      </TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedReport(report)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{t("bugAdmin.reportDetails")}</DialogTitle>
                                <DialogDescription>
                                  {t("bugAdmin.submittedBy")} {report.user_email || "Unknown"}
                                  {" • "}
                                  {format(new Date(report.created_at), "PPpp")}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 mt-4">
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-medium">{t("bugAdmin.statusColumn")}:</span>
                                  <Select
                                    value={report.status}
                                    onValueChange={(value) => updateStatus(report.id, value)}
                                    disabled={isUpdating}
                                  >
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {STATUS_OPTIONS.map((status) => (
                                        <SelectItem key={status.value} value={status.value}>
                                          {t(status.label)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div>
                                  <h4 className="text-sm font-medium mb-2">{t("bugAdmin.descriptionColumn")}</h4>
                                  <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
                                    {report.description}
                                  </div>
                                </div>

                                {report.signed_screenshot_url && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">{t("bugReport.screenshot")}</h4>
                                    <div className="relative group">
                                      <img
                                        src={report.signed_screenshot_url}
                                        alt="Bug screenshot"
                                        className="max-w-full rounded-md border"
                                      />
                                      <a
                                        href={report.signed_screenshot_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute top-2 right-2 bg-background/80 p-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    </div>
                                  </div>
                                )}

                                {report.steps_to_reproduce && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">{t("bugReport.stepsToReproduce")}</h4>
                                    <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
                                      {report.steps_to_reproduce}
                                    </div>
                                  </div>
                                )}

                                {report.expected_behavior && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">{t("bugReport.expectedBehavior")}</h4>
                                    <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
                                      {report.expected_behavior}
                                    </div>
                                  </div>
                                )}

                                {report.actual_behavior && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">{t("bugReport.actualBehavior")}</h4>
                                    <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
                                      {report.actual_behavior}
                                    </div>
                                  </div>
                                )}

                                {report.browser_info && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">{t("bugAdmin.browserInfo")}</h4>
                                    <div className="bg-muted rounded-md p-3 text-sm font-mono">
                                      {report.browser_info}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default BugReportsAdmin;
