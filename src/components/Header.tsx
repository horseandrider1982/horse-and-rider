import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocaleLink } from "./LocaleLink";
import { CartDrawer } from "./CartDrawer";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { useAuth } from "@/hooks/useAuth";
import { useShopifyCustomer } from "@/lib/auth/ShopifyCustomerContext";
import { usePublicCmsMenus } from "@/hooks/usePublicCmsMenus";
import { MegaMenu } from "@/components/MegaMenu";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Search, LogIn, LogOut, UserCircle, CreditCard, PawPrint, ShoppingBag, ExternalLink } from "lucide-react";
import { SearchOverlay } from "@/components/SmartSearch";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import logo from "@/assets/logo-2x.png";

export const Header = () => {
  const { user, isAdmin } = useAuth();
  const { customer, isAuthenticated: isCustomerAuth, login: shopifyLogin, logout: shopifyLogout } = useShopifyCustomer();
  const { data: menus } = usePublicCmsMenus();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const { t, localePath } = useI18n();

  const handleLogout = () => {
    shopifyLogout();
    toast.success(t("header.logged_out"));
    navigate(localePath("/"));
  };

  const topNavItems = menus?.top_navigation || [];
  const accountMenuItems = menus?.account_icon_menu || [];

  return (
    <>
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Left: Hamburger (mobile) + Logo */}
          <div className="flex items-center gap-2">
            <MobileMenu />
            <LocaleLink to="/" className="flex-shrink-0">
              <img src={logo} alt="Horse & Rider Luhmühlen" width={146} height={40} className="h-9 md:h-11 w-auto" style={{ filter: "brightness(0) sepia(1) hue-rotate(90deg) saturate(1) brightness(0.3)" }} />
            </LocaleLink>
          </div>

          {/* Center: Desktop Mega Menu */}
          <MegaMenu />

          {/* Right: Search + Language (desktop) + Account (desktop) + Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} aria-label={t("header.search_open")} className="relative">
              <Search className="h-5 w-5" />
            </Button>

            {/* Desktop only: Language + Account */}
            <div className="hidden lg:flex items-center gap-2">
              <LanguageSwitcher />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover z-[100]">
                  {isCustomerAuth ? (
                    <>
                      <DropdownMenuItem className="text-xs text-muted-foreground font-medium" disabled>
                        {customer?.displayName || customer?.email || t("header.account")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <LocaleLink to="/account" className="flex items-center gap-2 cursor-pointer">
                          <UserCircle className="h-4 w-4" />{t("header.account") || "Mein Bereich"}
                        </LocaleLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <LocaleLink to="/kundenkarte" className="flex items-center gap-2 cursor-pointer">
                          <CreditCard className="h-4 w-4" />Kundenkarte
                        </LocaleLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <LocaleLink to="/pferde" className="flex items-center gap-2 cursor-pointer">
                          <PawPrint className="h-4 w-4" />Meine Pferde
                        </LocaleLink>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href="https://account.horse-and-rider.de" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
                          <ShoppingBag className="h-4 w-4" />Bestellungen
                          <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href="https://sattelservice.horse-and-rider.de" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 cursor-pointer">
                          Sattelservice
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="h-4 w-4" />{t("header.logout")}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      {/* Admin login (Supabase) still accessible */}
                      {user && isAdmin && (
                        <>
                          <DropdownMenuItem asChild>
                            <LocaleLink to="/admin" className="flex items-center gap-2 cursor-pointer">
                              <UserCircle className="h-4 w-4" />Admin
                            </LocaleLink>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => shopifyLogin()} className="flex items-center gap-2 cursor-pointer">
                        <LogIn className="h-4 w-4" />{t("header.login") || "Anmelden"}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <CartDrawer />
          </div>
        </div>
      </header>
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
