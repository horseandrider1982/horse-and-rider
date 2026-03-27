import { useState } from "react";
import { MapPin, Phone, Mail, Clock, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest } from "@/lib/shopify";
import { usePublicCmsMenus } from "@/hooks/usePublicCmsMenus";
import { CmsMenuItemRenderer } from "@/components/CmsMenuItemRenderer";
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/i18n";
import logo from "@/assets/logo.png";

const PAYMENT_SETTINGS_QUERY = `
  query ShopPaymentSettings {
    shop {
      paymentSettings {
        acceptedCardBrands
        supportedDigitalWallets
      }
    }
  }
`;

const PAYMENT_ICON_MAP: Record<string, { label: string; bg: string; textColor: string; icon?: string }> = {
  VISA: { label: "VISA", bg: "#1A1F71", textColor: "white" },
  MASTERCARD: { label: "Mastercard", bg: "#FF5F00", textColor: "white" },
  AMERICAN_EXPRESS: { label: "Amex", bg: "#006FCF", textColor: "white" },
  DISCOVER: { label: "Discover", bg: "#FF6000", textColor: "white" },
  JCB: { label: "JCB", bg: "#0B7CBE", textColor: "white" },
  DINERS_CLUB: { label: "Diners", bg: "#006BA6", textColor: "white" },
  APPLE_PAY: { label: "Apple Pay", bg: "#000000", textColor: "white" },
  GOOGLE_PAY: { label: "Google Pay", bg: "#4285F4", textColor: "white" },
  SHOPIFY_PAY: { label: "Shop Pay", bg: "#5A31F4", textColor: "white" },
  PAYPAL: { label: "PayPal", bg: "#003087", textColor: "white" },
  KLARNA: { label: "Klarna", bg: "#FFB3C7", textColor: "#0A0B09" },
  GIROPAY: { label: "Giropay", bg: "#003A7D", textColor: "white" },
  IDEAL: { label: "iDEAL", bg: "#CC0066", textColor: "white" },
  SOFORT: { label: "Sofort", bg: "#EF6C00", textColor: "white" },
  SEPA: { label: "SEPA", bg: "#2E4057", textColor: "white" },
};

function PaymentBadge({ id }: { id: string }) {
  const info = PAYMENT_ICON_MAP[id];
  if (!info) return (
    <span className="inline-flex items-center justify-center rounded px-2 py-1 text-[10px] font-semibold bg-muted text-muted-foreground border border-border min-w-[56px] h-8">
      {id}
    </span>
  );
  return (
    <span
      className="inline-flex items-center justify-center rounded px-2 py-1 text-[10px] font-bold min-w-[56px] h-8 border border-border/30"
      style={{ backgroundColor: info.bg, color: info.textColor }}
    >
      {info.label}
    </span>
  );
}

function usePaymentSettings() {
  return useQuery({
    queryKey: ["shopify-payment-settings"],
    queryFn: async () => {
      const data = await storefrontApiRequest(PAYMENT_SETTINGS_QUERY);
      const settings = data?.data?.shop?.paymentSettings;
      const methods: string[] = [];
      if (settings?.acceptedCardBrands) methods.push(...settings.acceptedCardBrands);
      if (settings?.supportedDigitalWallets) methods.push(...settings.supportedDigitalWallets);
      return methods;
    },
    staleTime: 1000 * 60 * 60,
  });
}

function NewsletterSignup() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setConsentChecked(false);
    setShowConsent(true);
  };

  const handleConfirm = async () => {
    if (!consentChecked) return;
    setShowConsent(false);
    setStatus("loading");
    setErrorMsg("");
    try {
      const { data, error } = await supabase.functions.invoke("newsletter-subscribe", {
        body: { email: email.trim() },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("success");
        setEmail("");
      } else {
        throw new Error(data?.error || t("footer.newsletter_error"));
      }
    } catch (err) {
      console.error("Newsletter error:", err);
      setErrorMsg(t("footer.newsletter_error"));
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="mt-4 p-3 rounded bg-background/10 text-sm text-background">
        {t("footer.newsletter_success")}
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleFormSubmit} className="mt-4">
        <p className="text-xs text-background/60 mb-2">{t("footer.newsletter_label")}</p>
        <div className="flex gap-2">
          <Input
            type="email"
            required
            placeholder={t("footer.newsletter_placeholder")}
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
            className="h-9 text-sm bg-background/10 border-background/20 text-background placeholder:text-background/40 flex-1"
          />
          <Button type="submit" size="sm" className="h-9 px-3" disabled={status === "loading"}>
            {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {status === "error" && (
          <p className="text-xs text-destructive mt-1">{errorMsg}</p>
        )}
      </form>

      <Dialog open={showConsent} onOpenChange={setShowConsent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("footer.newsletter_title")}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-2">
              {t("footer.newsletter_consent_text")}
              {" ("}
              <span className="font-medium text-foreground">{email}</span>
              {")"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-3 py-2">
            <Checkbox
              id="newsletter-consent"
              checked={consentChecked}
              onCheckedChange={(v) => setConsentChecked(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="newsletter-consent" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              {t("footer.newsletter_consent_label")}{" "}
              <LocaleLink to="/datenschutz" className="text-primary underline underline-offset-2 hover:text-primary/80">
                {t("footer.privacy")}
              </LocaleLink>
            </label>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConsent(false)}>
              {t("footer.cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={!consentChecked}>
              {t("footer.subscribe")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const Footer = () => {
  const { t } = useI18n();
  const { data: paymentMethods } = usePaymentSettings();
  const { data: menus } = usePublicCmsMenus();

  const infoItems = menus?.information || [];
  const legalItems = menus?.legal_information || [];

  return (
    <footer className="bg-foreground text-background/90 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Service Hotline */}
          <div>
            <h4 className="font-semibold text-background mb-4">{t("footer.service_hotline")}</h4>
            <p className="text-sm text-background/70 mb-3">{t("footer.phone_support")}</p>
            <a href="tel:+4941726403" className="text-lg font-bold text-background hover:text-primary transition-colors block mb-2">
              04172 - 6403
            </a>
            <div className="space-y-0.5 text-sm text-background/70 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t("footer.hours_weekday")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t("footer.hours_saturday")}</span>
              </div>
            </div>
            <h5 className="font-semibold text-background text-sm mb-1">{t("footer.store_title")}</h5>
            <p className="text-sm text-background/70">Horse & Rider Reitsportfachhandels GmbH</p>
            <div className="flex items-start gap-2 text-sm text-background/70 mt-1">
              <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>Alte Dorfstraße 8<br />21376 Salzhausen OT Luhmühlen</span>
            </div>
          </div>

          {/* Col 2: Informationen */}
          <div>
            <h4 className="font-semibold text-background mb-4">{t("footer.information")}</h4>
            <nav className="space-y-2 text-sm">
              {infoItems.length > 0 ? (
                <CmsMenuItemRenderer items={infoItems} linkClassName="block text-background/70 hover:text-background transition-colors" mode="block" />
              ) : (
                <>
                  <LocaleLink to="/news" className="block text-background/70 hover:text-background transition-colors">{t("footer.news")}</LocaleLink>
                  <LocaleLink to="/unsere-marken" className="block text-background/70 hover:text-background transition-colors">{t("footer.brands")}</LocaleLink>
                  <LocaleLink to="/account" className="block text-background/70 hover:text-background transition-colors">{t("footer.account")}</LocaleLink>
                  <LocaleLink to="/versand" className="block text-background/70 hover:text-background transition-colors">{t("footer.shipping_payment")}</LocaleLink>
                  <LocaleLink to="/faq" className="block text-background/70 hover:text-background transition-colors">{t("footer.faq")}</LocaleLink>
                  <LocaleLink to="/kontakt" className="block text-background/70 hover:text-background transition-colors">{t("footer.contact")}</LocaleLink>
                </>
              )}
            </nav>
          </div>

          {/* Col 3: Gesetzliche Informationen */}
          <div>
            <h4 className="font-semibold text-background mb-4">{t("footer.legal")}</h4>
            <nav className="space-y-2 text-sm">
              {legalItems.length > 0 ? (
                <CmsMenuItemRenderer items={legalItems} linkClassName="block text-background/70 hover:text-background transition-colors" mode="block" />
              ) : (
                <>
                  <LocaleLink to="/datenschutz" className="block text-background/70 hover:text-background transition-colors">{t("footer.privacy")}</LocaleLink>
                  <LocaleLink to="/agb" className="block text-background/70 hover:text-background transition-colors">{t("footer.terms")}</LocaleLink>
                  <LocaleLink to="/impressum" className="block text-background/70 hover:text-background transition-colors">{t("footer.imprint")}</LocaleLink>
                  <LocaleLink to="/widerrufsrecht" className="block text-background/70 hover:text-background transition-colors">{t("footer.withdrawal")}</LocaleLink>
                </>
              )}
            </nav>
          </div>

          {/* Col 4: Logo + Kontakt */}
          <div>
            <img src={logo} alt="Horse & Rider Luhmühlen" className="h-10 w-auto brightness-0 invert mb-4" />
            <p className="text-sm text-background/70 leading-relaxed mb-3">{t("footer.about")}</p>
            <div className="flex items-center gap-2 text-sm text-background/70">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              <a href="tel:+4941726403" className="hover:text-background transition-colors">+49 4172 6403</a>
            </div>
            <div className="flex items-center gap-2 text-sm text-background/70 mt-1">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <a href="mailto:info@horse-and-rider.de" className="hover:text-background transition-colors">info@horse-and-rider.de</a>
            </div>
            <NewsletterSignup />
          </div>
        </div>

        {/* Row 2: Zahlungsmethoden & Versand */}
        <div className="border-t border-background/20 mt-8 pt-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h5 className="font-semibold text-background text-sm mb-3">{t("footer.payment_methods")}</h5>
            <div className="flex flex-wrap gap-2">
              {paymentMethods && paymentMethods.length > 0 ? (
                paymentMethods.map((method) => <PaymentBadge key={method} id={method} />)
              ) : (
                <span className="text-xs text-background/50">{t("footer.payment_loading")}</span>
              )}
            </div>
          </div>
          <div>
            <h5 className="font-semibold text-background text-sm mb-3">{t("footer.shipping")}</h5>
            <div className="flex items-center gap-3">
              <div className="bg-[#FED530] rounded px-3 py-1.5 flex items-center justify-center h-10 min-w-[70px]">
                <span className="text-[#003E7E] font-extrabold text-lg tracking-tight">GLS</span>
              </div>
              <div className="bg-[#FFCC00] rounded px-3 py-1.5 flex items-center justify-center h-10 min-w-[70px]">
                <span className="text-[#D40511] font-extrabold text-lg tracking-tight">DHL</span>
              </div>
            </div>
          </div>
          <div>
            <h5 className="font-semibold text-background text-sm mb-3">{t("footer.buyer_protection")}</h5>
            <a href="https://www.trustedshops.de/bewertung/info_XD9E26EDF6E35468A4F6C9BDFD0A6E540.html" target="_blank" rel="noopener noreferrer" className="inline-block">
              <img src="https://widgets.trustedshops.com/images/seal/XD9E26EDF6E35468A4F6C9BDFD0A6E540/80/seal.png" alt="Trusted Shops" className="h-16 w-auto" onError={(e) => { const target = e.currentTarget; target.style.display = 'none'; const fallback = target.nextElementSibling as HTMLElement; if (fallback) fallback.style.display = 'flex'; }} />
              <span className="items-center justify-center rounded px-3 py-2 text-xs font-bold border border-background/30 text-background hidden gap-1.5">✓ Trusted Shops</span>
            </a>
          </div>
        </div>

        <div className="border-t border-background/20 mt-6 pt-4 text-center text-xs text-background/50">
          {t("footer.copyright").replace("{year}", String(new Date().getFullYear()))}
        </div>
      </div>
    </footer>
  );
};
