import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname ist erforderlich").max(50),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich").max(50),
  email: z.string().trim().email("Bitte gültige E-Mail-Adresse eingeben").max(255),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().min(1, "Betreff ist erforderlich").max(150),
  message: z.string().trim().min(1, "Nachricht ist erforderlich").max(5000),
});

type ContactForm = z.infer<typeof contactSchema>;

const Kontakt = () => {
  const [form, setForm] = useState<ContactForm>({
    firstName: "", lastName: "", email: "", phone: "", subject: "", message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (field: keyof ContactForm, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.errors.forEach((err) => {
        const key = err.path[0] as keyof ContactForm;
        fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSending(true);
    try {
      const mailtoLink = `mailto:store@horse-and-rider.de?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(
        `Vorname: ${form.firstName}\nNachname: ${form.lastName}\nE-Mail: ${form.email}\nTelefon: ${form.phone || "–"}\n\n${form.message}`
      )}`;
      window.location.href = mailtoLink;
      setSent(true);
      toast.success("Ihr E-Mail-Programm wurde geöffnet.");
    } catch {
      toast.error("Fehler beim Öffnen des E-Mail-Programms.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-muted/40 py-12 md:py-16">
          <div className="container mx-auto px-4 text-center">
            <Breadcrumbs items={[
              { label: "Home", to: "/" },
              { label: "Kontakt" },
            ]} className="mb-4 justify-center" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Kontakt</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Wir freuen uns auf Ihre Nachricht! Besuchen Sie uns vor Ort oder schreiben Sie uns.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 md:py-14">
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Form – 3 cols */}
            <div className="lg:col-span-3">
              <Card className="shadow-md">
                <CardContent className="p-6 md:p-8">
                  {sent ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                      <CheckCircle className="h-14 w-14 text-primary" />
                      <h2 className="text-xl font-semibold text-foreground">Vielen Dank!</h2>
                      <p className="text-muted-foreground max-w-md">
                        Ihr E-Mail-Programm wurde geöffnet. Bitte senden Sie die vorbereitete Nachricht ab.
                      </p>
                      <Button variant="outline" onClick={() => { setSent(false); setForm({ firstName: "", lastName: "", email: "", phone: "", subject: "", message: "" }); }}>
                        Neue Nachricht
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="firstName">Vorname *</Label>
                          <Input id="firstName" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className={errors.firstName ? "border-destructive" : ""} />
                          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lastName">Nachname *</Label>
                          <Input id="lastName" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className={errors.lastName ? "border-destructive" : ""} />
                          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="email">E-Mail *</Label>
                          <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={errors.email ? "border-destructive" : ""} />
                          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="phone">Telefon</Label>
                          <Input id="phone" type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="subject">Betreff *</Label>
                        <Input id="subject" value={form.subject} onChange={(e) => update("subject", e.target.value)} className={errors.subject ? "border-destructive" : ""} />
                        {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="message">Nachricht *</Label>
                        <Textarea id="message" rows={5} value={form.message} onChange={(e) => update("message", e.target.value)} className={errors.message ? "border-destructive" : ""} />
                        {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
                      </div>
                      <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                        <Send className="h-4 w-4 mr-2" />
                        Nachricht senden
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar – 2 cols */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact info */}
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h3 className="font-semibold text-lg text-foreground">Kontaktdaten</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Adresse</p>
                        <p className="text-muted-foreground">Horse & Rider Reitsportfachhandels GmbH<br />Alte Dorfstraße 8<br />21376 Salzhausen OT Luhmühlen</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Telefon</p>
                        <a href="tel:+4941726403" className="text-muted-foreground hover:text-primary transition-colors">04172 – 6403</a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">E-Mail</p>
                        <a href="mailto:store@horse-and-rider.de" className="text-muted-foreground hover:text-primary transition-colors">store@horse-and-rider.de</a>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">Öffnungszeiten</p>
                        <p className="text-muted-foreground">Mo – Fr: 10:00 – 18:30 Uhr<br />Sa: 09:00 – 14:00 Uhr</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map */}
              <Card className="overflow-hidden">
                <iframe
                  title="Standort Horse & Rider Luhmühlen"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=10.07%2C53.24%2C10.12%2C53.27&layer=mapnik&marker=53.2535%2C10.0950"
                  className="w-full h-64 md:h-72 border-0"
                  loading="lazy"
                  allowFullScreen
                />
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Kontakt;
