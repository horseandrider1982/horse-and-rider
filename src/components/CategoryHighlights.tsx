import eventingImg from "@/assets/eventing.jpg";
import sattelImg from "@/assets/sattel.jpg";
import gebisseImg from "@/assets/gebisse.jpg";
import airbagImg from "@/assets/airbag.jpg";

const categories = [
  { title: "Vielseitigkeit", image: eventingImg, desc: "Alles für den Vielseitigkeitsreiter und das Vielseitigkeitspferd." },
  { title: "Sättel", image: sattelImg, desc: "Prestige, Passier, Kentaur und Euroriding – online konfigurieren." },
  { title: "Gebisse", image: gebisseImg, desc: "Deutschlands größte Gebissauswahl mit Gebiss-Finder." },
  { title: "Airbagwesten", image: airbagImg, desc: "Helite & Freejump – kompetente Beratung inklusive." },
];

export const CategoryHighlights = () => (
  <section className="py-12">
    <div className="container mx-auto px-4">
      <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-8">
        Was wir besonders gut können
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.title}
            className="relative rounded-lg overflow-hidden group cursor-pointer aspect-[3/4]"
          >
            <img
              src={cat.image}
              alt={cat.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="font-heading text-xl font-bold text-background mb-1">{cat.title}</h3>
              <p className="text-background/80 text-sm">{cat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
