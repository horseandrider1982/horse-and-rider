import { Link } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";
import logo from "@/assets/logo.png";

export const Header = () => (
  <header className="bg-background border-b border-border sticky top-0 z-50">
    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
      <Link to="/">
        <img src={logo} alt="Horse & Rider Luhmühlen" className="h-12 md:h-16 w-auto" />
      </Link>

      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-foreground">
        <Link to="/" className="hover:text-primary transition-colors">Startseite</Link>
        <a href="https://www.horse-and-rider.de/Vielseitigkeit" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Vielseitigkeit</a>
        <a href="https://www.horse-and-rider.de/Saettel" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Sättel</a>
        <a href="https://www.horse-and-rider.de/Gebisse" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Gebisse</a>
        <a href="https://www.horse-and-rider.de/Sattel-Service-von-Horse-Rider-Luhmuehlen" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Service</a>
      </nav>

      <div className="flex items-center gap-3">
        <CartDrawer />
      </div>
    </div>
  </header>
);
