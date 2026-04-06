import { useI18n } from "@/i18n";
import { Store, Globe, Wrench, Scissors } from "lucide-react";
import ladenImg from "@/assets/laden-start.webp";
import sattlereiImg from "@/assets/sattlerei-start.webp";
import stickImg from "@/assets/stickerei-start.webp";
import onlineImg from "@/assets/online-start.webp";

export const ServiceCards = () => {
  const { t } = useI18n();

  const services = [
    { titleKey: "services.store.title", descKey: "services.store.desc", image: ladenImg, icon: Store },
    { titleKey: "services.online.title", descKey: "services.online.desc", image: onlineImg, icon: Globe },
    { titleKey: "services.saddle.title", descKey: "services.saddle.desc", image: sattlereiImg, icon: Wrench },
    { titleKey: "services.embroidery.title", descKey: "services.embroidery.desc", image: stickImg, icon: Scissors },
  ];

  return (
    <section className="py-14 bg-muted/30">
      <div className="container mx-auto px-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest text-center mb-2">
          {t("services.subtitle") || "Das macht uns aus"}
        </p>
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-center mb-10">
          {t("services.heading") || "Unsere vier Säulen"}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {services.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.titleKey}
                className="relative bg-background rounded-xl overflow-hidden border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={s.image}
                    alt={t(s.titleKey)}
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={300}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-heading text-sm md:text-base font-semibold leading-tight">{t(s.titleKey)}</h3>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{t(s.descKey)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
