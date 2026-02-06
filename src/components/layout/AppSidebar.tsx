import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  UserCheck,
  ClipboardList,
  BarChart3,
  Shield,
  QrCode,
  ScanLine,
  UserCog,
  Trophy,
  Bug,
  ScanBarcode,
  LogOut,
  LayoutDashboard,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: ("admin" | "servant" | "parent")[];
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const { t, isRTL } = useLanguage();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const mainNavItems: NavItem[] = [
    {
      title: t("dashboard.title"),
      icon: LayoutDashboard,
      href: "/dashboard",
    },
  ];

  const managementItems: NavItem[] = [
    {
      title: t("dashboard.manageChildren"),
      icon: Users,
      href: "/children",
    },
    {
      title: t("dashboard.manageServants"),
      icon: UserCheck,
      href: "/servants",
      roles: ["admin"],
    },
  ];

  const attendanceItems: NavItem[] = [
    {
      title: t("dashboard.recordAttendance"),
      icon: ClipboardList,
      href: "/attendance",
    },
    {
      title: t("dashboard.servantAttendance"),
      icon: UserCog,
      href: "/servant-attendance",
      roles: ["admin"],
    },
    {
      title: t("dashboard.scanQR"),
      icon: ScanLine,
      href: "/qr-scanner",
      roles: ["admin", "servant"],
    },
    {
      title: t("dashboard.bulkQRCheckin"),
      icon: ScanBarcode,
      href: "/bulk-qr-checkin",
      roles: ["admin", "servant"],
    },
    {
      title: t("dashboard.qrCodes"),
      icon: QrCode,
      href: "/qr-codes",
    },
  ];

  const reportsItems: NavItem[] = [
    {
      title: t("dashboard.viewReports"),
      icon: BarChart3,
      href: "/reports",
      roles: ["admin", "servant"],
    },
    {
      title: t("dashboard.absentChildren"),
      icon: Users,
      href: "/absent-children",
      roles: ["admin"],
    },
    {
      title: t("dashboard.tayoPoints"),
      icon: Trophy,
      href: "/tayo-points",
    },
  ];

  const adminItems: NavItem[] = [
    {
      title: t("dashboard.manageRoles"),
      icon: Shield,
      href: "/manage-roles",
      roles: ["admin"],
    },
    {
      title: t("dashboard.bugReports"),
      icon: Bug,
      href: "/bug-reports",
      roles: ["admin"],
    },
  ];

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => !item.roles || (userRole && item.roles.includes(userRole)));

  const isActive = (href: string) => location.pathname === href;

  const renderNavItems = (items: NavItem[]) => (
    <SidebarMenu>
      {filterByRole(items).map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            onClick={() => navigate(item.href)}
            className={cn(
              "w-full justify-start gap-3 transition-colors",
              isActive(item.href)
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted"
            )}
            tooltip={collapsed ? item.title : undefined}
          >
            <item.icon className={cn("h-5 w-5 shrink-0", isRTL && "rtl-flip")} />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            🏛️
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{t("app.title")}</span>
              <span className="text-xs text-muted-foreground">
                {userRole && t(`roles.${userRole}`)}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground mb-2">
              {t("dashboard.title")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>{renderNavItems(mainNavItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground mb-2 mt-4">
              {t("children.title")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>{renderNavItems(managementItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground mb-2 mt-4">
              {t("attendance.title")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>{renderNavItems(attendanceItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground mb-2 mt-4">
              {t("dashboard.viewReports")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>{renderNavItems(reportsItems)}</SidebarGroupContent>
        </SidebarGroup>

        {userRole === "admin" && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground mb-2 mt-4">
                {t("roles.admin")}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>{renderNavItems(adminItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="shrink-0"
            title={t("auth.signout")}
          >
            <LogOut className={cn("h-4 w-4", isRTL && "rtl-flip")} />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
