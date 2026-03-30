import { MapPin, Phone } from "lucide-react";
import { LocaleLink } from "./LocaleLink";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import storeImg from "@/assets/store-interior.jpg";

export const AboutTeamSection = () => {
  const { t } = useI18n();

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
            <div className="flex gap-3">
              <Button asChild>
                <LocaleLink to="/kontakt">{t("about_section.cta_contact")}</LocaleLink>
              </Button>
              <Button variant="outline" asChild>
                <LocaleLink to="/unsere-marken">{t("about_section.cta_about")}</LocaleLink>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
