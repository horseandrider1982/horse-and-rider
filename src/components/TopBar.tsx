import { Truck, Clock, ThumbsUp, Phone } from "lucide-react";
import { useI18n } from "@/i18n";

export const TopBar = () => {
  const { t } = useI18n();

  return (
    <div className="hidden md:block bg-topbar text-topbar-foreground text-xs py-2">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Truck className="h-3.5 w-3.5" />
            <span>{t("topbar.free_shipping")}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{t("topbar.products_count")}</span>
          </div>
          <div className="hidden md:flex items-center justify-center gap-1.5">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>{t("topbar.money_back")}</span>
          </div>
          <div className="hidden md:flex items-center justify-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            <a href="tel:+4941726403" className="hover:underline">
              {t("topbar.phone_advisory")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
