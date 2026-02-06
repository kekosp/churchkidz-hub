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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {filteredItems.slice(0, 5).map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className={cn("h-5 w-5", isRTL && "rtl-flip")} />
              <span className="text-[10px] font-medium truncate max-w-[56px]">
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
