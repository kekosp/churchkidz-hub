import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Users, UserCheck, ClipboardList, BarChart3, Shield, QrCode, ScanLine } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, loading, signOut } = useAuth();

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
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const adminCards = [
    {
      title: "Manage Children",
      description: "Add, edit, and view all children",
      icon: Users,
      href: "/children",
    },
    {
      title: "Manage Servants",
      description: "Manage teachers and group assignments",
      icon: UserCheck,
      href: "/servants",
    },
    {
      title: "Attendance",
      description: "Record and track attendance",
      icon: ClipboardList,
      href: "/attendance",
    },
    {
      title: "QR Scanner",
      description: "Scan QR codes for instant attendance",
      icon: ScanLine,
      href: "/qr-scanner",
    },
    {
      title: "QR Codes",
      description: "View and download children's QR codes",
      icon: QrCode,
      href: "/qr-codes",
    },
    {
      title: "Reports",
      description: "View statistics and analytics",
      icon: BarChart3,
      href: "/reports",
    },
    {
      title: "Absent Children",
      description: "View absences and send WhatsApp notifications",
      icon: Users,
      href: "/absent-children",
    },
    {
      title: "Manage Roles",
      description: "Assign user roles and permissions",
      icon: Shield,
      href: "/manage-roles",
    },
  ];

  const servantCards = [
    {
      title: "My Children",
      description: "View and manage assigned children",
      icon: Users,
      href: "/children",
    },
    {
      title: "Attendance",
      description: "Record attendance for your group",
      icon: ClipboardList,
      href: "/attendance",
    },
    {
      title: "QR Scanner",
      description: "Scan QR codes for instant attendance",
      icon: ScanLine,
      href: "/qr-scanner",
    },
    {
      title: "QR Codes",
      description: "View and download children's QR codes",
      icon: QrCode,
      href: "/qr-codes",
    },
    {
      title: "Reports",
      description: "View attendance statistics",
      icon: BarChart3,
      href: "/reports",
    },
  ];

  const parentCards = [
    {
      title: "My Child",
      description: "View your child's information",
      icon: Users,
      href: "/children",
    },
    {
      title: "QR Code",
      description: "View your child's QR code",
      icon: QrCode,
      href: "/qr-codes",
    },
    {
      title: "Attendance History",
      description: "View attendance records",
      icon: ClipboardList,
      href: "/attendance",
    },
  ];

  const cards = userRole === "admin" ? adminCards : userRole === "servant" ? servantCards : parentCards;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/10">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Church Kids Management</h1>
            <p className="text-muted-foreground mt-2">
              Welcome back! {userRole && `You are logged in as ${userRole}.`}
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card
              key={card.title}
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
              <CardTitle className="text-warning">No Role Assigned</CardTitle>
              <CardDescription>
                Please contact an administrator to assign you a role (Admin, Servant, or Parent).
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;