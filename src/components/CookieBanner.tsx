import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LocaleLink } from "./LocaleLink";
import { useI18n } from "@/i18n";

const CONSENT_KEY = "cookie-consent";

// Global event to re-open the cookie banner
const REOPEN_EVENT = "cookie-banner:reopen";

export function reopenCookieBanner() {
  window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
}

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  // useI18n may not be available if rendered outside I18nProvider (e.g. on admin pages)
  // Use a safe fallback
  let t: (key: string) => string;
  try {
    const i18n = useI18n();
    t = i18n.t;
  } catch {
    t = (key: string) => {
      const fallbacks: Record<string, string> = {
        "cookie.title": "🍪 Wir verwenden Leckerlies (Cookies)",
        "cookie.text": "Wir haben nicht nur ganz viele Kekse für Dein Pferd, wir nutzen auch Cookies, um Dir die bestmögliche Erfahrung auf unserer Website zu bieten. Weitere Informationen findest Du in unserer",
        "cookie.privacy_link": "Datenschutzerklärung",
        "cookie.essential_only": "Nur notwendige",
        "cookie.accept_all": "Alle akzeptieren",
      };
      return fallbacks[key] || key;
    };
  }

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    // Defer initial render until after LCP to avoid the banner being identified as LCP element
    if (!consent) {
      const show = () => setVisible(true);
      const w = window as Window & typeof globalThis;
      const idleId = "requestIdleCallback" in w
        ? (w as any).requestIdleCallback(show, { timeout: 2500 })
        : w.setTimeout(show, 1500);
      const handleReopen = () => setVisible(true);
      window.addEventListener(REOPEN_EVENT, handleReopen);
      return () => {
        window.removeEventListener(REOPEN_EVENT, handleReopen);
        if ("cancelIdleCallback" in window) (window as any).cancelIdleCallback(idleId);
        else clearTimeout(idleId as number);
      };
    }
    const handleReopen = () => setVisible(true);
    window.addEventListener(REOPEN_EVENT, handleReopen);
    return () => window.removeEventListener(REOPEN_EVENT, handleReopen);
  }, []);

  const accept = (value: "all" | "essential") => {
    localStorage.setItem(CONSENT_KEY, value);

    // Push Google Consent Mode v2 update
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    const gtag = (...args: any[]) => w.dataLayer.push(args);

    if (value === "all") {
      gtag("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
      });
    } else {
      gtag("consent", "update", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
      });
    }

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 md:p-6">
      <div className="container mx-auto max-w-3xl bg-background border border-border rounded-lg shadow-lg p-5 md:p-6">
        <h3 className="font-semibold text-foreground text-sm mb-2">{t("cookie.title")}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {t("cookie.text")}{" "}
          <LocaleLink to="/datenschutz" className="text-primary underline underline-offset-2 hover:text-primary/80">
            {t("cookie.privacy_link")}
          </LocaleLink>.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => accept("essential")}>{t("cookie.essential_only")}</Button>
          <Button size="sm" onClick={() => accept("all")}>{t("cookie.accept_all")}</Button>
        </div>
      </div>
    </div>
  );
};
