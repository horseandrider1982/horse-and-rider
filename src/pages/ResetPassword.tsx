import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useI18n } from "@/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const { t, localePath } = useI18n();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  usePageMeta({
    title: "Passwort zurücksetzen",
    description: "Setzen Sie Ihr Passwort für Ihr Horse & Rider Kundenkonto zurück.",
    noIndex: true,
  });

  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setIsRecovery(true);
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(t("auth.error"), { description: error.message });
    } else {
      toast.success(t("auth.password_changed"));
      navigate(localePath("/account"));
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex flex-col"><TopBar /><Header />
        <main className="flex-1 flex items-center justify-center py-12 px-4"><p className="text-muted-foreground">{t("auth.invalid_link")}</p></main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col"><TopBar /><Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle className="font-heading">{t("auth.new_password")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="new-password">{t("auth.new_password_label")}</Label><Input id="new-password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("auth.change_password")}</Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
