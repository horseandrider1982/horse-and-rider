import { useState, useEffect } from "react";
import { CheckCircle, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const ThankYou = () => {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  usePageMeta({
    title: "Vielen Dank für Ihre Bestellung",
    description: "Ihre Bestellung bei Horse & Rider Luhmühlen wurde erfolgreich aufgegeben.",
    noIndex: true,
  });

  // GA4 purchase + Google Ads conversion – fire once on page load
  useEffect(() => {
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ ecommerce: null });
    w.dataLayer.push({
      event: "purchase",
      ecommerce: {
        currency: "EUR",
        transaction_id: `order_${Date.now()}`,
        value: 0, // actual value not available from Shopify redirect
        items: [],
      },
    });
    // Google Ads conversion event
    w.dataLayer.push({
      event: "ads_conversion_purchase",
      ads_conversion_id: "AW-1051638393",
      ads_conversion_label: "NMdMCIOE2pMcEPn0uvUD",
    });
  }, []);

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
        throw new Error(data?.error || "Anmeldung fehlgeschlagen");
      }
    } catch (err) {
      console.error("Newsletter error:", err);
      setErrorMsg("Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Thank you message */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground">
              Vielen Dank für deine Bestellung!
            </h1>
            <p className="text-muted-foreground text-lg">
              Deine Bestellung wurde erfolgreich aufgegeben. Du erhältst in Kürze eine Bestätigungs-E-Mail.
            </p>
          </div>

          {/* Newsletter signup */}
          <div className="bg-primary/5 rounded-xl p-6 space-y-4">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              5&nbsp;% Rabatt sichern!
            </h2>
            <p className="text-muted-foreground text-sm">
              Melde dich für unseren Newsletter an und erhalte 5&nbsp;% Rabatt auf deine nächste Bestellung sowie exklusive Angebote und Neuigkeiten.
            </p>

            {status === "success" ? (
              <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
                {t("footer.newsletter_success")}
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  required
                  placeholder={t("footer.newsletter_placeholder")}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
                  className="h-12 flex-1"
                />
                <Button type="submit" size="lg" className="h-12 px-6" disabled={status === "loading"}>
                  {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Anmelden
                </Button>
              </form>
            )}
            {status === "error" && (
              <p className="text-xs text-destructive">{errorMsg}</p>
            )}
          </div>

          <LocaleLink to="/" className="inline-block text-primary underline underline-offset-2 hover:text-primary/80">
            Zurück zum Shop
          </LocaleLink>
        </div>
      </main>
      <Footer />

      {/* Consent dialog */}
      <Dialog open={showConsent} onOpenChange={setShowConsent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("footer.newsletter_title")}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-2">
              {t("footer.newsletter_consent_text")} (<span className="font-medium text-foreground">{email}</span>)
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <Checkbox
              id="nl-consent-thankyou"
              checked={consentChecked}
              onCheckedChange={(v) => setConsentChecked(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="nl-consent-thankyou" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              {t("footer.newsletter_consent_label")}{" "}
              <LocaleLink to="/datenschutz" className="text-primary underline underline-offset-2 hover:text-primary/80">
                {t("footer.privacy")}
              </LocaleLink>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConsent(false)}>{t("footer.cancel")}</Button>
            <Button onClick={handleConfirm} disabled={!consentChecked}>{t("footer.subscribe")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThankYou;
