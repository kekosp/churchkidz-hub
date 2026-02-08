import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserCheck,
  ClipboardList,
  BarChart3,
  QrCode,
  ScanLine,
  Trophy,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  gradient: string;
  iconColor: string;
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

  const adminQuickActions: QuickAction[] = [
    {
      title: t("dashboard.recordAttendance"),
      description: t("dashboard.recordAttendanceDesc"),
      icon: ClipboardList,
      href: "/attendance",
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary bg-primary/10",
    },
    {
      title: t("dashboard.scanQR"),
      description: t("dashboard.scanQRDesc"),
      icon: ScanLine,
      href: "/qr-scanner",
      gradient: "from-chart-2/15 to-chart-2/5",
      iconColor: "text-chart-2 bg-chart-2/10",
    },
    {
      title: t("dashboard.manageChildren"),
      description: t("dashboard.manageChildrenDesc"),
      icon: Users,
      href: "/children",
      gradient: "from-chart-3/15 to-chart-3/5",
      iconColor: "text-chart-3 bg-chart-3/10",
    },
    {
      title: t("dashboard.viewReports"),
      description: t("dashboard.viewReportsDesc"),
      icon: BarChart3,
      href: "/reports",
      gradient: "from-chart-4/15 to-chart-4/5",
      iconColor: "text-chart-4 bg-chart-4/10",
    },
  ];

  const servantQuickActions: QuickAction[] = [
    {
      title: t("dashboard.recordAttendance"),
      description: t("dashboard.recordAttendanceDesc"),
      icon: ClipboardList,
      href: "/attendance",
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary bg-primary/10",
    },
    {
      title: t("dashboard.scanQR"),
      description: t("dashboard.scanQRDesc"),
      icon: ScanLine,
      href: "/qr-scanner",
      gradient: "from-chart-2/15 to-chart-2/5",
      iconColor: "text-chart-2 bg-chart-2/10",
    },
    {
      title: t("dashboard.myChildren"),
      description: t("dashboard.myChildrenDesc"),
      icon: Users,
      href: "/children",
      gradient: "from-chart-3/15 to-chart-3/5",
      iconColor: "text-chart-3 bg-chart-3/10",
    },
    {
      title: t("dashboard.tayoPoints"),
      description: t("dashboard.tayoPointsDesc"),
      icon: Trophy,
      href: "/tayo-points",
      gradient: "from-chart-4/15 to-chart-4/5",
      iconColor: "text-chart-4 bg-chart-4/10",
    },
  ];

  const parentQuickActions: QuickAction[] = [
    {
      title: t("dashboard.myChildren"),
      description: t("dashboard.myChildrenDesc"),
      icon: Users,
      href: "/children",
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary bg-primary/10",
    },
    {
      title: t("dashboard.qrCodes"),
      description: t("dashboard.qrCodesDesc"),
      icon: QrCode,
      href: "/qr-codes",
      gradient: "from-chart-2/15 to-chart-2/5",
      iconColor: "text-chart-2 bg-chart-2/10",
    },
    {
      title: t("dashboard.attendanceHistory"),
      description: t("dashboard.attendanceHistoryDesc"),
      icon: ClipboardList,
      href: "/attendance",
      gradient: "from-chart-3/15 to-chart-3/5",
      iconColor: "text-chart-3 bg-chart-3/10",
    },
    {
      title: t("dashboard.tayoPoints"),
      description: t("dashboard.tayoPointsDesc"),
      icon: Trophy,
      href: "/tayo-points",
      gradient: "from-chart-4/15 to-chart-4/5",
      iconColor: "text-chart-4 bg-chart-4/10",
    },
  ];

  const quickActions =
    userRole === "admin"
      ? adminQuickActions
      : userRole === "servant"
      ? servantQuickActions
      : parentQuickActions;

  const statsCards = [
    {
      title: t("common.present"),
      value: todayPresent,
      icon: UserCheck,
      description: t("dashboard.recordAttendanceDesc"),
      iconColor: "text-primary bg-primary/10",
    },
    {
      title: t("landing.childrenManagement"),
      value: totalChildren,
      icon: Users,
      description: t("dashboard.manageChildrenDesc"),
      iconColor: "text-chart-3 bg-chart-3/10",
    },
    {
      title: t("attendance.title"),
      value: totalAttendanceRecords,
      icon: Calendar,
      description: t("dashboard.viewReportsDesc"),
      iconColor: "text-chart-2 bg-chart-2/10",
    },
  ];

  return (
    <AppLayout title={t("dashboard.title")}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {t("dashboard.welcome")}, {user?.email?.split("@")[0]}! 👋
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {roleTranslations[userRole || ""] || t("dashboard.noRole")}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="flex items-center justify-between animate-fade-in animate-delay-75">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("dashboard.title")}
          </h3>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={statsLoading}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", statsLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {statsCards.map((stat, index) => (
            <Card
              key={index}
              className={cn(
                "border-0 shadow-sm hover:shadow-md transition-all duration-300 opacity-0 animate-fade-in-scale",
                index === 0 && "animate-delay-150",
                index === 1 && "animate-delay-200",
                index === 2 && "animate-delay-300"
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={cn("rounded-xl p-2.5 transition-transform duration-200 hover:scale-110", stat.iconColor)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight">
                      {statsLoading ? (
                        <Skeleton className="h-7 w-12 inline-block rounded-md" />
                      ) : (
                        <span className="animate-count-up inline-block">{stat.value}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground/80 font-medium">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="opacity-0 animate-fade-in animate-delay-400">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Quick Actions
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className={cn(
                  "cursor-pointer border-0 shadow-sm overflow-hidden group",
                  "transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 active:shadow-sm"
                )}
                onClick={() => navigate(action.href)}
              >
                <CardContent className={cn("p-4 bg-gradient-to-br", action.gradient)}>
                  <div className="flex flex-col gap-3">
                    <div className={cn(
                      "rounded-xl p-2.5 w-fit transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                      action.iconColor
                    )}>
                      <action.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm tracking-tight">{action.title}</h4>
                      <p className="text-xs text-muted-foreground/70 line-clamp-2 mt-0.5">
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
          <Card className="border-warning bg-warning/10 animate-fade-in">
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
