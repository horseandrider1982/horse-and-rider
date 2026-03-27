import { useI18n } from "@/i18n";
import { Globe, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const FLAG_MAP: Record<string, string> = {
  de: "🇩🇪",
  en: "🇬🇧",
  es: "🇪🇸",
  nl: "🇳🇱",
  pl: "🇵🇱",
  da: "🇩🇰",
  sv: "🇸🇪",
  fr: "🇫🇷",
  it: "🇮🇹",
  pt: "🇵🇹",
  cs: "🇨🇿",
  hu: "🇭🇺",
  fi: "🇫🇮",
  no: "🇳🇴",
  ro: "🇷🇴",
};

const LANG_NAMES: Record<string, string> = {
  de: "Deutsch",
  en: "English",
  es: "Español",
  nl: "Nederlands",
  pl: "Polski",
  da: "Dansk",
  sv: "Svenska",
  fr: "Français",
  it: "Italiano",
  pt: "Português",
  cs: "Čeština",
  hu: "Magyar",
  fi: "Suomi",
  no: "Norsk",
  ro: "Română",
};

export function LanguageSwitcher() {
  const { locale, availableLocales, switchLocale, isLoadingLocales } = useI18n();
  const [open, setOpen] = useState(false);

  if (isLoadingLocales || availableLocales.length <= 1) return null;

  const currentFlag = FLAG_MAP[locale] || "🌐";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2 text-sm font-medium hover:bg-accent/60 transition-colors"
          aria-label="Change language"
        >
          <span className="text-base leading-none">{currentFlag}</span>
          <span className="hidden sm:inline uppercase text-xs tracking-wide">
            {locale}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-52 p-1.5 bg-popover/95 backdrop-blur-lg border-border/60 shadow-xl z-[100]"
      >
        <div className="grid gap-0.5">
          {availableLocales.map((l) => {
            const isActive = locale === l.code;
            const flag = FLAG_MAP[l.code] || "🌐";
            const name = LANG_NAMES[l.code] || l.endonymName || l.name;

            return (
              <button
                key={l.code}
                onClick={() => {
                  switchLocale(l.code);
                  setOpen(false);
                }}
                className={`
                  flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm transition-all
                  ${isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-accent/50 text-foreground"
                  }
                `}
              >
                <span className="text-lg leading-none">{flag}</span>
                <span className="flex-1 text-left">{name}</span>
                {isActive && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
