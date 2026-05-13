import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SearchOverlay } from "@/components/SmartSearch";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export const HeroBanner = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const { t, localePath } = useI18n();
  const navigate = useNavigate();

  return (
    <>
      <section className="relative overflow-hidden bg-primary">
        {/* Repeating snaffle-bit silhouette pattern – subtle wallpaper effect */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='80' viewBox='0 0 140 80'%3E%3Cg fill='%23fff' fill-rule='evenodd'%3E%3Ccircle cx='22' cy='40' r='15' fill='none' stroke='%23fff' stroke-width='3'/%3E%3Ccircle cx='118' cy='40' r='15' fill='none' stroke='%23fff' stroke-width='3'/%3E%3Cpath d='M36 38 C42 34 50 32 58 34 C62 35 65 37 68 39 L70 40 L68 41 C65 43 62 45 58 46 C50 48 42 46 36 42 Z' fill='%23fff'/%3E%3Cpath d='M104 38 C98 34 90 32 82 34 C78 35 75 37 72 39 L70 40 L72 41 C75 43 78 45 82 46 C90 48 98 46 104 42 Z' fill='%23fff'/%3E%3Ccircle cx='70' cy='40' r='3'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '140px 80px',
        }} />
        <div className="relative container mx-auto px-4 py-6 sm:py-12 lg:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-primary-foreground text-xs font-semibold tracking-wide uppercase mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              {t("hero.badge")}
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight mb-2 sm:mb-4">
              {t("hero.title")}{" "}
              <span className="text-primary-foreground/80">{t("hero.title_highlight")}</span>
            </h1>
            <p className="text-primary-foreground/90 text-sm sm:text-lg max-w-xl mx-auto mb-4 sm:mb-8 hidden sm:block">
              {t("hero.subtitle")}
            </p>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "w-full max-w-2xl mx-auto flex items-center gap-3",
                "h-14 sm:h-16 px-5 rounded-2xl",
                "bg-background border-2 border-background/80",
                "shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20",
                "hover:border-background focus:border-background focus:ring-2 focus:ring-background/30",
                "transition-all duration-200 cursor-text group"
              )}
            >
              <Search className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              <span className="text-muted-foreground text-base sm:text-lg text-left">
                {t("hero.search_placeholder")}
              </span>
            </button>


          </div>
        </div>
      </section>
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
