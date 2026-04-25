import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useI18n } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface RouteRow {
  current_path: string;
  title: string;
  entity_type: string;
}

const SECTION_LABELS: Record<string, string> = {
  collection: "Kategorien",
  brand: "Marken",
  product: "Produkte",
  news: "News & Ratgeber",
  page: "Service & Informationen",
};

const STATIC_LINKS: Array<{ path: string; label: string }> = [
  { path: "/de", label: "Startseite" },
  { path: "/de/unsere-marken", label: "Alle Marken" },
  { path: "/de/news", label: "News" },
  { path: "/de/faq", label: "FAQ" },
  { path: "/de/kontakt", label: "Kontakt" },
  { path: "/de/versand", label: "Versand & Zahlung" },
  { path: "/de/service", label: "Service" },
  { path: "/de/datenschutz", label: "Datenschutz" },
  { path: "/de/agb", label: "AGB" },
  { path: "/de/impressum", label: "Impressum" },
  { path: "/de/widerrufsrecht", label: "Widerrufsrecht" },
];

const SitemapPage = () => {
  const { locale } = useI18n();
  const [grouped, setGrouped] = useState<Record<string, RouteRow[]>>({});
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: "Sitemap – Übersicht aller Seiten",
    description:
      "HTML-Sitemap von Horse & Rider Luhmühlen: Übersicht aller Kategorien, Marken, Produkte und Service-Seiten unseres Reitsport-Onlineshops.",
    canonicalPath: `/${locale}/sitemap`,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      // Hole bis zu 1000 Routen je Typ (für Übersicht ausreichend)
      const { data } = await supabase
        .from("public_routes")
        .select("current_path, title, entity_type")
        .eq("is_public", true)
        .in("entity_type", ["collection", "brand", "news", "page"])
        .order("title")
        .limit(1000);

      if (!active) return;
      const g: Record<string, RouteRow[]> = {};
      for (const row of data || []) {
        const t = (row as RouteRow).entity_type;
        if (!g[t]) g[t] = [];
        g[t].push(row as RouteRow);
      }
      setGrouped(g);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ name: "Sitemap", url: `/${locale}/sitemap` }]} />
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mt-4 mb-2">
          Sitemap
        </h1>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          Übersicht aller Inhalte von Horse & Rider Luhmühlen. Hier findest du alle Kategorien,
          Marken, News-Artikel und Service-Seiten unseres Reitsport-Onlineshops auf einen Blick.
        </p>

        {/* Hauptseiten */}
        <section className="mb-10">
          <h2 className="font-serif text-2xl font-semibold mb-4">Hauptseiten</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-6">
            {STATIC_LINKS.map((l) => (
              <li key={l.path}>
                <Link to={l.path} className="text-primary hover:underline text-sm">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Lade Inhalte…
          </div>
        ) : (
          <>
            {(["collection", "brand", "news", "page"] as const).map((type) => {
              const items = grouped[type];
              if (!items || items.length === 0) return null;
              return (
                <section key={type} className="mb-10">
                  <h2 className="font-serif text-2xl font-semibold mb-4">
                    {SECTION_LABELS[type]}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({items.length})
                    </span>
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-6">
                    {items.map((item) => (
                      <li key={item.current_path}>
                        <Link
                          to={item.current_path}
                          className="text-primary hover:underline text-sm line-clamp-1"
                          title={item.title}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}

            <section className="mb-10 pt-6 border-t border-border">
              <h2 className="font-serif text-2xl font-semibold mb-2">XML-Sitemaps</h2>
              <p className="text-sm text-muted-foreground mb-3">
                Für Suchmaschinen stellen wir maschinenlesbare XML-Sitemaps bereit:
              </p>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <a
                    href="/sitemap.xml"
                    className="text-primary hover:underline"
                    rel="noopener"
                  >
                    sitemap.xml (Index)
                  </a>
                </li>
                <li>
                  <a
                    href="/sitemap-product.xml"
                    className="text-primary hover:underline"
                    rel="noopener"
                  >
                    Produkt-Sitemap
                  </a>
                </li>
                <li>
                  <a
                    href="/sitemap-collection.xml"
                    className="text-primary hover:underline"
                    rel="noopener"
                  >
                    Kategorien-Sitemap
                  </a>
                </li>
              </ul>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SitemapPage;
