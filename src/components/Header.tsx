import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LocaleLink } from "./LocaleLink";
import { CartDrawer } from "./CartDrawer";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { useAuth } from "@/hooks/useAuth";
import { usePublicCmsMenus } from "@/hooks/usePublicCmsMenus";
import { MegaMenu } from "@/components/MegaMenu";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { User, Search, LogIn, LogOut, UserCircle } from "lucide-react";
import { SearchOverlay } from "@/components/SmartSearch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import logo from "@/assets/logo.png";

export const Header = () => {
  const { user } = useAuth();
  const { data: menus } = usePublicCmsMenus();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const { t, localePath } = useI18n();

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
              <img src={logo} alt="Horse & Rider Luhmühlen" className="h-9 md:h-11 w-auto" />
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
                  {accountMenuItems.length > 0 ? (
                    accountMenuItems.map(item => (
                      <DropdownMenuItem key={item.id} asChild>
                        <LocaleLink to={item.url || '/'} className="flex items-center gap-2 cursor-pointer">{item.label}</LocaleLink>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem asChild>
                      <LocaleLink to={user ? "/account" : "/auth"} className="flex items-center gap-2 cursor-pointer">
                        <UserCircle className="h-4 w-4" />
                        {user ? t("header.account") : t("header.login")}
                      </LocaleLink>
                    </DropdownMenuItem>
                  )}
                  {user ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="h-4 w-4" />{t("header.logout")}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <LocaleLink to="/auth" className="flex items-center gap-2 cursor-pointer">
                          <LogIn className="h-4 w-4" />{t("header.login")}
                        </LocaleLink>
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
