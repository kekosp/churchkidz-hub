import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  QrCode,
  Home,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: ("admin" | "servant" | "parent" | "child")[];
  badge?: number;
}

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { t, isRTL } = useLanguage();
  const unreadCount = useUnreadMessages();

  const isActive = (href: string) => location.pathname === href;

  const renderItem = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <button
        key={item.href}
        onClick={() => navigate(item.href)}
        className={cn(
          "relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all duration-200 min-w-0 flex-1",
          active
            ? "text-primary nav-active-dot"
            : "text-muted-foreground hover:text-foreground active:scale-95"
        )}
      >
        <div className={cn("p-1.5 rounded-lg transition-all duration-200", active && "bg-primary/10 scale-110")}>
          <item.icon className={cn("h-5 w-5", isRTL && "rtl-flip")} />
        </div>
        <span className={cn("text-[10px] font-medium truncate max-w-[56px]", active && "font-semibold")}>
          {item.title}
        </span>
        {item.badge && item.badge > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground px-1">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </button>
    );
  };

  // Child role
  if (userRole === "child") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div className="flex items-center justify-around px-1 py-1.5">
          {renderItem({ title: t("childDashboard.title"), icon: LayoutDashboard, href: "/child-dashboard" })}
        </div>
        <div className="h-safe-bottom bg-background" />
      </nav>
    );
  }

  // Parent role
  if (userRole === "parent") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div className="flex items-center justify-around px-1 py-1.5">
          {renderItem({ title: t("parentPortal.title"), icon: Home, href: "/parent-portal" })}
        </div>
        <div className="h-safe-bottom bg-background" />
      </nav>
    );
  }

  // Admin / Servant
  const navItems: NavItem[] = [
    { title: t("dashboard.title"), icon: LayoutDashboard, href: "/dashboard" },
    { title: t("children.title"), icon: Users, href: "/children" },
    { title: t("attendance.title"), icon: ClipboardList, href: "/attendance" },
    { title: t("messages.title"), icon: MessageSquare, href: "/messages", roles: ["admin", "servant"], badge: unreadCount },
    { title: t("dashboard.viewReports"), icon: BarChart3, href: "/reports", roles: ["admin", "servant"] },
  ];

  const filteredItems = navItems.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex items-center justify-around px-1 py-1.5">
        {filteredItems.slice(0, 5).map(renderItem)}
      </div>
      <div className="h-safe-bottom bg-background" />
    </nav>
  );
}
