import { useShopifyCustomer } from "@/lib/auth/ShopifyCustomerContext";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ExternalLink, User, Mail, Loader2, RefreshCw } from "lucide-react";

export default function AccountProfile() {
  usePageMeta({
    title: "Mein Profil",
    description: "Ihr Profil bei Horse & Rider Luhmühlen.",
    noIndex: true,
  });

  const { customer, isLoading, refreshCustomer } = useShopifyCustomer();

  return (
    <AccountLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Mein Profil</h1>

        <Card>
          <CardHeader>
            <CardTitle>Persönliche Daten</CardTitle>
            <CardDescription>
              Ihre Kontodaten werden über Ihren Shopify-Account verwaltet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : customer ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" /> Name
                    </p>
                    <p className="font-medium">
                      {customer.firstName && customer.lastName
                        ? `${customer.firstName} ${customer.lastName}`
                        : customer.displayName || "–"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> E-Mail
                    </p>
                    <p className="font-medium">{customer.email || "–"}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center gap-3">
                  <Button variant="outline" asChild>
                    <a
                      href="https://account.horse-and-rider.de"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      Profil bearbeiten
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  Ihre Profildaten konnten nicht geladen werden.
                </p>
                <Button variant="outline" onClick={() => refreshCustomer()}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Erneut laden
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  );
}
