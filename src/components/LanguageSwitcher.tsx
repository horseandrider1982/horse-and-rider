import { useI18n } from "@/i18n";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { locale, availableLocales, switchLocale, isLoadingLocales } =
    useI18n();

  // Don't render if loading or only one language available
  if (isLoadingLocales || availableLocales.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-xs font-bold uppercase"
          aria-label="Language"
        >
          <span className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{locale.toUpperCase()}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px] bg-popover z-[100]">
        {availableLocales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchLocale(l.code)}
            className={
              locale === l.code ? "bg-muted font-semibold" : "cursor-pointer"
            }
          >
            <span className="uppercase mr-2 text-xs font-bold w-6">
              {l.code}
            </span>
            {l.endonymName || l.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
