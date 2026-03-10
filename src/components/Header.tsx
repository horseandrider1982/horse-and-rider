import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartDrawer } from "./CartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { usePublicCmsMenus } from "@/hooks/usePublicCmsMenus";
import { CmsMenuItemRenderer } from "@/components/CmsMenuItemRenderer";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Search, LogIn, LogOut, UserCircle } from "lucide-react";
import { SearchOverlay } from "@/components/SmartSearch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Header = () => {
  const { user } = useAuth();
  const { data: menus } = usePublicCmsMenus();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Erfolgreich abgemeldet");
    navigate("/");
  };

  const topNavItems = menus?.top_navigation || [];
  const accountMenuItems = menus?.account_icon_menu || [];

  return (
    <>
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex-shrink-0">
            <img src={logo} alt="Horse & Rider Luhmühlen" className="h-9 md:h-11 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-foreground">
            {topNavItems.length > 0 ? (
              <CmsMenuItemRenderer items={topNavItems} linkClassName="hover:text-primary transition-colors" mode="inline" />
            ) : (
              <>
                <Link to="/" className="hover:text-primary transition-colors">Startseite</Link>
                <Link to="/unsere-marken" className="hover:text-primary transition-colors">Unsere Marken</Link>
                <Link to="/news" className="hover:text-primary transition-colors">News</Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {/* Search trigger button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Suche öffnen"
              className="relative"
            >
              <Search className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover z-[100]">
                {accountMenuItems.length > 0 ? (
                  accountMenuItems.map(item => (
                    <DropdownMenuItem key={item.id} asChild>
                      <Link to={item.url || '/'} className="flex items-center gap-2 cursor-pointer">
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem asChild>
                    <Link to={user ? "/account" : "/auth"} className="flex items-center gap-2 cursor-pointer">
                      <UserCircle className="h-4 w-4" />
                      {user ? 'Kundenkonto' : 'Anmelden'}
                    </Link>
                  </DropdownMenuItem>
                )}
                {user ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4" />
                      Abmelden
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/auth" className="flex items-center gap-2 cursor-pointer">
                        <LogIn className="h-4 w-4" />
                        Anmelden
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <CartDrawer />
          </div>
        </div>
      </header>

      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
