import { MapPin, Phone, Mail, Clock } from "lucide-react";
import logo from "@/assets/logo.png";

export const Footer = () => (
  <footer className="bg-foreground text-background/90 py-12">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <img src={logo} alt="Horse & Rider Luhmühlen" className="h-10 w-auto brightness-0 invert mb-4" />
          <p className="text-sm text-background/70 leading-relaxed">
            Ihr kompetenter Partner rund um den Reitsport seit vielen Jahren in Luhmühlen.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-background mb-4">Kontakt</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Alte Dorfstraße 8, 21376 Luhmühlen</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <a href="tel:+4941726403" className="hover:text-background transition-colors">+49 4172 6403</a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <a href="mailto:info@horse-and-rider.de" className="hover:text-background transition-colors">info@horse-and-rider.de</a>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-background mb-4">Öffnungszeiten</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>Mo - Fr: 10:00 - 18:30 Uhr</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>Sa: 9:00 - 14:00 Uhr</span>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-background/20 mt-8 pt-6 text-center text-xs text-background/50">
        © {new Date().getFullYear()} Horse & Rider Luhmühlen. Alle Rechte vorbehalten.
      </div>
    </div>
  </footer>
);
