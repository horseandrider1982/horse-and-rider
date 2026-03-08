import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart3, Settings, Users, ArrowLeft, Package, Layers, Newspaper, Tag, ArrowRightLeft, FileText, Calendar } from "lucide-react";
import ConfiguratorProducts from "@/pages/admin/ConfiguratorProducts";
import ConfiguratorGroups from "@/pages/admin/ConfiguratorGroups";
import NewsArticles from "@/pages/admin/NewsArticles";
import NewsEditor from "@/pages/admin/NewsEditor";
import BrandManager from "@/pages/admin/BrandManager";
import RedirectManager from "@/pages/admin/RedirectManager";
import CmsPages from "@/pages/admin/CmsPages";
import CmsPageEditor from "@/pages/admin/CmsPageEditor";
import CmsMenuEditor from "@/pages/admin/CmsMenuEditor";
import CalendlySettings from "@/pages/admin/CalendlySettings";
import type { NewsArticle } from "@/hooks/useNewsArticles";
import type { CmsPage } from "@/hooks/useCmsPages";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "cms", label: "CMS", icon: FileText },
  { key: "news", label: "News", icon: Newspaper },
  { key: "brands", label: "Marken", icon: Tag },
  { key: "redirects", label: "301", icon: ArrowRightLeft },
  { key: "users", label: "Kunden", icon: Users },
  { key: "configurator", label: "Konfigurator", icon: Settings },
  { key: "calendly", label: "Calendly", icon: Calendar },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

export default function Admin() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<NavKey>("dashboard");
  const [userCount, setUserCount] = useState(0);
  const [newsView, setNewsView] = useState<'list' | 'new' | 'edit'>('list');
  const [editArticleId, setEditArticleId] = useState<string>('');
  const [duplicateArticle, setDuplicateArticle] = useState<NewsArticle | null>(null);
  const [cmsView, setCmsView] = useState<'list' | 'new' | 'edit'>('list');
  const [editCmsPageId, setEditCmsPageId] = useState<string>('');
  const [duplicateCmsPage, setDuplicateCmsPage] = useState<CmsPage | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const handleNavClick = (key: NavKey) => {
    setActiveSection(key);
    if (key === "news") setNewsView("list");
    if (key === "cms") setCmsView("list");
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`${sidebarCollapsed ? "w-16" : "w-56"} bg-card border-r border-border flex flex-col shrink-0 transition-all duration-200`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!sidebarCollapsed && (
            <h2 className="font-heading font-bold text-lg text-foreground">Admin</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <Button variant="outline" size="sm" asChild className={`w-full ${sidebarCollapsed ? "px-0" : ""}`}>
            <Link to="/account">
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span className="ml-2">Mein Konto</span>}
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="p-6">
          {activeSection === "dashboard" && <DashboardSection userCount={userCount} />}
          {activeSection === "cms" && (
            <CmsSection
              cmsView={cmsView}
              setCmsView={setCmsView}
              editCmsPageId={editCmsPageId}
              setEditCmsPageId={setEditCmsPageId}
              duplicateCmsPage={duplicateCmsPage}
              setDuplicateCmsPage={setDuplicateCmsPage}
            />
          )}
          {activeSection === "news" && (
            <NewsSection
              newsView={newsView}
              setNewsView={setNewsView}
              editArticleId={editArticleId}
              setEditArticleId={setEditArticleId}
              duplicateArticle={duplicateArticle}
              setDuplicateArticle={setDuplicateArticle}
            />
          )}
          {activeSection === "brands" && <BrandsSection />}
          {activeSection === "redirects" && <RedirectsSection />}
          {activeSection === "users" && <UsersSection />}
          {activeSection === "configurator" && <ConfiguratorSection />}
        </div>
      </main>
    </div>
  );
}

/* ─── Section Components ─── */

function DashboardSection({ userCount }: { userCount: number }) {
  return (
    <>
      <h1 className="text-2xl font-heading font-bold mb-6">Dashboard</h1>
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
    </>
  );
}

function CmsSection({
  cmsView, setCmsView, editCmsPageId, setEditCmsPageId, duplicateCmsPage, setDuplicateCmsPage,
}: {
  cmsView: string; setCmsView: (v: 'list' | 'new' | 'edit') => void;
  editCmsPageId: string; setEditCmsPageId: (id: string) => void;
  duplicateCmsPage: CmsPage | null; setDuplicateCmsPage: (p: CmsPage | null) => void;
}) {
  return (
    <>
      <h1 className="text-2xl font-heading font-bold mb-6">CMS</h1>
      <Tabs defaultValue="cms-content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cms-content" className="gap-2">
            <FileText className="h-4 w-4 hidden md:block" />Content
          </TabsTrigger>
          <TabsTrigger value="cms-menus" className="gap-2">
            <Layers className="h-4 w-4 hidden md:block" />Menüs
          </TabsTrigger>
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
    </>
  );
}

function NewsSection({
  newsView, setNewsView, editArticleId, setEditArticleId, duplicateArticle, setDuplicateArticle,
}: {
  newsView: string; setNewsView: (v: 'list' | 'new' | 'edit') => void;
  editArticleId: string; setEditArticleId: (id: string) => void;
  duplicateArticle: NewsArticle | null; setDuplicateArticle: (a: NewsArticle | null) => void;
}) {
  return (
    <>
      <h1 className="text-2xl font-heading font-bold mb-6">News & Artikel</h1>
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
    </>
  );
}

function BrandsSection() {
  return (
    <>
      <h1 className="text-2xl font-heading font-bold mb-6">Marken-Verwaltung</h1>
      <Card>
        <CardHeader>
          <CardTitle>Marken-Verwaltung</CardTitle>
          <CardDescription>Logos, SEO-Texte und Einstellungen für Marken pflegen.</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandManager />
        </CardContent>
      </Card>
    </>
  );
}

function RedirectsSection() {
  return (
    <>
      <h1 className="text-2xl font-heading font-bold mb-6">301 Weiterleitungen</h1>
      <Card>
        <CardHeader>
          <CardTitle>301 Weiterleitungen</CardTitle>
          <CardDescription>Weiterleitungen vom alten auf den neuen Shop verwalten. CSV-Import per Artikelnummer möglich.</CardDescription>
        </CardHeader>
        <CardContent>
          <RedirectManager />
        </CardContent>
      </Card>
    </>
  );
}

function UsersSection() {
  return (
    <>
      <h1 className="text-2xl font-heading font-bold mb-6">Kunden-Übersicht</h1>
      <Card>
        <CardHeader>
          <CardTitle>Kunden-Übersicht</CardTitle>
          <CardDescription>Liste der registrierten Kunden.</CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerList />
        </CardContent>
      </Card>
    </>
  );
}

function ConfiguratorSection() {
  return (
    <>
      <h1 className="text-2xl font-heading font-bold mb-6">Konfigurator</h1>
      <Tabs defaultValue="cfg-products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cfg-products" className="gap-2">
            <Package className="h-4 w-4 hidden md:block" />Artikel
          </TabsTrigger>
          <TabsTrigger value="cfg-groups" className="gap-2">
            <Layers className="h-4 w-4 hidden md:block" />Gruppen
          </TabsTrigger>
          <TabsTrigger value="cfg-settings" className="gap-2">
            <Settings className="h-4 w-4 hidden md:block" />Einstellungen
          </TabsTrigger>
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
    </>
  );
}

/* ─── Customer List ─── */

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
