import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, BarChart3, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto px-4 py-12">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('app.title')}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('app.subtitle')}
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
            {t('landing.getStarted')}
          </Button>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit mb-2">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t('landing.childrenManagement')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('landing.childrenManagementDesc')}
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto rounded-full bg-secondary/10 p-4 w-fit mb-2">
                <ClipboardList className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle>{t('landing.attendanceTracking')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('landing.attendanceTrackingDesc')}
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit mb-2">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>{t('landing.reportsAnalytics')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('landing.reportsAnalyticsDesc')}
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto rounded-full bg-secondary/10 p-4 w-fit mb-2">
                <Shield className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle>{t('landing.roleBasedAccess')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                {t('landing.roleBasedAccessDesc')}
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t('landing.features')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">{t('landing.forAdmins')}</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ {t('landing.forAdminsDesc')}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">{t('landing.forServants')}</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ {t('landing.forServantsDesc')}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">{t('landing.forParents')}</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ {t('landing.forParentsDesc')}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">{t('landing.systemBenefits')}</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✓ {t('landing.benefit1')}</li>
                  <li>✓ {t('landing.benefit2')}</li>
                  <li>✓ {t('landing.benefit3')}</li>
                  <li>✓ {t('landing.benefit4')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
