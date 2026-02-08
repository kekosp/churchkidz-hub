import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, ClipboardList, BarChart3, Shield, QrCode, ScanLine, UserCog, Trophy, Bug, ScanBarcode, TrendingUp, Calendar, Clock, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { t } = useLanguage();
  const { todayPresent, totalChildren, totalAttendanceRecords, loading: statsLoading, lastUpdated, refresh } = useDashboardStats();

  const roleTranslations: Record<string, string> = {
    admin: t("roles.admin"),
    servant: t("roles.servant"),
    parent: t("roles.parent"),
  };

  // Quick actions - most used features based on role
  const adminQuickActions: QuickAction[] = [
    {
      title: t("dashboard.recordAttendance"),
      description: t("dashboard.recordAttendanceDesc"),
      icon: ClipboardList,
      href: "/attendance",
      color: "bg-primary/10 text-primary",
    },
    {
      title: t("dashboard.scanQR"),
      description: t("dashboard.scanQRDesc"),
      icon: ScanLine,
      href: "/qr-scanner",
      color: "bg-chart-2/20 text-chart-2",
    },
    {
      title: t("dashboard.manageChildren"),
      description: t("dashboard.manageChildrenDesc"),
      icon: Users,
      href: "/children",
      color: "bg-chart-3/20 text-chart-3",
    },
    {
      title: t("dashboard.viewReports"),
      description: t("dashboard.viewReportsDesc"),
      icon: BarChart3,
      href: "/reports",
      color: "bg-chart-4/20 text-chart-4",
    },
  ];

  const servantQuickActions: QuickAction[] = [
    {
      title: t("dashboard.recordAttendance"),
      description: t("dashboard.recordAttendanceDesc"),
      icon: ClipboardList,
      href: "/attendance",
      color: "bg-primary/10 text-primary",
    },
    {
      title: t("dashboard.scanQR"),
      description: t("dashboard.scanQRDesc"),
      icon: ScanLine,
      href: "/qr-scanner",
      color: "bg-chart-2/20 text-chart-2",
    },
    {
      title: t("dashboard.myChildren"),
      description: t("dashboard.myChildrenDesc"),
      icon: Users,
      href: "/children",
      color: "bg-chart-3/20 text-chart-3",
    },
    {
      title: t("dashboard.tayoPoints"),
      description: t("dashboard.tayoPointsDesc"),
      icon: Trophy,
      href: "/tayo-points",
      color: "bg-chart-4/20 text-chart-4",
    },
  ];

  const parentQuickActions: QuickAction[] = [
    {
      title: t("dashboard.myChildren"),
      description: t("dashboard.myChildrenDesc"),
      icon: Users,
      href: "/children",
      color: "bg-primary/10 text-primary",
    },
    {
      title: t("dashboard.qrCodes"),
      description: t("dashboard.qrCodesDesc"),
      icon: QrCode,
      href: "/qr-codes",
      color: "bg-chart-2/20 text-chart-2",
    },
    {
      title: t("dashboard.attendanceHistory"),
      description: t("dashboard.attendanceHistoryDesc"),
      icon: ClipboardList,
      href: "/attendance",
      color: "bg-chart-3/20 text-chart-3",
    },
    {
      title: t("dashboard.tayoPoints"),
      description: t("dashboard.tayoPointsDesc"),
      icon: Trophy,
      href: "/tayo-points",
      color: "bg-chart-4/20 text-chart-4",
    },
  ];

  const quickActions =
    userRole === "admin"
      ? adminQuickActions
      : userRole === "servant"
      ? servantQuickActions
      : parentQuickActions;

  // Stats cards (placeholder - would be connected to real data)
  const statsCards = [
    {
      title: t("common.present"),
      value: todayPresent,
      icon: UserCheck,
      description: t("dashboard.recordAttendanceDesc"),
      color: "text-green-600",
    },
    {
      title: t("landing.childrenManagement"),
      value: totalChildren,
      icon: Users,
      description: t("dashboard.manageChildrenDesc"),
      color: "text-primary",
    },
    {
      title: t("attendance.title"),
      value: totalAttendanceRecords,
      icon: Calendar,
      description: t("dashboard.viewReportsDesc"),
      color: "text-chart-3",
    },
  ];

  return (
    <AppLayout title={t("dashboard.title")}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <h2 className="text-2xl font-bold text-foreground">
            {t("dashboard.welcome")}, {user?.email?.split("@")[0]}!
          </h2>
          <p className="text-muted-foreground mt-1">
            {roleTranslations[userRole || ""] || t("dashboard.noRole")}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{t("dashboard.title")}</h3>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={statsLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", statsLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {statsCards.map((stat, index) => (
            <Card key={index} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={cn("rounded-lg p-2 bg-muted/50", stat.color)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {statsLoading ? <Skeleton className="h-7 w-10 inline-block" /> : stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold mb-4">{t("dashboard.title")}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] border-0 shadow-sm"
                onClick={() => navigate(action.href)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className={cn("rounded-lg p-3 w-fit", action.color)}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{action.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* No Role Warning */}
        {!userRole && (
          <Card className="border-warning bg-warning/10">
            <CardHeader>
              <CardTitle className="text-warning">{t("dashboard.noRole")}</CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
