import { useShopifyCustomer } from "@/lib/auth/ShopifyCustomerContext";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ExternalLink, User, Mail } from "lucide-react";

export default function AccountProfile() {
  usePageMeta({
    title: "Mein Profil",
    description: "Ihr Profil bei Horse & Rider Luhmühlen.",
    noIndex: true,
  });

  const { customer } = useShopifyCustomer();

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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Name
                </p>
                <p className="font-medium">
                  {customer?.firstName && customer?.lastName
                    ? `${customer.firstName} ${customer.lastName}`
                    : customer?.displayName || "–"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> E-Mail
                </p>
                <p className="font-medium">{customer?.email || "–"}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button variant="outline" asChild>
                <a
                  href="https://account.horse-and-rider.de"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Profil bei Shopify bearbeiten
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountLayout>
  );
}
