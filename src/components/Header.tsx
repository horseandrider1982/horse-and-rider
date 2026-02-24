import { useState } from "react";
import { Link } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { usePublicCmsMenus, type PublicMenuItem } from "@/hooks/usePublicCmsMenus";
import { Button } from "@/components/ui/button";
import { User, Search, X } from "lucide-react";
import { SmartSearchBar } from "@/components/SmartSearch";
import logo from "@/assets/logo.png";

const MobileSearchOverlay = ({ onClose }: { onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <SmartSearchBar className="flex-1" autoFocus />
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Suche schließen">
          <X className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

function CmsNavLink({ item }: { item: PublicMenuItem }) {
  const isExternal = item.target === '_blank' || item.url?.startsWith('http');
  if (isExternal) {
    return (
      <a href={item.url || '#'} target={item.target} rel="noopener noreferrer" className="hover:text-primary transition-colors">
        {item.label}
      </a>
    );
  }
  return (
    <Link to={item.url || '#'} className="hover:text-primary transition-colors">
      {item.label}
    </Link>
  );
}

export const Header = () => {
  const { user } = useAuth();
  const { data: menus } = usePublicCmsMenus();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const topNavItems = menus?.top_navigation || [];

  return (
    <>
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex-shrink-0">
            <img src={logo} alt="Horse & Rider Luhmühlen" className="h-9 md:h-11 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-foreground">
            {topNavItems.length > 0 ? (
              topNavItems.map(item => <CmsNavLink key={item.id} item={item} />)
            ) : (
              <>
                <Link to="/" className="hover:text-primary transition-colors">Startseite</Link>
                <Link to="/unsere-marken" className="hover:text-primary transition-colors">Unsere Marken</Link>
                <Link to="/news" className="hover:text-primary transition-colors">News</Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <SmartSearchBar className="hidden sm:block w-48 md:w-64 lg:w-72" />
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Suche öffnen"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to={user ? "/account" : "/auth"}>
                <User className="h-5 w-5" />
              </Link>
            </Button>
            <CartDrawer />
          </div>
        </div>
      </header>
      {mobileSearchOpen && <MobileSearchOverlay onClose={() => setMobileSearchOpen(false)} />}
    </>
  );
};
