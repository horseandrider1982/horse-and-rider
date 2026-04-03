import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, LogIn, LogOut, UserCircle, ChevronDown, ChevronRight, CreditCard, PawPrint, ShoppingBag, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LocaleLink } from "./LocaleLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useShopifyCustomer } from "@/lib/auth/ShopifyCustomerContext";
import { usePublicCmsMenus } from "@/hooks/usePublicCmsMenus";
import { useShopifyMenu, type ShopifyMenuItem } from "@/hooks/useShopifyMenu";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import type { PublicMenuItem } from "@/hooks/usePublicCmsMenus";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

function MobileShopifyItem({ item, onClose }: { item: ShopifyMenuItem; onClose: () => void }) {
  const hasChildren = item.items && item.items.length > 0;
  const isExternal = item.url.startsWith("http");

  if (hasChildren) {
    return (
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors rounded-md">
          <span>{item.title}</span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pl-4 border-l-2 border-border ml-4 space-y-0.5">
            {item.items!.map((child) => (
              <MobileShopifyItem key={child.id} item={child} onClose={onClose} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  if (isExternal) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={onClose}
        className="block px-4 py-3 text-sm text-foreground hover:bg-accent/50 transition-colors rounded-md">
        {item.title}
      </a>
    );
  }

  return (
    <LocaleLink to={item.url} onClick={onClose}
      className="block px-4 py-3 text-sm text-foreground hover:bg-accent/50 transition-colors rounded-md">
      {item.title}
    </LocaleLink>
  );
}

function MobileShopifyPlaceholder({ handle, onClose }: { handle?: string; onClose: () => void }) {
  const { data: items } = useShopifyMenu(handle || "main-menu");
  if (!items?.length) return null;
  return (
    <>
      {items.map((item) => (
        <MobileShopifyItem key={item.id} item={item} onClose={onClose} />
      ))}
    </>
  );
}

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const { customer, isAuthenticated: isCustomerAuth, login: shopifyLogin, logout: shopifyLogout } = useShopifyCustomer();
  const { data: menus } = usePublicCmsMenus();
  const navigate = useNavigate();
  const { t, localePath } = useI18n();

  const topNavItems = menus?.top_navigation || [];
  const accountMenuItems = menus?.account_icon_menu || [];

  const handleLogout = () => {
    shopifyLogout();
    toast.success(t("header.logged_out"));
    setOpen(false);
    navigate(localePath("/"));
  };

  const close = () => setOpen(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="lg:hidden" aria-label="Menu">
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-left text-base">{t("nav.home")}</SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {/* CMS nav items (includes Shopify placeholders) */}
            {topNavItems.length > 0 ? (
              topNavItems.map((item: PublicMenuItem) => {
                if (item.type === "shopify_menu_placeholder") {
                  return <MobileShopifyPlaceholder key={item.id} handle={item.url || undefined} onClose={close} />;
                }
                const isExternal = item.target === "_blank" || item.url?.startsWith("http");
                if (isExternal) {
                  return (
                    <a key={item.id} href={item.url || "#"} target={item.target} rel="noopener noreferrer" onClick={close}
                      className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors rounded-md">
                      {item.label}
                    </a>
                  );
                }
                return (
                  <LocaleLink key={item.id} to={item.url || "#"} onClick={close}
                    className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors rounded-md">
                    {item.label}
                  </LocaleLink>
                );
              })
            ) : (
              <>
                <LocaleLink to="/unsere-marken" onClick={close}
                  className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors rounded-md">
                  {t("nav.brands")}
                </LocaleLink>
                <LocaleLink to="/news" onClick={close}
                  className="block px-4 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors rounded-md">
                  {t("nav.news")}
                </LocaleLink>
              </>
            )}

            {/* Divider */}
            <div className="my-3 border-t border-border" />

            {/* Account section */}
            <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("header.account")}
            </div>

            {isCustomerAuth ? (
              <>
                <LocaleLink to="/account" onClick={close}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent/50 transition-colors rounded-md">
                  <UserCircle className="h-4 w-4 text-muted-foreground" />
                  {customer?.displayName || t("header.account")}
                </LocaleLink>
                <LocaleLink to="/kundenkarte" onClick={close}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent/50 transition-colors rounded-md">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  Kundenkarte
                </LocaleLink>
                <LocaleLink to="/pferde" onClick={close}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent/50 transition-colors rounded-md">
                  <PawPrint className="h-4 w-4 text-muted-foreground" />
                  Meine Pferde
                </LocaleLink>
                <a href="https://account.horse-and-rider.de" target="_blank" rel="noopener noreferrer" onClick={close}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-accent/50 transition-colors rounded-md">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  Bestellungen
                  <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                </a>
                <button onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors rounded-md">
                  <LogOut className="h-4 w-4" />
                  {t("header.logout")}
                </button>
              </>
            ) : (
              <button onClick={() => { close(); shopifyLogin(); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground hover:bg-accent/50 transition-colors rounded-md">
                <LogIn className="h-4 w-4 text-muted-foreground" />
                {t("header.login") || "Anmelden"}
              </button>
            )}
          </nav>

          {/* Footer with language switcher */}
          <div className="border-t border-border p-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("header.language") || "Sprache"}</span>
            <LanguageSwitcher />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
