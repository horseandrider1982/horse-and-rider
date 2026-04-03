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
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--primary)/0.08)] via-background to-[hsl(var(--primary)/0.04)]">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative container mx-auto px-4 py-6 sm:py-12 lg:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              {t("hero.badge")}
            </div>
            <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-2 sm:mb-4">
              {t("hero.title")}{" "}
              <span className="text-primary">{t("hero.title_highlight")}</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-xl mx-auto mb-4 sm:mb-8 hidden sm:block">
              {t("hero.subtitle")}
            </p>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className={cn(
                "w-full max-w-2xl mx-auto flex items-center gap-3",
                "h-14 sm:h-16 px-5 rounded-2xl",
                "bg-background border-2 border-border",
                "shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10",
                "hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20",
                "transition-all duration-200 cursor-text group"
              )}
            >
              <Search className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              <span className="text-muted-foreground text-base sm:text-lg text-left">
                {t("hero.search_placeholder")}
              </span>
            </button>
            <div className="flex flex-wrap justify-center gap-2 mt-3 sm:mt-5">
              <span className="text-xs text-muted-foreground self-center mr-1">{t("hero.popular")}</span>
              {(["winterdecke", "airbagweste", "schabracke", "reithelm", "gamaschen", "turnierbekleidung"] as const).map((chipKey) => (
                <button
                  key={chipKey}
                  onClick={() => navigate(localePath(`/search?q=${encodeURIComponent(t(`hero.chip.${chipKey}`))}`)) }
                  className={cn(
                    "px-3 py-1.5 sm:py-1 rounded-full text-xs font-medium min-h-[36px] sm:min-h-0",
                    "border border-border bg-background/80",
                    "text-muted-foreground hover:text-primary hover:border-primary/40",
                    "transition-colors"
                  )}
                >
                  {t(`hero.chip.${chipKey}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
