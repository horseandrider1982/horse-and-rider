import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, User, MapPin, CreditCard, Package, Truck, LogOut, Shield } from "lucide-react";

export default function Account() {
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; phone: string }>({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("first_name, last_name, phone")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile({ first_name: data.first_name || "", last_name: data.last_name || "", phone: data.phone || "" });
        });
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error("Fehler beim Speichern");
    else toast.success("Profil gespeichert");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Mein Konto</h1>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" asChild>
                <Link to="/admin"><Shield className="mr-2 h-4 w-4" />Admin</Link>
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />Abmelden
            </Button>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4 hidden md:block" />Profil</TabsTrigger>
            <TabsTrigger value="addresses" className="gap-2"><MapPin className="h-4 w-4 hidden md:block" />Adressen</TabsTrigger>
            <TabsTrigger value="payment" className="gap-2"><CreditCard className="h-4 w-4 hidden md:block" />Zahlung</TabsTrigger>
            <TabsTrigger value="orders" className="gap-2"><Package className="h-4 w-4 hidden md:block" />Bestellungen</TabsTrigger>
            <TabsTrigger value="tracking" className="gap-2"><Truck className="h-4 w-4 hidden md:block" />Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Persönliche Daten</CardTitle>
                <CardDescription>Verwalte deine persönlichen Informationen.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Vorname</Label>
                      <Input id="first_name" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Nachname</Label>
                      <Input id="last_name" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-Mail</Label>
                    <Input id="email" type="email" value={user.email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input id="phone" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Speichern
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addresses">
            <Card>
              <CardHeader>
                <CardTitle>Lieferadressen</CardTitle>
                <CardDescription>Verwalte deine Lieferadressen. Diese werden über den Shopify Checkout verwaltet.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Deine Lieferadressen werden beim Checkout automatisch gespeichert.</p>
                  <p className="text-sm mt-2">Du kannst sie beim nächsten Einkauf im Checkout bearbeiten.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Zahlungsmethoden</CardTitle>
                <CardDescription>Deine Zahlungsmethoden werden sicher über Shopify verwaltet.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Zahlungsmethoden werden beim Checkout verwaltet.</p>
                  <p className="text-sm mt-2">Shopify speichert deine Zahlungsdaten sicher für zukünftige Bestellungen.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Bestellungen</CardTitle>
                <CardDescription>Übersicht deiner bisherigen Bestellungen.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Noch keine Bestellungen vorhanden.</p>
                  <p className="text-sm mt-2">Sobald du eine Bestellung aufgibst, erscheint sie hier.</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link to="/">Jetzt einkaufen</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking">
            <Card>
              <CardHeader>
                <CardTitle>Sendungsverfolgung</CardTitle>
                <CardDescription>Verfolge den Status deiner Bestellungen.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keine aktiven Sendungen.</p>
                  <p className="text-sm mt-2">Tracking-Informationen erscheinen hier, sobald eine Bestellung versendet wird.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
