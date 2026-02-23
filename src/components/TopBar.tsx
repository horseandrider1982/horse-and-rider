import { Truck, Clock, ThumbsUp, Phone } from "lucide-react";

export const TopBar = () => (
  <div className="hidden md:block bg-topbar text-topbar-foreground text-xs py-2">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Truck className="h-3.5 w-3.5" />
          <span>Kostenloser Versand ab € 50,-</span>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>Über 30.000 Produkte</span>
        </div>
        <div className="hidden md:flex items-center justify-center gap-1.5">
          <ThumbsUp className="h-3.5 w-3.5" />
          <span>30 Tage Geld-Zurück-Garantie</span>
        </div>
        <div className="hidden md:flex items-center justify-center gap-1.5">
          <Phone className="h-3.5 w-3.5" />
          <a href="tel:+4941726403" className="hover:underline">
            Fachberatung: +49 4172 6403
          </a>
        </div>
      </div>
    </div>
  </div>
);
