import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n, DEFAULT_LOCALE } from "@/i18n";

/**
 * Injects <link rel="alternate" hreflang="..." /> and canonical tags
 * for all available languages. Runs on every route change.
 */
export function HreflangTags() {
  const { availableLocales, locale } = useI18n();
  const location = useLocation();

  useEffect(() => {
    // Clean up previous tags
    document
      .querySelectorAll("link[data-i18n-hreflang]")
      .forEach((el) => el.remove());

    const origin = window.location.origin;
    // Strip locale prefix to get the base path
    const basePath =
      location.pathname.replace(new RegExp(`^/${locale}`), "") || "/";
    const pathSuffix = basePath === "/" ? "" : basePath;

    // hreflang for each locale
    availableLocales.forEach((l) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = l.code;
      link.href = `${origin}/${l.code}${pathSuffix}`;
      link.setAttribute("data-i18n-hreflang", "true");
      document.head.appendChild(link);
    });

    // x-default → default locale
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    xDefault.href = `${origin}/${DEFAULT_LOCALE}${pathSuffix}`;
    xDefault.setAttribute("data-i18n-hreflang", "true");
    document.head.appendChild(xDefault);

    // Canonical for current locale
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = `${origin}/${locale}${pathSuffix}`;
    canonical.setAttribute("data-i18n-hreflang", "true");
    document.head.appendChild(canonical);

    return () => {
      document
        .querySelectorAll("link[data-i18n-hreflang]")
        .forEach((el) => el.remove());
    };
  }, [availableLocales, locale, location.pathname]);

  return null;
}
