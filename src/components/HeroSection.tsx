import heroImage from "@/assets/hero-equestrian.jpg";

export const HeroSection = () => (
  <section className="relative overflow-hidden">
    <div className="absolute inset-0">
      <img
        src={heroImage}
        alt="Horse & Rider - Reitsport"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/70 via-foreground/40 to-transparent" />
    </div>
    <div className="relative container mx-auto px-4 py-20 md:py-32">
      <div className="max-w-xl">
        <h1 className="font-heading text-3xl md:text-5xl font-bold text-background leading-tight mb-4">
          Ihr kompetenter Partner rund um den Reitsport
        </h1>
        <p className="text-background/90 text-lg mb-6 font-light">
          Über 30.000 Produkte für Reiter und Pferd. Fachberatung vor Ort in Luhmühlen oder online.
        </p>
        <div className="flex gap-3">
          <a
            href="#produkte"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground font-semibold rounded hover:opacity-90 transition-opacity"
          >
            Jetzt Shoppen
          </a>
          <a
            href="tel:+4941726403"
            className="inline-flex items-center px-6 py-3 border-2 border-background/80 text-background font-semibold rounded hover:bg-background/10 transition-colors"
          >
            Beratung: 04172-6403
          </a>
        </div>
      </div>
    </div>
  </section>
);
