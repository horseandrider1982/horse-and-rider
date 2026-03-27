import { useI18n } from "@/i18n";
import ladenImg from "@/assets/laden-start.png";
import sattlereiImg from "@/assets/sattlerei-start.png";
import stickImg from "@/assets/stickerei-start.png";
import onlineImg from "@/assets/online-start.png";

export const ServiceCards = () => {
  const { t } = useI18n();

  const services = [
    { titleKey: "services.store.title", descKey: "services.store.desc", image: ladenImg },
    { titleKey: "services.online.title", descKey: "services.online.desc", image: onlineImg },
    { titleKey: "services.saddle.title", descKey: "services.saddle.desc", image: sattlereiImg },
    { titleKey: "services.embroidery.title", descKey: "services.embroidery.desc", image: stickImg },
  ];

  return (
    <section className="py-12 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <div key={s.titleKey} className="bg-background rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={s.image} alt={t(s.titleKey)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-4">
                <h3 className="font-heading text-lg font-semibold mb-1">{t(s.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(s.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
