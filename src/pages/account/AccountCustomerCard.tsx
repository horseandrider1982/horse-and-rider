import { useEffect, useState } from "react";
import { useShopifyCustomer } from "@/lib/auth/ShopifyCustomerContext";
import { supabase } from "@/integrations/supabase/client";
import { AccountLayout } from "@/components/account/AccountLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePageMeta } from "@/hooks/usePageMeta";
import { CreditCard, Loader2, Tag } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-amber-700/10 text-amber-800 border-amber-700/30",
  silber: "bg-slate-400/10 text-slate-600 border-slate-400/30",
  gold: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  platin: "bg-violet-500/10 text-violet-700 border-violet-500/30",
};

interface CustomerCard {
  id: string;
  card_number: string | null;
  tier: string;
  status: string;
  valid_from: string | null;
  valid_until: string | null;
  notes: string | null;
}

export default function AccountCustomerCard() {
  usePageMeta({ title: "Kundenkarte", description: "Ihre Kundenkarte bei Horse & Rider.", noIndex: true });

  const { customer } = useShopifyCustomer();
  const [card, setCard] = useState<CustomerCard | null>(null);
  const [cardTags, setCardTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer?.id) { setLoading(false); return; }

    // Fetch customer card from DB and tags from Shopify in parallel
    const fetchCard = supabase
      .from("customer_cards")
      .select("*")
      .eq("shopify_customer_id", customer.id)
      .maybeSingle()
      .then(({ data }) => data as CustomerCard | null);

    const fetchTags = supabase.functions
      .invoke("get-customer-tags", {
        body: { shopify_customer_id: customer.id },
      })
      .then(({ data }) => (data?.cardTags as string[]) || [])
      .catch(() => [] as string[]);

    Promise.all([fetchCard, fetchTags]).then(([cardData, tags]) => {
      setCard(cardData);
      setCardTags(tags);
      setLoading(false);
    });
  }, [customer?.id]);

  return (
    <AccountLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Kundenkarte</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : card ? (
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Horse & Rider Luhmühlen</p>
                  <p className="text-lg font-heading font-bold">{customer?.displayName}</p>
                </div>
                <Badge className={TIER_COLORS[card.tier] || ""} variant="outline">
                  {card.tier.charAt(0).toUpperCase() + card.tier.slice(1)}
                </Badge>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-mono text-lg tracking-widest">
                  {card.card_number || "–"}
                </span>
              </div>

              {cardTags.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {cardTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {card.valid_from && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Gültig ab {new Date(card.valid_from).toLocaleDateString("de-DE")}
                  {card.valid_until && ` bis ${new Date(card.valid_until).toLocaleDateString("de-DE")}`}
                </p>
              )}
            </div>
            {card.notes && (
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{card.notes}</p>
              </CardContent>
            )}
          </Card>
        ) : cardTags.length > 0 ? (
          /* No DB card, but Shopify has Card-tags → show segment info */
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Horse & Rider Luhmühlen</p>
                  <p className="text-lg font-heading font-bold">{customer?.displayName}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {cardTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                Ihr Kundenstatus wurde in unserem System erkannt. Details zu Ihrer Kundenkarte erhalten Sie bei Ihrem nächsten Besuch im Laden.
              </p>
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Keine Kundenkarte</CardTitle>
              <CardDescription>
                Sie haben noch keine Kundenkarte. Sprechen Sie uns gerne im Laden an – wir stellen Ihnen gerne eine aus.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </AccountLayout>
  );
}
