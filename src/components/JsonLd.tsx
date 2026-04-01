import { useEffect } from "react";

const SITE_URL = "https://www.horse-and-rider.de";
const ORG_NAME = "Horse & Rider Luhmühlen";
const ORG_LOGO = `${SITE_URL}/favicon.ico`;

/**
 * Injects a JSON-LD script tag into <head>.
 * Removes it on unmount to avoid stale data.
 */
function useJsonLd(id: string, data: Record<string, unknown> | null) {
  useEffect(() => {
    if (!data) return;
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [id, data]);
}

/* ── Organization (Homepage) ── */

export function OrganizationJsonLd() {
  useJsonLd("jsonld-organization", {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: SITE_URL,
    logo: ORG_LOGO,
    description:
      "Seit 1982 Ihr kompetenter Partner rund um den Reitsport. Über 20.000 Produkte namhafter Marken für Reiter und Pferd.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Zum Hesterberg 8",
      addressLocality: "Salzhausen OT Luhmühlen",
      postalCode: "21376",
      addressCountry: "DE",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+49-4172-9696-0",
      contactType: "customer service",
      availableLanguage: ["German", "English"],
    },
    sameAs: [
      "https://www.facebook.com/HorseAndRiderLuhmuehlen",
      "https://www.instagram.com/horseandrider_luhmuehlen",
    ],
  });
  return null;
}

/* ── WebSite with SearchAction (Homepage) ── */

export function WebSiteJsonLd() {
  useJsonLd("jsonld-website", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: ORG_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/de/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
  return null;
}

/* ── Product ── */

interface ProductJsonLdProps {
  name: string;
  description: string;
  handle: string;
  images: string[];
  price: string;
  currency: string;
  available: boolean;
  sku?: string;
  brand?: string;
  locale?: string;
}

export function ProductJsonLd({
  name,
  description,
  handle,
  images,
  price,
  currency,
  available,
  sku,
  brand,
  locale = "de",
}: ProductJsonLdProps) {
  useJsonLd("jsonld-product", {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description?.substring(0, 5000),
    url: `${SITE_URL}/${locale}/product/${handle}`,
    image: images,
    ...(sku && { sku }),
    ...(brand && {
      brand: { "@type": "Brand", name: brand },
    }),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/${locale}/product/${handle}`,
      priceCurrency: currency,
      price,
      availability: available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: ORG_NAME },
    },
  });
  return null;
}

/* ── BreadcrumbList ── */

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  useJsonLd("jsonld-breadcrumb", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  });
  return null;
}

/* ── CollectionPage ── */

interface CollectionJsonLdProps {
  name: string;
  description?: string;
  handle: string;
  products: Array<{ name: string; handle: string; image?: string; price: string; currency: string }>;
  locale?: string;
}

export function CollectionJsonLd({
  name,
  description,
  handle,
  products,
  locale = "de",
}: CollectionJsonLdProps) {
  useJsonLd("jsonld-collection", {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    ...(description && { description: description.substring(0, 5000) }),
    url: `${SITE_URL}/${locale}/collections/${handle}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 30).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/${locale}/product/${p.handle}`,
        name: p.name,
      })),
    },
  });
  return null;
}

/* ── NewsArticle ── */

interface NewsArticleJsonLdProps {
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  publishedAt?: string;
  locale?: string;
}

export function NewsArticleJsonLd({
  title,
  slug,
  excerpt,
  coverImage,
  publishedAt,
  locale = "de",
}: NewsArticleJsonLdProps) {
  useJsonLd("jsonld-article", {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    url: `${SITE_URL}/${locale}/news/${slug}`,
    ...(excerpt && { description: excerpt }),
    ...(coverImage && { image: coverImage }),
    ...(publishedAt && { datePublished: publishedAt }),
    publisher: {
      "@type": "Organization",
      name: ORG_NAME,
      logo: { "@type": "ImageObject", url: ORG_LOGO },
    },
    author: { "@type": "Organization", name: ORG_NAME },
  });
  return null;
}

/* ── FAQPage ── */

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  useJsonLd("jsonld-faq", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  });
  return null;
}
