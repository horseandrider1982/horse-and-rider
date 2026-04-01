import { useI18n } from "@/i18n";
import eventingImg from "@/assets/eventing.jpg";
import sattelImg from "@/assets/sattel.jpg";
import gebisseImg from "@/assets/gebisse.jpg";
import airbagImg from "@/assets/airbag.jpg";

export const CategoryHighlights = () => {
  const { t } = useI18n();

  const categories = [
    { titleKey: "categories.eventing.title", descKey: "categories.eventing.desc", image: eventingImg },
    { titleKey: "categories.saddles.title", descKey: "categories.saddles.desc", image: sattelImg },
    { titleKey: "categories.bits.title", descKey: "categories.bits.desc", image: gebisseImg },
    { titleKey: "categories.airbag.title", descKey: "categories.airbag.desc", image: airbagImg },
  ];

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-8">{t("categories.title")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <div key={cat.titleKey} className="relative rounded-lg overflow-hidden group cursor-pointer aspect-[3/4]">
              <img src={cat.image} alt={t(cat.titleKey)} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-heading text-xl font-bold text-background mb-1">{t(cat.titleKey)}</h3>
                <p className="text-background/80 text-sm">{t(cat.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
