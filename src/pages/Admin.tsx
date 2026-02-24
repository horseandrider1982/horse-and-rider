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
import { Loader2, BarChart3, Settings, Users, ArrowLeft, Package, Layers, Newspaper, Tag, ArrowRightLeft, FileText } from "lucide-react";
import ConfiguratorProducts from "@/pages/admin/ConfiguratorProducts";
import ConfiguratorGroups from "@/pages/admin/ConfiguratorGroups";
import NewsArticles from "@/pages/admin/NewsArticles";
import NewsEditor from "@/pages/admin/NewsEditor";
import BrandManager from "@/pages/admin/BrandManager";
import RedirectManager from "@/pages/admin/RedirectManager";
import CmsPages from "@/pages/admin/CmsPages";
import CmsPageEditor from "@/pages/admin/CmsPageEditor";
import CmsMenuEditor from "@/pages/admin/CmsMenuEditor";
import type { NewsArticle } from "@/hooks/useNewsArticles";
import type { CmsPage } from "@/hooks/useCmsPages";

export default function Admin() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);
  const [newsView, setNewsView] = useState<'list' | 'new' | 'edit'>('list');
  const [editArticleId, setEditArticleId] = useState<string>('');
  const [duplicateArticle, setDuplicateArticle] = useState<NewsArticle | null>(null);
  const [cmsView, setCmsView] = useState<'list' | 'new' | 'edit'>('list');
  const [editCmsPageId, setEditCmsPageId] = useState<string>('');
  const [duplicateCmsPage, setDuplicateCmsPage] = useState<CmsPage | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/account");
    }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) {
      supabase.from("profiles").select("id", { count: "exact", head: true }).then(({ count }) => {
        setUserCount(count || 0);
      });
    }
  }, [isAdmin]);

  if (authLoading) {
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
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4 hidden md:block" />Dashboard</TabsTrigger>
            <TabsTrigger value="cms" className="gap-2" onClick={() => setCmsView('list')}><FileText className="h-4 w-4 hidden md:block" />CMS</TabsTrigger>
            <TabsTrigger value="news" className="gap-2" onClick={() => setNewsView('list')}><Newspaper className="h-4 w-4 hidden md:block" />News</TabsTrigger>
            <TabsTrigger value="brands" className="gap-2"><Tag className="h-4 w-4 hidden md:block" />Marken</TabsTrigger>
            <TabsTrigger value="redirects" className="gap-2"><ArrowRightLeft className="h-4 w-4 hidden md:block" />301</TabsTrigger>
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

          <TabsContent value="cms">
            <Tabs defaultValue="cms-content" className="space-y-4">
              <TabsList>
                <TabsTrigger value="cms-content" className="gap-2"><FileText className="h-4 w-4 hidden md:block" />Content</TabsTrigger>
                <TabsTrigger value="cms-menus" className="gap-2"><Layers className="h-4 w-4 hidden md:block" />Menüs</TabsTrigger>
              </TabsList>

              <TabsContent value="cms-content">
                <Card>
                  <CardHeader>
                    <CardTitle>CMS-Seiten</CardTitle>
                    <CardDescription>Statische Seiten erstellen und verwalten.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cmsView === 'list' ? (
                      <CmsPages
                        onNew={() => { setDuplicateCmsPage(null); setCmsView('new'); }}
                        onEdit={(id) => { setEditCmsPageId(id); setCmsView('edit'); }}
                        onDuplicate={(page) => { setDuplicateCmsPage(page); setCmsView('new'); }}
                      />
                    ) : cmsView === 'edit' ? (
                      <CmsPageEditor pageId={editCmsPageId} onBack={() => setCmsView('list')} />
                    ) : (
                      <CmsPageEditor duplicateFrom={duplicateCmsPage} onBack={() => setCmsView('list')} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cms-menus">
                <Card>
                  <CardHeader>
                    <CardTitle>Menü-Verwaltung</CardTitle>
                    <CardDescription>Drag & Drop Menü-Editor für alle Navigationsbereiche.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CmsMenuEditor />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="news">
            <Card>
              <CardHeader>
                <CardTitle>News & Artikel</CardTitle>
                <CardDescription>Erstellen und verwalten Sie Ihre News-Beiträge.</CardDescription>
              </CardHeader>
              <CardContent>
                {newsView === 'list' ? (
                  <NewsArticles
                    onNew={() => { setDuplicateArticle(null); setNewsView('new'); }}
                    onEdit={(id) => { setEditArticleId(id); setNewsView('edit'); }}
                    onDuplicate={(article) => { setDuplicateArticle(article); setNewsView('new'); }}
                  />
                ) : newsView === 'edit' ? (
                  <NewsEditor articleId={editArticleId} onBack={() => setNewsView('list')} />
                ) : (
                  <NewsEditor duplicateFrom={duplicateArticle} onBack={() => setNewsView('list')} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="brands">
            <Card>
              <CardHeader>
                <CardTitle>Marken-Verwaltung</CardTitle>
                <CardDescription>Logos, SEO-Texte und Einstellungen für Marken pflegen.</CardDescription>
              </CardHeader>
              <CardContent>
                <BrandManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="redirects">
            <Card>
              <CardHeader>
                <CardTitle>301 Weiterleitungen</CardTitle>
                <CardDescription>Weiterleitungen vom alten auf den neuen Shop verwalten. CSV-Import per Artikelnummer möglich.</CardDescription>
              </CardHeader>
              <CardContent>
                <RedirectManager />
              </CardContent>
            </Card>
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
            <Tabs defaultValue="cfg-products" className="space-y-4">
              <TabsList>
                <TabsTrigger value="cfg-products" className="gap-2"><Package className="h-4 w-4 hidden md:block" />Artikel</TabsTrigger>
                <TabsTrigger value="cfg-groups" className="gap-2"><Layers className="h-4 w-4 hidden md:block" />Gruppen</TabsTrigger>
                <TabsTrigger value="cfg-settings" className="gap-2"><Settings className="h-4 w-4 hidden md:block" />Einstellungen</TabsTrigger>
              </TabsList>

              <TabsContent value="cfg-products">
                <Card>
                  <CardHeader>
                    <CardTitle>Konfigurator-Artikel</CardTitle>
                    <CardDescription>Shopify-Produkte als Konfigurator-Artikel verwalten.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ConfiguratorProducts />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cfg-groups">
                <Card>
                  <CardHeader>
                    <CardTitle>Konfigurations-Gruppen</CardTitle>
                    <CardDescription>Gruppen und Werte für den Konfigurator erstellen und bearbeiten.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ConfiguratorGroups />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cfg-settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Konfigurator-Einstellungen</CardTitle>
                    <CardDescription>Allgemeine Einstellungen für den Konfigurator.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Weitere Einstellungen werden hier verfügbar sein.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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
