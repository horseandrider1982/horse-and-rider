import { LegalPageLayout } from "@/components/LegalPageLayout";

const Versand = () => (
  <LegalPageLayout>
    <h1>Versand & Zahlung</h1>

    <h2>Versandkosten</h2>
    <p>
      Wir liefern innerhalb Deutschlands mit <strong>DHL</strong> und <strong>GLS</strong>. Die Versandkosten
      richten sich nach dem Gewicht und der Größe Ihrer Bestellung:
    </p>
    <ul>
      <li><strong>Standardversand:</strong> 4,95 € (Lieferzeit 2–4 Werktage)</li>
      <li><strong>Ab 50,00 € Bestellwert:</strong> Kostenloser Versand</li>
      <li><strong>Sperrgut</strong> (z.&nbsp;B. Sättel, Hindernismaterial): Versandkosten nach Gewicht, werden im Checkout angezeigt</li>
    </ul>
    <p>
      Für Lieferungen ins <strong>EU-Ausland</strong> berechnen wir die Versandkosten individuell.
      Bitte kontaktieren Sie uns vor der Bestellung.
    </p>

    <h2>Lieferzeiten</h2>
    <p>
      Sofort lieferbare Artikel versenden wir in der Regel innerhalb von <strong>1–2 Werktagen</strong> nach
      Zahlungseingang. Die Zustellung erfolgt üblicherweise innerhalb von <strong>2–4 Werktagen</strong> nach Versand.
    </p>
    <p>
      Sollte ein Artikel nicht sofort verfügbar sein, informieren wir Sie umgehend über die voraussichtliche Lieferzeit.
    </p>

    <h2>Zahlungsmethoden</h2>
    <p>Wir bieten Ihnen folgende Zahlungsmöglichkeiten:</p>
    <ul>
      <li><strong>Kreditkarte</strong> (Visa, Mastercard, American Express)</li>
      <li><strong>PayPal</strong></li>
      <li><strong>Apple Pay / Google Pay / Shop Pay</strong></li>
      <li><strong>Klarna</strong> (Rechnung, Ratenkauf)</li>
      <li><strong>Vorkasse / Banküberweisung</strong></li>
    </ul>
    <p>
      Die verfügbaren Zahlungsmethoden werden Ihnen im Checkout angezeigt und können je nach Bestellwert variieren.
    </p>

    <h2>Sendungsverfolgung</h2>
    <p>
      Nach dem Versand erhalten Sie eine E-Mail mit Ihrer <strong>Sendungsnummer</strong>, über die Sie den
      aktuellen Status Ihrer Lieferung jederzeit bei DHL oder GLS nachverfolgen können.
    </p>

    <h2>Rücksendungen</h2>
    <p>
      Informationen zu Rücksendungen und Ihrem Widerrufsrecht finden Sie auf unserer
      Seite <a href="/widerrufsrecht">Widerrufsrecht</a>.
    </p>
  </LegalPageLayout>
);

export default Versand;
