import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n, DEFAULT_LOCALE } from "@/i18n";

const PRODUCTION_ORIGIN = "https://horse-and-rider.de";

/**
 * Injects <link rel="alternate" hreflang="..." /> tags
 * for all available languages. Runs on every route change.
 *
 * NOTE: Canonical is handled by usePageMeta — not duplicated here.
 */
export function HreflangTags() {
  const { availableLocales, locale } = useI18n();
  const location = useLocation();

  useEffect(() => {
    // Clean up previous tags
    document
      .querySelectorAll("link[data-i18n-hreflang]")
      .forEach((el) => el.remove());

    // Strip locale prefix to get the base path
    const basePath =
      location.pathname.replace(new RegExp(`^/${locale}`), "") || "/";
    const pathSuffix = basePath === "/" ? "" : basePath;

    // hreflang for each locale
    availableLocales.forEach((l) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = l.code;
      link.href = `${PRODUCTION_ORIGIN}/${l.code}${pathSuffix}`;
      link.setAttribute("data-i18n-hreflang", "true");
      document.head.appendChild(link);
    });

    // x-default → default locale
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    xDefault.href = `${PRODUCTION_ORIGIN}/${DEFAULT_LOCALE}${pathSuffix}`;
    xDefault.setAttribute("data-i18n-hreflang", "true");
    document.head.appendChild(xDefault);

    return () => {
      document
        .querySelectorAll("link[data-i18n-hreflang]")
        .forEach((el) => el.remove());
    };
  }, [availableLocales, locale, location.pathname]);

  return null;
}
