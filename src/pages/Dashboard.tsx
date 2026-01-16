import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Users, UserCheck, ClipboardList, BarChart3, Shield, QrCode, ScanLine, UserCog, Trophy, Bug } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, loading, signOut } = useAuth();
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const adminCards = [
    {
      title: t('dashboard.manageChildren'),
      description: t('dashboard.manageChildrenDesc'),
      icon: Users,
      href: "/children",
    },
    {
      title: t('dashboard.manageServants'),
      description: t('dashboard.manageServantsDesc'),
      icon: UserCheck,
      href: "/servants",
    },
    {
      title: t('dashboard.recordAttendance'),
      description: t('dashboard.recordAttendanceDesc'),
      icon: ClipboardList,
      href: "/attendance",
    },
    {
      title: t('dashboard.scanQR'),
      description: t('dashboard.scanQRDesc'),
      icon: ScanLine,
      href: "/qr-scanner",
    },
    {
      title: t('dashboard.qrCodes'),
      description: t('dashboard.qrCodesDesc'),
      icon: QrCode,
      href: "/qr-codes",
    },
    {
      title: t('dashboard.viewReports'),
      description: t('dashboard.viewReportsDesc'),
      icon: BarChart3,
      href: "/reports",
    },
    {
      title: t('dashboard.absentChildren'),
      description: t('dashboard.absentChildrenDesc'),
      icon: Users,
      href: "/absent-children",
    },
    {
      title: t('dashboard.manageRoles'),
      description: t('dashboard.manageRolesDesc'),
      icon: Shield,
      href: "/manage-roles",
    },
    {
      title: t('dashboard.servantAttendance'),
      description: t('dashboard.servantAttendanceDesc'),
      icon: UserCog,
      href: "/servant-attendance",
    },
    {
      title: t('dashboard.tayoPoints'),
      description: t('dashboard.tayoPointsDesc'),
      icon: Trophy,
      href: "/tayo-points",
    },
    {
      title: t('dashboard.bugReports'),
      description: t('dashboard.bugReportsDesc'),
      icon: Bug,
      href: "/bug-reports",
    },
  ];

  const servantCards = [
    {
      title: t('dashboard.myChildren'),
      description: t('dashboard.myChildrenDesc'),
      icon: Users,
      href: "/children",
    },
    {
      title: t('dashboard.recordAttendance'),
      description: t('dashboard.recordAttendanceDesc'),
      icon: ClipboardList,
      href: "/attendance",
    },
    {
      title: t('dashboard.scanQR'),
      description: t('dashboard.scanQRDesc'),
      icon: ScanLine,
      href: "/qr-scanner",
    },
    {
      title: t('dashboard.qrCodes'),
      description: t('dashboard.qrCodesDesc'),
      icon: QrCode,
      href: "/qr-codes",
    },
    {
      title: t('dashboard.viewReports'),
      description: t('dashboard.viewReportsDesc'),
      icon: BarChart3,
      href: "/reports",
    },
    {
      title: t('dashboard.tayoPoints'),
      description: t('dashboard.tayoPointsDesc'),
      icon: Trophy,
      href: "/tayo-points",
    },
  ];

  const parentCards = [
    {
      title: t('dashboard.myChildren'),
      description: t('dashboard.myChildrenDesc'),
      icon: Users,
      href: "/children",
    },
    {
      title: t('dashboard.qrCodes'),
      description: t('dashboard.qrCodesDesc'),
      icon: QrCode,
      href: "/qr-codes",
    },
    {
      title: t('dashboard.attendanceHistory'),
      description: t('dashboard.attendanceHistoryDesc'),
      icon: ClipboardList,
      href: "/attendance",
    },
    {
      title: t('dashboard.tayoPoints'),
      description: t('dashboard.tayoPointsDesc'),
      icon: Trophy,
      href: "/tayo-points",
    },
  ];

  const cards = userRole === "admin" ? adminCards : userRole === "servant" ? servantCards : parentCards;

  const roleTranslations: Record<string, string> = {
    admin: t('roles.admin'),
    servant: t('roles.servant'),
    parent: t('roles.parent'),
  };

  const showAnalytics = userRole === "admin" || userRole === "servant";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">{t('app.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('dashboard.welcome')}! {userRole && `${roleTranslations[userRole] || userRole}`}
            </p>
          </div>
          <div className="flex gap-2">
            <LanguageSwitcher />
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className={`h-4 w-4 ${isRTL ? 'rtl-flip' : ''}`} />
              {t('auth.signout')}
            </Button>
          </div>
        </div>

        {/* Analytics Dashboard for Admin/Servant */}
        {showAnalytics && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{t('analytics.title')}</h2>
            <AnalyticsDashboard />
          </div>
        )}

        {/* Quick Actions */}
        <h2 className="text-2xl font-semibold mb-4">{t('dashboard.title')}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <Card
              key={index}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
              onClick={() => navigate(card.href)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <card.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{card.title}</CardTitle>
                    <CardDescription className="mt-1">{card.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {!userRole && (
          <Card className="mt-6 border-warning">
            <CardHeader>
              <CardTitle className="text-warning">{t('dashboard.noRole')}</CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
