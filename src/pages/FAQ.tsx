import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FaqJsonLd } from "@/components/JsonLd";

const faqs = [
  {
    category: "Bestellung & Bezahlung",
    items: [
      {
        q: "Welche Zahlungsmethoden werden akzeptiert?",
        a: "Wir akzeptieren Kreditkarte (Visa, Mastercard, Amex), PayPal, Apple Pay, Google Pay, Shop Pay, Klarna (Rechnung & Ratenkauf) sowie Vorkasse per Banküberweisung.",
      },
      {
        q: "Kann ich meine Bestellung nachträglich ändern?",
        a: "Solange Ihre Bestellung noch nicht versendet wurde, können wir in vielen Fällen noch Änderungen vornehmen. Kontaktieren Sie uns dafür bitte schnellstmöglich per Telefon oder E-Mail.",
      },
      {
        q: "Erhalte ich eine Bestellbestätigung?",
        a: "Ja, unmittelbar nach Ihrer Bestellung erhalten Sie eine Bestätigungs-E-Mail mit allen Details zu Ihrer Bestellung.",
      },
    ],
  },
  {
    category: "Versand & Lieferung",
    items: [
      {
        q: "Wie hoch sind die Versandkosten?",
        a: "Innerhalb Deutschlands beträgt der Standardversand 4,95 €. Ab einem Bestellwert von 50,00 € liefern wir versandkostenfrei. Für Sperrgut gelten gesonderte Versandkosten.",
      },
      {
        q: "Wie lange dauert die Lieferung?",
        a: "Sofort lieferbare Artikel versenden wir innerhalb von 1–2 Werktagen. Die Zustellung erfolgt in der Regel innerhalb von 2–4 Werktagen nach Versand.",
      },
      {
        q: "Kann ich meine Sendung verfolgen?",
        a: "Ja, nach dem Versand erhalten Sie eine E-Mail mit Ihrer Sendungsnummer, über die Sie den Status bei DHL oder GLS verfolgen können.",
      },
      {
        q: "Liefern Sie auch ins Ausland?",
        a: "Ja, wir liefern auch ins EU-Ausland. Die Versandkosten werden individuell berechnet. Bitte kontaktieren Sie uns vor der Bestellung für ein Angebot.",
      },
    ],
  },
  {
    category: "Retouren & Widerruf",
    items: [
      {
        q: "Wie kann ich einen Artikel zurückgeben?",
        a: "Sie können Artikel innerhalb von 30 Tagen nach Erhalt zurückgeben. Kontaktieren Sie uns und wir senden Ihnen ein Rücksendeetikett zu. Weitere Informationen finden Sie unter Widerrufsrecht.",
      },
      {
        q: "Wann erhalte ich meine Rückerstattung?",
        a: "Nach Eingang und Prüfung der Retoure erstatten wir den Kaufbetrag innerhalb von 5–7 Werktagen über die ursprüngliche Zahlungsmethode.",
      },
    ],
  },
  {
    category: "Produkte & Beratung",
    items: [
      {
        q: "Bieten Sie eine Fachberatung an?",
        a: "Ja! Unsere Experten beraten Sie gerne telefonisch unter 04172-6403 (Mo–Fr 10:00–18:30, Sa 09:00–14:00) oder per E-Mail. Für Sattel- und Gebissberatung kommen wir auch gerne zu Ihnen.",
      },
      {
        q: "Kann ich Produkte im Laden vor Ort ansehen?",
        a: "Selbstverständlich! Besuchen Sie unser Ladengeschäft in Salzhausen OT Luhmühlen, Alte Dorfstraße 8. Wir freuen uns auf Ihren Besuch.",
      },
      {
        q: "Bieten Sie Sattelanpassung und Sattlerei-Service an?",
        a: "Ja, wir bieten professionelle Sattelanpassung sowie Sattlerei- und Stickerei-Services an. Kontaktieren Sie uns für einen Termin.",
      },
    ],
  },
];

const FAQ = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 container mx-auto px-4 py-12 md:py-16 max-w-3xl">
      <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-2">
        Häufig gestellte Fragen
      </h1>
      <p className="text-muted-foreground mb-8">
        Hier finden Sie Antworten auf die häufigsten Fragen rund um Bestellung, Versand und unsere Services.
      </p>

      <div className="space-y-8">
        {faqs.map((section) => (
          <section key={section.category}>
            <h2 className="text-lg font-semibold text-foreground mb-3">{section.category}</h2>
            <Accordion type="single" collapsible className="border rounded-lg">
              {section.items.map((item, i) => (
                <AccordionItem key={i} value={`${section.category}-${i}`} className="border-b last:border-b-0">
                  <AccordionTrigger className="px-4 text-left text-sm font-medium hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>

      <div className="mt-12 p-6 bg-muted rounded-lg text-center">
        <h3 className="font-semibold text-foreground mb-2">Ihre Frage war nicht dabei?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Kontaktieren Sie uns – wir helfen Ihnen gerne weiter!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="tel:+4941726403"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity"
          >
            04172 - 6403
          </a>
          <a
            href="/kontakt"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-border rounded text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Kontaktformular
          </a>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default FAQ;
