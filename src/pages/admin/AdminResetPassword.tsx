import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

export default function AdminResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    setIsRecovery(window.location.hash.includes("type=recovery"));
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      toast.error("Passwort konnte nicht gesetzt werden", { description: error.message });
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    toast.success("Passwort erfolgreich gesetzt");
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="font-heading">Admin-Passwort zurücksetzen</CardTitle>
          <CardDescription>
            {isRecovery
              ? "Legen Sie jetzt ein neues Passwort für den Admin-Zugang fest."
              : "Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Reset-Link an."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRecovery ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Neues Passwort</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Passwort bestätigen</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Passwort speichern
              </Button>
            </form>
          ) : (
            <Button type="button" className="w-full" onClick={() => navigate("/admin/login", { replace: true })}>
              Zurück zum Admin-Login
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
