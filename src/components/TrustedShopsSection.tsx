import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n";
import { useIsMobile } from "@/hooks/use-mobile";

export const TrustedShopsSection = () => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Clear previous widget
    el.innerHTML = "";

    const widgetId = isMobile
      ? "wdg-3af3c7a8-4921-4456-9d28-0feb56898812"
      : "wdg-1496fed3-572c-4bc9-b9f5-4c0fd5e6fa25";

    const widget = document.createElement("etrusted-widget");
    widget.setAttribute("data-etrusted-widget-id", widgetId);
    el.appendChild(widget);

    const script = document.createElement("script");
    script.src = "https://integrations.etrusted.com/applications/widget.js/v2";
    script.async = true;
    el.appendChild(script);
  }, [isMobile]);

  return (
    <section className="py-14 bg-card">
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
          {t("trusted_section.title")}
        </h2>
        <p className="text-muted-foreground mb-8">
          {t("trusted_section.subtitle")}
        </p>
        <div ref={containerRef} className="flex justify-center" />
      </div>
    </section>
  );
};
