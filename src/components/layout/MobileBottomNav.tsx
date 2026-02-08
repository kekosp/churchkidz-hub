import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
  roles?: ("admin" | "servant" | "parent")[];
}

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { t, isRTL } = useLanguage();

  const navItems: NavItem[] = [
    {
      title: t("dashboard.title"),
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: t("children.title"),
      icon: Users,
      href: "/children",
    },
    {
      title: t("attendance.title"),
      icon: ClipboardList,
      href: "/attendance",
    },
    {
      title: t("dashboard.qrCodes"),
      icon: QrCode,
      href: "/qr-codes",
    },
    {
      title: t("dashboard.viewReports"),
      icon: BarChart3,
      href: "/reports",
      roles: ["admin", "servant"],
    },
  ];

  const filteredItems = navItems.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  );

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex items-center justify-around px-1 py-1.5">
        {filteredItems.slice(0, 5).map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]",
                active
                  ? "text-primary nav-active-dot"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                active && "bg-primary/10 scale-110"
              )}>
                <item.icon className={cn("h-5 w-5", isRTL && "rtl-flip")} />
              </div>
              <span className={cn(
                "text-[10px] font-medium truncate max-w-[56px] transition-all duration-200",
                active && "font-semibold"
              )}>
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-safe-bottom bg-background" />
    </nav>
  );
}
