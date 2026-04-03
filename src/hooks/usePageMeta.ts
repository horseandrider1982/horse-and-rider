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
    const fullTitle = options.title
      ? `${options.title} | ${SITE_NAME}`
      : SITE_NAME;
    const description = options.description || "Ihr kompetenter Partner rund um den Reitsport. Über 20.000 Produkte für Reiter und Pferd bei Horse & Rider Luhmühlen.";
    const ogImage = options.ogImage || DEFAULT_OG_IMAGE;
    const ogType = options.ogType || "website";

    // Auto-derive canonical from current pathname if not explicitly provided
    const canonicalUrl = options.canonicalPath
      ? `${BASE_URL}${options.canonicalPath}`
      : `${BASE_URL}${location.pathname}`;

    // Title
    document.title = fullTitle;

    // html lang
    document.documentElement.lang = locale;

    // Standard meta
    setMeta("description", description);

    // Robots – always set explicitly
    if (!options.noIndex) {
      setMeta("robots", "index, follow");
    }

    // OG
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:image", ogImage, "property");
    setMeta("og:type", ogType, "property");
    setMeta("og:url", canonicalUrl, "property");
    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:locale", locale === "de" ? "de_DE" : locale, "property");

    // Twitter
    setMeta("twitter:title", fullTitle);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImage);
    setMeta("twitter:card", "summary_large_image");

    // Canonical
    setCanonical(canonicalUrl);

    // noindex
    if (options.noIndex) {
      setMeta("robots", "noindex, nofollow");
    }

    return () => {
      // Reset to defaults on unmount
      document.title = `${SITE_NAME} - Reitsport Online Shop`;
      if (options.noIndex) {
        setMeta("robots", "index, follow");
      }
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
