import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/i18n";

export const NewsletterSection = () => {
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

  return (
    <section className="py-14 bg-primary/5">
      <div className="container mx-auto px-4 max-w-2xl text-center">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
          {t("newsletter_section.title")}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t("newsletter_section.subtitle")}
        </p>

        {status === "success" ? (
          <div className="p-4 rounded-lg bg-primary/10 text-primary font-medium">
            {t("footer.newsletter_success")}
          </div>
        ) : (
          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
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
              {t("newsletter_section.cta")}
            </Button>
          </form>
        )}
        {status === "error" && (
          <p className="text-xs text-destructive mt-2">{errorMsg}</p>
        )}
      </div>

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
              id="nl-consent-section"
              checked={consentChecked}
              onCheckedChange={(v) => setConsentChecked(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="nl-consent-section" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
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
    </section>
  );
};
