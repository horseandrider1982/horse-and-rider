import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CONSENT_KEY = "cookie-consent";

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

  const accept = (value: "all" | "essential") => {
    localStorage.setItem(CONSENT_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 md:p-6">
      <div className="container mx-auto max-w-3xl bg-background border border-border rounded-lg shadow-lg p-5 md:p-6">
        <h3 className="font-semibold text-foreground text-sm mb-2">
          🍪 Wir verwenden Leckerlies (Cookies)
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Wir haben nicht nur ganz viele Kekse für Dein Pferd, wir nutzen auch Cookies, um Dir die bestmögliche
          Erfahrung auf unserer Website zu bieten. Weitere Informationen findest Du in unserer{" "}
          <Link to="/datenschutz" className="text-primary underline underline-offset-2 hover:text-primary/80">
            Datenschutzerklärung
          </Link>.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => accept("essential")}
          >
            Nur notwendige
          </Button>
          <Button
            size="sm"
            onClick={() => accept("all")}
          >
            Alle akzeptieren
          </Button>
        </div>
      </div>
    </div>
  );
};
