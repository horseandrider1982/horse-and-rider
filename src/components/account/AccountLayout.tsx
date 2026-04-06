import { useLocation } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LocaleLink } from "@/components/LocaleLink";
import { useShopifyCustomer } from "@/lib/auth/ShopifyCustomerContext";
import { useI18n } from "@/i18n";
import { User, CreditCard, PawPrint, ShoppingBag, LogOut, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "profile", path: "/account", icon: User, label: "Mein Profil" },
  { key: "kundenkarte", path: "/kundenkarte", icon: CreditCard, label: "Kundenkarte" },
  { key: "pferde", path: "/pferde", icon: PawPrint, label: "Meine Pferde" },
];

interface AccountLayoutProps {
  children: React.ReactNode;
}

export function AccountLayout({ children }: AccountLayoutProps) {
  const { customer, logout } = useShopifyCustomer();
  const { localePath } = useI18n();
  const location = useLocation();

  const isActive = (path: string) => {
    const full = localePath(path);
    if (path === "/account") return location.pathname === full;
    return location.pathname.startsWith(full);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
          {/* Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <div className="bg-card rounded-lg border border-border p-4 space-y-1 sticky top-24">
              {/* Customer greeting */}
              {customer && (
                <div className="pb-3 mb-3 border-b border-border">
                  <p className="font-medium text-sm truncate">
                    {customer.displayName || customer.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                </div>
              )}

              {/* Nav items */}
              {navItems.map((item) => (
                <LocaleLink
                  key={item.key}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                    isActive(item.path)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </LocaleLink>
              ))}

              {/* External: Bestellungen */}
              <a
                href="https://account.horse-and-rider.de"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                Bestellungen
                <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
              </a>

              {/* Logout */}
              <div className="pt-3 mt-3 border-t border-border">
                <button
                  onClick={logout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors w-full"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Abmelden
                </button>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
