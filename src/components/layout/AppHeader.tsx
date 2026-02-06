import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
  children?: React.ReactNode;
}

export function AppHeader({ title, children }: AppHeaderProps) {
  const { isRTL } = useLanguage();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className={cn("shrink-0", isRTL && "rtl-flip")} />
      
      {title && (
        <h1 className="text-lg font-semibold truncate">{title}</h1>
      )}
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-2">
        {children}
        <LanguageSwitcher />
      </div>
    </header>
  );
}
