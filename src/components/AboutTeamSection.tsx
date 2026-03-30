import { useState } from "react";
import { MapPin, Phone, MessageSquare, Smartphone, Monitor } from "lucide-react";
import { useI18n } from "@/i18n";
import { CalendlyModal } from "./CalendlyModal";
import { ProductContactModal } from "./ProductContactModal";
import storeImg from "@/assets/store-interior.jpg";

export const AboutTeamSection = () => {
  const { t } = useI18n();
  const [calendlyOpen, setCalendlyOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <section className="py-14 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="rounded-2xl overflow-hidden aspect-[16/10]">
            <img
              src={storeImg}
              alt="Horse & Rider Reitsportfachhandel Luhmühlen"
              className="w-full h-full object-cover"
              loading="lazy"
              width={1280}
              height={720}
            />
          </div>
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              {t("about_section.title")}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {t("about_section.text_1")}
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              {t("about_section.text_2")}
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                <span>Alte Dorfstraße 8<br />21376 Salzhausen OT Luhmühlen</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0 text-primary" />
                <a href="tel:+4941726403" className="hover:text-primary transition-colors">04172 - 6403</a>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <a href="tel:+4941726403" className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors flex-1">
                <Phone className="h-10 w-10" />
                <span className="text-sm font-medium">{t("product.phone")}</span>
              </a>
              <button onClick={() => setContactOpen(true)} className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors flex-1">
                <MessageSquare className="h-10 w-10" />
                <span className="text-sm font-medium">{t("product.contact_form")}</span>
              </button>
              <button onClick={() => setCalendlyOpen(true)} className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors flex-1">
                <Monitor className="h-10 w-10" />
                <span className="text-sm font-medium">{t("product.online_advice")}</span>
              </button>
              <a href="https://wa.me/4941726403" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 text-primary hover:text-primary/80 transition-colors flex-1">
                <Smartphone className="h-10 w-10" />
                <span className="text-sm font-medium">WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      <CalendlyModal open={calendlyOpen} onOpenChange={setCalendlyOpen} />
      <ProductContactModal open={contactOpen} onOpenChange={setContactOpen} productTitle="Allgemeine Anfrage" productId="homepage" />
    </section>
  );
};
