import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/i18n";

const SITE_NAME = "Horse & Rider Luhmühlen";
const DEFAULT_OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/52810b40-f9f0-4dc1-9ba9-5078f2d53884/id-preview-f0f69fdf--add53e30-ccfb-46be-8dec-8c7d10749009.lovable.app-1771889069297.png";
const BASE_URL = "https://www.horse-and-rider.de";

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
      ? `${options.title} – ${SITE_NAME}`
      : SITE_NAME;
    const description = options.description || "";
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
