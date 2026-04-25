import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/i18n";

const SITE_NAME = "Horse & Rider Luhmühlen";
const DEFAULT_OG_IMAGE = "https://horse-and-rider.de/og-default.jpg";
const BASE_URL = "https://horse-and-rider.de";

interface PageMetaOptions {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  /** Explicit canonical path (e.g. /de/product/foo). If omitted, auto-derived from current route. */
  canonicalPath?: string;
  noIndex?: boolean;
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function usePageMeta(options: PageMetaOptions) {
  const { locale } = useI18n();
  const location = useLocation();

  useEffect(() => {
    // ────────────────────────────────────────────────────────────────────
    // WICHTIG: Wenn weder title noch description übergeben werden, ist die
    // Seite vermutlich noch im Loading-State (z. B. Produkt wird noch
    // gefetcht). In diesem Fall NICHTS überschreiben, damit das Inline-
    // Script aus index.html (das pfad-basierte Defaults setzt) die Kontrolle
    // behält. Erst wenn echte Daten da sind, übernehmen wir die Hoheit.
    //
    // Robots, Canonical, OG-URL, html-lang setzen wir trotzdem immer, weil
    // diese unabhängig von Produktdaten sind.
    // ────────────────────────────────────────────────────────────────────
    const hasRealContent = !!(options.title || options.description);

    const canonicalUrl = options.canonicalPath
      ? `${BASE_URL}${options.canonicalPath}`
      : `${BASE_URL}${location.pathname}`;

    document.documentElement.lang = locale;
    setCanonical(canonicalUrl);
    setMeta("og:url", canonicalUrl, "property");

    if (!options.noIndex) {
      setMeta("robots", "index, follow");
    } else {
      setMeta("robots", "noindex, nofollow");
    }

    if (!hasRealContent) {
      // Loading-State: Inline-Script-Defaults intakt lassen.
      return;
    }

    const fullTitle = options.title
      ? `${options.title} | ${SITE_NAME}`
      : SITE_NAME;
    const description = options.description || "Ihr kompetenter Partner rund um den Reitsport. Über 20.000 Produkte für Reiter und Pferd bei Horse & Rider Luhmühlen.";
    const ogImage = options.ogImage || DEFAULT_OG_IMAGE;
    const ogType = options.ogType || "website";

    document.title = fullTitle;
    setMeta("description", description);

    // OG
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:image", ogImage, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:locale", locale === "de" ? "de_DE" : locale, "property");

    // Twitter
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);
    setMeta("twitter:card", "summary_large_image");

    return () => {
      // Beim Unmount NICHT auf einen generischen Default zurücksetzen –
      // sonst flackert der Title kurz auf der nächsten Seite, bevor deren
      // usePageMeta läuft. Die nächste Seite überschreibt die Werte sowieso.
    };
  }, [
    options.title,
    options.description,
    options.ogImage,
    options.ogType,
    options.canonicalPath,
    options.noIndex,
    locale,
    location.pathname,
  ]);
}
