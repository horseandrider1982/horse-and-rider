import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const adminResetRedirectUrl =
    window.location.hostname.includes("--") && window.location.hostname.endsWith(".lovable.app")
      ? "https://horse-and-rider.lovable.app/admin/reset-password"
      : `${window.location.origin}/admin/reset-password`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Anmeldung fehlgeschlagen", { description: error.message });
    } else {
      toast.success("Erfolgreich angemeldet");
      navigate("/admin");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: adminResetRedirectUrl,
    });
    setLoading(false);
    if (error) {
      toast.error("Fehler", { description: error.message });
    } else {
      toast.success("E-Mail gesendet", { description: "Prüfen Sie Ihren Posteingang." });
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="font-heading">Passwort zurücksetzen</CardTitle>
            <CardDescription>Geben Sie Ihre E-Mail-Adresse ein.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">E-Mail</Label>
                <Input id="forgot-email" type="email" required value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Link senden
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => setShowForgot(false)}>
                Zurück zum Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="font-heading">Admin-Bereich</CardTitle>
          <CardDescription>Nur für autorisierte Mitarbeiter.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">E-Mail</Label>
              <Input id="login-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Passwort</Label>
              <Input id="login-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Anmelden
            </Button>
            <Button type="button" variant="link" className="w-full text-sm" onClick={() => setShowForgot(true)}>
              Passwort vergessen?
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
