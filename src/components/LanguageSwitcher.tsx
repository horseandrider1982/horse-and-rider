import { useI18n } from "@/i18n";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useState } from "react";

/** Inline SVG flag components — render correctly on all platforms including Windows */
function FlagDE({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="160" fill="#000"/>
      <rect y="160" width="640" height="160" fill="#D00"/>
      <rect y="320" width="640" height="160" fill="#FFCE00"/>
    </svg>
  );
}

function FlagGB({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="480" fill="#012169"/>
      <path d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 302 81 480H0v-60l239-178L0 64V0z" fill="#FFF"/>
      <path d="m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z" fill="#C8102E"/>
      <path d="M241 0v480h160V0zM0 160v160h640V160z" fill="#FFF"/>
      <path d="M0 193v96h640v-96zM273 0v480h96V0z" fill="#C8102E"/>
    </svg>
  );
}

function FlagES({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="480" fill="#AA151B"/>
      <rect y="120" width="640" height="240" fill="#F1BF00"/>
    </svg>
  );
}

function FlagNL({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="160" fill="#AE1C28"/>
      <rect y="160" width="640" height="160" fill="#FFF"/>
      <rect y="320" width="640" height="160" fill="#21468B"/>
    </svg>
  );
}

function FlagPL({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="240" fill="#FFF"/>
      <rect y="240" width="640" height="240" fill="#DC143C"/>
    </svg>
  );
}

function FlagDK({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="480" fill="#C8102E"/>
      <rect x="180" width="60" height="480" fill="#FFF"/>
      <rect y="210" width="640" height="60" fill="#FFF"/>
    </svg>
  );
}

function FlagSE({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 640 480" xmlns="http://www.w3.org/2000/svg">
      <rect width="640" height="480" fill="#006AA7"/>
      <rect x="176" width="64" height="480" fill="#FECC00"/>
      <rect y="208" width="640" height="64" fill="#FECC00"/>
    </svg>
  );
}

const FLAG_COMPONENTS: Record<string, React.FC<{ className?: string }>> = {
  de: FlagDE,
  en: FlagGB,
  es: FlagES,
  nl: FlagNL,
  pl: FlagPL,
  da: FlagDK,
  sv: FlagSE,
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

function FlagIcon({ code, className }: { code: string; className?: string }) {
  const Component = FLAG_COMPONENTS[code];
  if (Component) return <Component className={className} />;
  return <span className={className}>🌐</span>;
}

export function LanguageSwitcher() {
  const { locale, availableLocales, switchLocale, isLoadingLocales } = useI18n();
  const [open, setOpen] = useState(false);

  if (isLoadingLocales || availableLocales.length <= 1) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2 text-sm font-medium hover:bg-accent/60 transition-colors"
          aria-label="Change language"
        >
          <FlagIcon code={locale} className="w-5 h-3.5 rounded-[2px] shadow-sm" />
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
                <FlagIcon code={l.code} className="w-5 h-3.5 rounded-[2px] shadow-sm" />
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
