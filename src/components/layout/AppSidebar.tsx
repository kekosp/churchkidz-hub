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
  UserX,
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
      icon: UserX,
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
      {filterByRole(items).map((item, index) => {
        const active = isActive(item.href);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              onClick={() => navigate(item.href)}
              className={cn(
                "w-full justify-start gap-3 rounded-lg transition-all duration-200",
                active
                  ? "bg-primary/10 text-primary font-medium sidebar-active-indicator"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground hover:translate-x-0.5"
              )}
              tooltip={collapsed ? item.title : undefined}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-all duration-200",
                  active && "scale-110",
                  isRTL && "rtl-flip"
                )}
              />
              {!collapsed && (
                <span className="truncate text-sm">{item.title}</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
      {/* Header with branding */}
      <SidebarHeader className="border-b border-sidebar-border/50 p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-lg shadow-sm transition-transform duration-200 hover:scale-105">
            🏛️
          </div>
          {!collapsed && (
            <div className="flex flex-col animate-slide-in-left">
              <span className="font-semibold text-sidebar-foreground tracking-tight">
                {t("app.title")}
              </span>
              <span className="text-xs text-sidebar-foreground/50 font-medium">
                {userRole && t(`roles.${userRole}`)}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation content */}
      <SidebarContent className="px-3 py-4 space-y-1">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-2 px-2">
              {t("dashboard.title")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>{renderNavItems(mainNavItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-2 mt-4 px-2">
              {t("children.title")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>{renderNavItems(managementItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-2 mt-4 px-2">
              {t("attendance.title")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>{renderNavItems(attendanceItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-2 mt-4 px-2">
              {t("dashboard.viewReports")}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>{renderNavItems(reportsItems)}</SidebarGroupContent>
        </SidebarGroup>

        {userRole === "admin" && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-2 mt-4 px-2">
                {t("roles.admin")}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>{renderNavItems(adminItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer with user info */}
      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        <div className={cn(
          "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/10",
          collapsed && "justify-center p-1"
        )}>
          <Avatar className="h-8 w-8 ring-2 ring-primary/20 transition-all duration-200 hover:ring-primary/40">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-slide-in-left">
              <p className="text-sm font-medium truncate text-sidebar-foreground">
                {user?.email?.split("@")[0]}
              </p>
              <p className="text-[11px] text-sidebar-foreground/40 truncate">
                {user?.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="shrink-0 h-8 w-8 text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
            title={t("auth.signout")}
          >
            <LogOut className={cn("h-4 w-4", isRTL && "rtl-flip")} />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
