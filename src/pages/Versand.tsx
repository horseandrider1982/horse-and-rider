import { LegalPageLayout } from "@/components/LegalPageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, CreditCard, Globe, MapPin, Clock, Package } from "lucide-react";

const shippingZones = [
  {
    id: "de",
    label: "Deutschland",
    icon: <MapPin className="h-4 w-4" />,
    carriers: [
      {
        name: "GLS",
        freeFrom: "50,00 €",
        cost: "4,90 €",
        costNote: "unter 50,00 € Bestellwert",
        delivery: "1–3 Werktage",
        note: "gesamtes Bundesgebiet (außer Inseln – Inselzuschlag)",
      },
      {
        name: "DHL",
        freeFrom: "50,00 €",
        cost: "5,90 €",
        costNote: "unter 50,00 € Bestellwert",
        delivery: "1–3 Werktage",
        note: "gesamtes Bundesgebiet (außer Inseln – Inselzuschlag)",
      },
    ],
  },
  {
    id: "eu",
    label: "EU / Europa",
    icon: <Globe className="h-4 w-4" />,
    carriers: [
      {
        name: "DHL",
        freeFrom: "200,00 €",
        cost: "9,90 €",
        costNote: "unter 200,00 € Bestellwert",
        delivery: "2–5 Werktage",
        note: "Belgien, Bulgarien, Dänemark, Estland, Finnland, Frankreich, Griechenland, Irland, Italien, Kroatien, Lettland, Litauen, Luxemburg, Malta, Niederlande, Österreich, Polen, Portugal, Rumänien, Schweden, Slowakei, Slowenien, Spanien, Tschechien, Ungarn, Vereinigtes Königreich, Zypern u.\u00a0a.",
      },
    ],
  },
  {
    id: "world",
    label: "Weltweit",
    icon: <Globe className="h-4 w-4" />,
    carriers: [
      {
        name: "DHL",
        freeFrom: "400,00 €",
        cost: "19,90 €",
        costNote: "unter 400,00 € Bestellwert",
        delivery: "3–12 Werktage",
        note: "Alle weiteren Länder weltweit",
      },
    ],
  },
];

const paymentMethods = [
  {
    name: "PayPal",
    description:
      "PayPal, PayPal Rechnungskauf, Lastschrift und Kreditkarte über PayPal Plus. Für Lastschrift und Kreditkarte ist kein PayPal-Konto erforderlich.",
  },
  {
    name: "Klarna",
    description: "Klarna Rechnungskauf und Klarna Ratenzahlung.",
  },
  {
    name: "Amazon Pay",
    description:
      "Zahlung mit jeder in Ihrem Amazon-Kundenkonto hinterlegten Kredit- oder Debitkarte.",
  },
  {
    name: "Apple Pay",
    description:
      "Bezahlen Sie direkt über Safari auf iPhone, iPad oder Mac – schnell, einfach und sicher.",
  },
  {
    name: "Kreditkarte",
    description: "Visa und Mastercard werden direkt akzeptiert.",
  },
  {
    name: "Sofortüberweisung",
    description:
      "Online-Direktüberweisung über Ihr Bankkonto – sicher und sofort bestätigt.",
  },
  {
    name: "Giropay",
    description:
      "Zahlen Sie mit Ihrem vertrauten Online-Banking per PIN und TAN – kein Vertippen bei IBAN oder BIC.",
  },
  {
    name: "iDEAL",
    description:
      "Sichere Zahlungsmethode für Kunden mit einem niederländischen Bankkonto.",
  },
  {
    name: "Nachnahme",
    description:
      "Bezahlen Sie Ihre Bestellung beim Erhalt an den Zusteller. Zusatzgebühr: 6,00 €.",
  },
  {
    name: "Vorkasse",
    description:
      "Überweisen Sie den Betrag vorab per Banküberweisung. Versand erfolgt nach Zahlungseingang.",
  },
];

const Versand = () => (
  <LegalPageLayout>
    <h1>Versand &amp; Zahlung</h1>

    {/* ───── Versand ───── */}
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        <h2 className="!mt-0">Versandkosten &amp; Lieferzeiten</h2>
      </div>

      <Tabs defaultValue="de" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {shippingZones.map((z) => (
            <TabsTrigger key={z.id} value={z.id} className="flex items-center gap-1.5 text-xs sm:text-sm">
              {z.icon}
              {z.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {shippingZones.map((zone) => (
          <TabsContent key={zone.id} value={zone.id} className="space-y-4 pt-2">
            {zone.carriers.map((c) => (
              <Card key={c.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Versand durch {c.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6">
                    <span className="font-semibold text-primary">
                      Versandkostenfrei ab {c.freeFrom}
                    </span>
                    <span className="text-muted-foreground">
                      {c.cost} {c.costNote}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Lieferzeit: {c.delivery}
                  </div>
                  {c.note && (
                    <p className="text-xs text-muted-foreground">{c.note}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <p className="text-sm text-muted-foreground">
        Sofort lieferbare Artikel versenden wir in der Regel innerhalb von{" "}
        <strong>1–2 Werktagen</strong> nach Zahlungseingang. Sollte ein Artikel
        nicht sofort verfügbar sein, informieren wir Sie umgehend über die
        voraussichtliche Lieferzeit.
      </p>
    </section>

    <Separator className="my-8" />

    {/* ───── Zahlung ───── */}
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="!mt-0">Zahlungsmöglichkeiten</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Wir akzeptieren die folgenden Zahlungsarten. Die verfügbaren Methoden
        werden Ihnen im Checkout angezeigt und können je nach Bestellwert
        variieren.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {paymentMethods.map((pm) => (
          <Card key={pm.name}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">{pm.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{pm.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>

    <Separator className="my-8" />

    {/* ───── Sendungsverfolgung ───── */}
    <section className="space-y-3">
      <h2>Sendungsverfolgung</h2>
      <p>
        Nach dem Versand erhalten Sie eine E-Mail mit Ihrer{" "}
        <strong>Sendungsnummer</strong>, über die Sie den aktuellen Status Ihrer
        Lieferung jederzeit bei DHL oder GLS nachverfolgen können.
      </p>
    </section>

    {/* ───── Rücksendungen ───── */}
    <section className="space-y-3">
      <h2>Rücksendungen</h2>
      <p>
        Informationen zu Rücksendungen und Ihrem Widerrufsrecht finden Sie auf
        unserer Seite{" "}
        <a href="/widerrufsrecht" className="text-primary underline">
          Widerrufsrecht
        </a>
        .
      </p>
    </section>
  </LegalPageLayout>
);

export default Versand;
