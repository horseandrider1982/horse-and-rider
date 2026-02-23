import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart3, Settings, Users, ArrowLeft } from "lucide-react";

export default function Admin() {
  const { user, loading: authLoading, adminLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !adminLoading && (!user || !isAdmin)) {
      navigate("/account");
    }
  }, [user, authLoading, adminLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      supabase.from("profiles").select("id", { count: "exact", head: true }).then(({ count }) => {
        setUserCount(count || 0);
      });
    }
  }, [isAdmin]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Admin-Bereich</h1>
          <Button variant="outline" asChild>
            <Link to="/account"><ArrowLeft className="mr-2 h-4 w-4" />Mein Konto</Link>
          </Button>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4 hidden md:block" />Dashboard</TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4 hidden md:block" />Kunden</TabsTrigger>
            <TabsTrigger value="configurator" className="gap-2"><Settings className="h-4 w-4 hidden md:block" />Konfigurator</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Registrierte Kunden</CardDescription>
                  <CardTitle className="text-3xl">{userCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Bestellungen (Shopify)</CardDescription>
                  <CardTitle className="text-3xl">—</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Bestelldaten kommen direkt aus Shopify.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Umsatz (Shopify)</CardDescription>
                  <CardTitle className="text-3xl">—</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Umsatzdaten kommen direkt aus Shopify.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Kunden-Übersicht</CardTitle>
                <CardDescription>Liste der registrierten Kunden.</CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configurator">
            <Card>
              <CardHeader>
                <CardTitle>Konfigurator-Administration</CardTitle>
                <CardDescription>Verwalte den Produktkonfigurator.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Der Konfigurator-Bereich wird hier eingerichtet.</p>
                  <p className="text-sm mt-2">Teile mir mit, welche Konfigurationsoptionen du benötigst.</p>
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

function CustomerList() {
  const [customers, setCustomers] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, first_name, last_name, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setCustomers(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (customers.length === 0) return <p className="text-center py-8 text-muted-foreground">Noch keine Kunden registriert.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium">Name</th>
            <th className="text-left py-3 px-2 font-medium">Registriert am</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(c => (
            <tr key={c.id} className="border-b">
              <td className="py-3 px-2">{c.first_name || ""} {c.last_name || ""}</td>
              <td className="py-3 px-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("de-DE")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
