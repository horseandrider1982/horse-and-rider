import { useI18n } from "@/i18n";
import { LocaleLink } from "./LocaleLink";
import eventingImg from "@/assets/eventing.jpg";
import sattelImg from "@/assets/sattel.jpg";
import gebisseImg from "@/assets/gebisse.jpg";
import airbagImg from "@/assets/airbag.jpg";

export const CategoryHighlights = () => {
  const { t } = useI18n();

  const categories = [
    { titleKey: "categories.eventing.title", descKey: "categories.eventing.desc", image: eventingImg, handle: "vielseitigkeit" },
    { titleKey: "categories.saddles.title", descKey: "categories.saddles.desc", image: sattelImg, handle: "sattel" },
    { titleKey: "categories.bits.title", descKey: "categories.bits.desc", image: gebisseImg, handle: "gebisse" },
    { titleKey: "categories.airbag.title", descKey: "categories.airbag.desc", image: airbagImg, handle: "airbagwesten" },
  ];

  return (
    <section className="py-14">
      <div className="container mx-auto px-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-2">
          {t("categories.subtitle")}
        </p>
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-10">
          {t("categories.title")}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((cat) => (
            <LocaleLink
              key={cat.titleKey}
              to={`/collections/${cat.handle}`}
              className="relative rounded-xl overflow-hidden group cursor-pointer aspect-[3/4] shadow-sm hover:shadow-xl transition-shadow duration-300 block"
            >
              <img
                src={cat.image}
                alt={t(cat.titleKey)}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                <h3 className="font-heading text-lg md:text-xl font-bold text-white mb-1 drop-shadow-md">
                  {t(cat.titleKey)}
                </h3>
                <p className="text-white/80 text-xs md:text-sm leading-relaxed line-clamp-2 drop-shadow-sm">
                  {t(cat.descKey)}
                </p>
              </div>
            </LocaleLink>
          ))}
        </div>
      </div>
    </section>
  );
};
