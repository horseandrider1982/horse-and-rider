import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBookingUrl, useUpdateBookingUrl } from "@/hooks/useCalendlyUrl";
import { toast } from "sonner";
import { Loader2, ExternalLink, Calendar } from "lucide-react";

export default function CalendlySettings() {
  const { data: bookingUrl, isLoading } = useBookingUrl();
  const updateMutation = useUpdateBookingUrl();
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (bookingUrl !== undefined) setUrl(bookingUrl);
  }, [bookingUrl]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(url.trim());
      toast.success("Buchungs-URL gespeichert");
    } catch {
      toast.error("Fehler beim Speichern");
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Online Beratung</h2>
        <p className="text-muted-foreground">Brevo Meeting Terminbuchung konfigurieren</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Buchungsseite Einbettung
          </CardTitle>
          <CardDescription>
            Geben Sie Ihre Brevo Meeting-URL ein, die auf der Produktdetailseite und anderen Stellen als Online-Beratung eingebettet wird.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Brevo Meeting URL</label>
            <Input
              placeholder="https://meet.brevo.com/ihr-name"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Die URL finden Sie in Ihrem Brevo-Konto unter „Meetings". Verwenden Sie die vollständige URL.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Speichern
            </Button>
            {url && (
              <Button variant="outline" size="sm" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Vorschau
                </a>
              </Button>
            )}
          </div>

          {url && (
            <div className="mt-6 border rounded-lg overflow-hidden">
              <p className="text-xs text-muted-foreground p-2 bg-muted">Vorschau der Einbettung:</p>
              <iframe
                src={url}
                width="100%"
                height="400"
                frameBorder="0"
                title="Brevo Meeting Vorschau"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
