import { useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useBrands } from "@/hooks/useBrands";

const ALPHABET = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function getLetterKey(name: string): string {
  const first = name.charAt(0).toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  return "#";
}

export default function UnsereMarken() {
  const { data: brands, isLoading, error } = useBrands();
  const [searchParams] = useSearchParams();

  const grouped = useMemo(() => {
    if (!brands) return new Map<string, typeof brands>();
    const map = new Map<string, typeof brands>();
    for (const b of brands) {
      const key = getLetterKey(b.name);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [brands]);

  const activeLetters = useMemo(() => new Set(grouped.keys()), [grouped]);

  useEffect(() => {
    const brandParam = searchParams.get("brand");
    if (brandParam && brands) {
      const match = brands.find(
        (b) => b.name.toLowerCase() === brandParam.toLowerCase() || b.slug === brandParam.toLowerCase()
      );
      if (match) {
        setTimeout(() => {
          document.getElementById(`brand-${match.slug}`)?.scrollIntoView({ behavior: "smooth" });
        }, 300);
      }
    }
  }, [searchParams, brands]);

  const scrollToLetter = (letter: string) => {
    document.getElementById(`letter-${letter}`)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1">
        <section className="bg-card py-10 md:py-14">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-3">Unsere Marken</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Entdecken Sie unser sorgfältig ausgewähltes Sortiment erstklassiger Reitsportmarken – von Sätteln über
              Trensen bis hin zu Reitbekleidung und Zubehör.
            </p>
          </div>
        </section>

        <div className="sticky top-[57px] md:top-[65px] z-40 bg-background border-b border-border shadow-sm">
          <div className="container mx-auto px-4 py-2 flex flex-wrap gap-1 justify-center">
            {ALPHABET.map((letter) => {
              const isActive = activeLetters.has(letter);
              return (
                <button
                  key={letter}
                  onClick={() => isActive && scrollToLetter(letter)}
                  disabled={!isActive}
                  className={`w-8 h-8 text-sm font-semibold rounded transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                      : "bg-muted text-muted-foreground/40 cursor-default"
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="text-center py-16 text-muted-foreground">
              Marken konnten nicht geladen werden. Bitte versuchen Sie es später erneut.
            </div>
          )}

          {!isLoading && !error && brands && brands.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg mb-2">Keine Marken gefunden.</p>
              <p className="text-sm">Es sind aktuell keine Produkte im Shop vorhanden.</p>
            </div>
          )}

          {!isLoading &&
            !error &&
            brands &&
            brands.length > 0 &&
            ALPHABET.filter((l) => grouped.has(l)).map((letter) => (
              <div key={letter} id={`letter-${letter}`} className="mb-10 scroll-mt-32">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                    {letter}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {grouped.get(letter)!.map((brand) => (
                    <Link
                      key={brand.slug}
                      id={`brand-${brand.slug}`}
                      to={`/unsere-marken/${brand.slug}`}
                      className="flex flex-col items-center gap-3 p-5 rounded-lg border border-border bg-background hover:shadow-md hover:border-primary/30 transition-all group"
                    >
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={`${brand.name} Logo`}
                          className="h-14 w-auto object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-14 flex items-center justify-center">
                          <span className="text-2xl font-heading font-bold text-muted-foreground/50 group-hover:text-primary/60 transition-colors">
                            {brand.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-center group-hover:text-primary transition-colors">
                        {brand.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
