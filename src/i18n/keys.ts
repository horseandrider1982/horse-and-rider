/**
 * Default UI translations (German).
 * This is the single source of truth for all UI text keys.
 * Shopify content (products, collections, pages) is NOT managed here.
 */
export const defaultTranslations: Record<string, string> = {
  // TopBar
  "topbar.free_shipping": "Kostenloser Versand ab € 50,-",
  "topbar.products_count": "Über 30.000 Produkte",
  "topbar.money_back": "30 Tage Geld-Zurück-Garantie",
  "topbar.phone_advisory": "Fachberatung: +49 4172 6403",

  // Header / Navigation
  "nav.home": "Startseite",
  "nav.brands": "Unsere Marken",
  "nav.news": "News",
  "header.search_open": "Suche öffnen",
  "header.account": "Kundenkonto",
  "header.login": "Anmelden",
  "header.logout": "Abmelden",
  "header.logged_out": "Erfolgreich abgemeldet",

  // HeroBanner
  "hero.badge": "KI-gestützte Suche & Beratung",
  "hero.title": "Finde die perfekte Ausrüstung",
  "hero.title_highlight": "für Pferd & Reiter",
  "hero.subtitle": "Suche nach Produkten, Marken und Kategorien — oder stelle eine Frage und erhalte eine persönliche Beratung durch unsere KI.",
  "hero.search_placeholder": "Produkte suchen oder eine Frage stellen …",
  "hero.popular": "Beliebt:",

  // HeroSection
  "hero_section.title": "Ihr kompetenter Partner rund um den Reitsport",
  "hero_section.subtitle": "Über 30.000 Produkte für Reiter und Pferd. Fachberatung vor Ort in Luhmühlen oder online.",
  "hero_section.cta_shop": "Jetzt Shoppen",
  "hero_section.cta_phone": "Beratung: 04172-6403",

  // ServiceCards
  "services.store.title": "Reitsportfachgeschäft",
  "services.store.desc": "Über 10.000 Artikel vor Ort. Kompetente Beratung in Luhmühlen.",
  "services.online.title": "Online-Shop",
  "services.online.desc": "Über 30.000 Artikel online verfügbar. Schneller Versand.",
  "services.saddle.title": "Sattel-Service",
  "services.saddle.desc": "Mobiler Sattelservice im Umkreis von 50 km. Beratung & Anpassung.",
  "services.embroidery.title": "Stickerei",
  "services.embroidery.desc": "Individuelle Stickerei für Schabracken, Decken, Jacken u.v.m.",

  // CategoryHighlights
  "categories.title": "Was wir besonders gut können",
  "categories.eventing.title": "Vielseitigkeit",
  "categories.eventing.desc": "Alles für den Vielseitigkeitsreiter und das Vielseitigkeitspferd.",
  "categories.saddles.title": "Sättel",
  "categories.saddles.desc": "Prestige, Passier, Kentaur und Euroriding – online konfigurieren.",
  "categories.bits.title": "Gebisse",
  "categories.bits.desc": "Deutschlands größte Gebissauswahl mit Gebiss-Finder.",
  "categories.airbag.title": "Airbagwesten",
  "categories.airbag.desc": "Helite & Freejump – kompetente Beratung inklusive.",

  // ProductGrid
  "products.title": "Unsere Produkte",
  "products.loading_error": "Produkte konnten nicht geladen werden.",
  "products.empty": "Noch keine Produkte vorhanden",
  "products.empty_hint": "Erstelle dein erstes Produkt, indem du mir im Chat sagst, was du verkaufen möchtest.",
  "products.added_to_cart": "In den Warenkorb gelegt",

  // Cart
  "cart.title": "Warenkorb",
  "cart.empty": "Dein Warenkorb ist leer",
  "cart.items_one": "1 Artikel im Warenkorb",
  "cart.items_other": "{count} Artikel im Warenkorb",
  "cart.total": "Gesamt",
  "cart.checkout": "Zur Kasse",

  // ProductDetail
  "product.back": "Zurück zum Shop",
  "product.not_found": "Produkt nicht gefunden",
  "product.add_to_cart": "In den Warenkorb",
  "product.unavailable": "Nicht verfügbar",
  "product.configure_first": "Bitte zuerst konfigurieren",
  "product.description": "Beschreibung",
  "product.configure_change": "Konfiguration ändern",
  "product.configure_now": "Jetzt konfigurieren",
  "product.config_complete": "Konfiguration abgeschlossen",
  "product.incl_config": "(inkl. Konfiguration)",
  "product.advice_title": "Beratung nötig? Fragen zum Produkt?",
  "product.advice_subtitle": "Kontaktieren Sie uns einfach:",
  "product.phone": "Telefon",
  "product.contact_form": "Kontaktformular",
  "product.online_advice": "Online Beratung",

  // CookieBanner
  "cookie.title": "🍪 Wir verwenden Leckerlies (Cookies)",
  "cookie.text": "Wir haben nicht nur ganz viele Kekse für Dein Pferd, wir nutzen auch Cookies, um Dir die bestmögliche Erfahrung auf unserer Website zu bieten. Weitere Informationen findest Du in unserer",
  "cookie.privacy_link": "Datenschutzerklärung",
  "cookie.essential_only": "Nur notwendige",
  "cookie.accept_all": "Alle akzeptieren",

  // Footer
  "footer.service_hotline": "Service Hotline",
  "footer.phone_support": "Telefonische Unterstützung und Beratung unter:",
  "footer.hours_weekday": "Mo-Fr, 10:00 - 18:30 Uhr",
  "footer.hours_saturday": "Sa, 09:00 - 14:00",
  "footer.store_title": "Ladengeschäft:",
  "footer.information": "Informationen",
  "footer.legal": "Gesetzliche Informationen",
  "footer.about": "Ihr kompetenter Partner rund um den Reitsport seit vielen Jahren in Luhmühlen.",
  "footer.payment_methods": "Zahlungsmethoden",
  "footer.payment_loading": "Zahlungsmethoden werden geladen…",
  "footer.shipping": "Versanddienstleister",
  "footer.buyer_protection": "Käuferschutz",
  "footer.copyright": "© {year} Horse & Rider Luhmühlen. Alle Rechte vorbehalten.",
  "footer.newsletter_label": "Newsletter abonnieren:",
  "footer.newsletter_placeholder": "Ihre E-Mail-Adresse",
  "footer.newsletter_success": "✓ Vielen Dank! Sie erhalten in Kürze eine Bestätigungs-E-Mail.",
  "footer.newsletter_error": "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.",
  "footer.newsletter_title": "Newsletter-Anmeldung",
  "footer.newsletter_consent_text": "Mit der Anmeldung zum Newsletter erklären Sie sich damit einverstanden, dass wir Ihre E-Mail-Adresse zum Versand von Informationen über Angebote, Neuheiten und Aktionen von Horse & Rider nutzen dürfen.",
  "footer.newsletter_consent_label": "Ich stimme der Verarbeitung meiner E-Mail-Adresse gemäß der Datenschutzerklärung zu. Ich kann meine Einwilligung jederzeit widerrufen.",
  "footer.cancel": "Abbrechen",
  "footer.subscribe": "Anmelden",
  "footer.news": "News & Aktuelles",
  "footer.brands": "Unsere Marken",
  "footer.account": "Kundenkonto",
  "footer.shipping_payment": "Versand & Zahlung",
  "footer.faq": "FAQ",
  "footer.contact": "Kontakt",
  "footer.privacy": "Datenschutz",
  "footer.terms": "AGB",
  "footer.imprint": "Impressum",
  "footer.withdrawal": "Widerrufsrecht",

  // Search
  "search.title": "KI-gestützte Suche & Beratung",
  "search.close": "Suche schließen",
  "search.subtitle": "Suche nach Produkten, Marken und Kategorien oder stelle konkrete Fragen rund um Ausrüstung für Pferd und Reiter. Unsere Suche hilft dir nicht nur beim Finden, sondern auch bei der Auswahl passender Produkte.",
  "search.placeholder": "Produkte suchen oder eine Frage stellen …",
  "search.clear": "Suche leeren",
  "search.back": "Zurück",
  "search.results_for": "Suchergebnisse für „{query}"",
  "search.search": "Suche",
  "search.result_one": "1 Ergebnis",
  "search.result_other": "{count} Ergebnisse",
  "search.loading_error": "Suchergebnisse konnten nicht geladen werden.",
  "search.no_results": "Keine Ergebnisse für „{query}"",

  // ProductContact
  "contact.title": "Produktanfrage",
  "contact.subject_prefix": "Frage zum Produkt",
  "contact.subject": "Betreff",
  "contact.email": "Ihre E-Mail-Adresse *",
  "contact.email_placeholder": "ihre@email.de",
  "contact.phone": "Ihre Telefonnummer",
  "contact.message": "Ihre Nachricht *",
  "contact.message_placeholder": "Ihre Frage zum Produkt...",
  "contact.send": "Anfrage senden",
  "contact.fill_required": "Bitte E-Mail und Nachricht ausfüllen.",
  "contact.email_opened": "E-Mail-Programm wird geöffnet",

  // NotFound
  "notfound.title": "404",
  "notfound.message": "Seite nicht gefunden",
  "notfound.back": "Zurück zur Startseite",

  // General
  "general.loading": "Wird geladen…",
  "general.yes": "Ja",
  "general.no": "Nein",
};
