import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface AppHeaderProps {
  title?: string;
  children?: React.ReactNode;
}

export function AppHeader({ title, children }: AppHeaderProps) {
  const { isRTL } = useLanguage();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/50 bg-background/95 px-4 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className={cn("shrink-0 text-muted-foreground hover:text-foreground transition-colors", isRTL && "rtl-flip")} />
      
      {title && (
        <>
          <Separator orientation="vertical" className="h-5 bg-border/50" />
          <h1 className="text-base font-semibold truncate text-foreground tracking-tight animate-fade-in">
            {title}
          </h1>
        </>
      )}
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-2">
        {children}
        <LanguageSwitcher />
      </div>
    </header>
  );
}
