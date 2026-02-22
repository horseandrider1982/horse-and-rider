import ladenImg from "@/assets/laden-start.png";
import sattlereiImg from "@/assets/sattlerei-start.png";
import stickImg from "@/assets/stickerei-start.png";
import onlineImg from "@/assets/online-start.png";

const services = [
  {
    title: "Reitsportfachgeschäft",
    image: ladenImg,
    description: "Über 10.000 Artikel vor Ort. Kompetente Beratung in Luhmühlen.",
  },
  {
    title: "Online-Shop",
    image: onlineImg,
    description: "Über 30.000 Artikel online verfügbar. Schneller Versand.",
  },
  {
    title: "Sattel-Service",
    image: sattlereiImg,
    description: "Mobiler Sattelservice im Umkreis von 50 km. Beratung & Anpassung.",
  },
  {
    title: "Stickerei",
    image: stickImg,
    description: "Individuelle Stickerei für Schabracken, Decken, Jacken u.v.m.",
  },
];

export const ServiceCards = () => (
  <section className="py-12 bg-card">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {services.map((s) => (
          <div
            key={s.title}
            className="bg-background rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={s.image}
                alt={s.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="font-heading text-lg font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);
