import { useEffect, useState } from "react";

const ENGRAVING_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Alegreya+SC:wght@400;700&display=swap";

function loadEngravingFonts() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[data-engraving-fonts]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = ENGRAVING_FONTS_HREF;
  link.setAttribute("data-engraving-fonts", "true");
  document.head.appendChild(link);
}
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PenTool } from "lucide-react";

const ENGRAVING_PRICE = 14.95;
const MAX_CHARS = 30;

const FONTS = [
  { id: "modern", label: "Modern", family: "'Lato', sans-serif" },
  { id: "script", label: "Schreibschrift", family: "'Dancing Script', cursive" },
  { id: "classic", label: "Klassisch", family: "'Alegreya SC', serif" },
] as const;

type FontId = typeof FONTS[number]["id"];

interface EngravingResult {
  text: string;
  font: FontId;
  fontLabel: string;
}

interface EngravingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSkip: () => void;
  onConfirm: (engraving: EngravingResult) => void;
  productTitle: string;
}

export function EngravingDialog({ open, onOpenChange, onSkip, onConfirm, productTitle }: EngravingDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [text, setText] = useState("");
  const [font, setFont] = useState<FontId>("modern");

  useEffect(() => {
    if (open) loadEngravingFonts();
  }, [open]);

  const selectedFont = FONTS.find(f => f.id === font)!;

  const handleSkip = () => {
    onSkip();
    resetAndClose();
  };

  const handleConfirm = () => {
    if (!text.trim()) return;
    onConfirm({ text: text.trim(), font, fontLabel: selectedFont.label });
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep(1);
    setText("");
    setFont("modern");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            Individuelle Gravur
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Für diesen Artikel ist eine individuelle Gravur möglich. Möchten Sie eine Gravur hinzufügen?
            </p>
            <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-between">
              <span className="font-medium">Gravur-Aufpreis</span>
              <span className="text-lg font-bold text-primary">{ENGRAVING_PRICE.toFixed(2).replace(".", ",")} €</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleSkip}>
                Nein, ohne Gravur
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => setStep(2)}>
                Ja, mit Gravur →
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Text input */}
            <div>
              <Label htmlFor="engraving-text">Gravurtext</Label>
              <div className="relative mt-1">
                <Input
                  id="engraving-text"
                  value={text}
                  onChange={e => { if (e.target.value.length <= MAX_CHARS) setText(e.target.value); }}
                  placeholder="Ihr Wunschtext…"
                  maxLength={MAX_CHARS}
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {text.length}/{MAX_CHARS}
                </span>
              </div>
            </div>

            {/* Font selection */}
            <div>
              <Label>Schriftart</Label>
              <div className="mt-2 space-y-2">
                {FONTS.map(f => (
                  <label
                    key={f.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      font === f.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="engraving-font"
                      value={f.id}
                      checked={font === f.id}
                      onChange={() => setFont(f.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm font-medium">{f.label}</span>
                    <span className="ml-auto text-sm text-muted-foreground" style={{ fontFamily: f.family }}>
                      {text || "Beispieltext"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-secondary/50 rounded-lg p-6 text-center min-h-[80px] flex items-center justify-center">
              {text ? (
                <span className="text-2xl break-all" style={{ fontFamily: selectedFont.family }}>
                  {text}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm italic">Vorschau Ihres Gravurtextes</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                ← Zurück
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleConfirm}
                disabled={!text.trim()}
              >
                In den Warenkorb ✓
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ENGRAVING_PRICE };
export type { EngravingResult };
