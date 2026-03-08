import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";

interface ProductContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTitle: string;
  productId: string;
}

export const ProductContactModal = ({ open, onOpenChange, productTitle, productId }: ProductContactModalProps) => {
  const subject = `Frage zum Produkt – ${productId} ${productTitle}`;
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !message.trim()) {
      toast.error("Bitte E-Mail und Nachricht ausfüllen.");
      return;
    }

    setSending(true);

    const body = `${message}\n\n---\nE-Mail: ${email}\nTelefon: ${phone || "–"}`;
    const mailtoUrl = `mailto:info@horse-and-rider.de?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");

    setSending(false);
    toast.success("E-Mail-Programm wird geöffnet");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Produktanfrage</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Betreff</Label>
            <Input value={subject} disabled className="bg-muted" />
          </div>
          <div>
            <Label>Ihre E-Mail-Adresse *</Label>
            <Input
              type="email"
              placeholder="ihre@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Ihre Telefonnummer</Label>
            <Input
              type="tel"
              placeholder="+49 ..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label>Ihre Nachricht *</Label>
            <Textarea
              placeholder="Ihre Frage zum Produkt..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Anfrage senden
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
