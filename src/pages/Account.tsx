import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/i18n";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { Loader2, User, MapPin, CreditCard, Package, Truck, LogOut, Shield } from "lucide-react";

export default function Account() {
  const { t, localePath } = useI18n();
  const { user, loading: authLoading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; phone: string }>({ first_name: "", last_name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate(localePath("/auth"));
  }, [user, authLoading, navigate, localePath]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("first_name, last_name, phone").eq("id", user.id).single().then(({ data }) => {
        if (data) setProfile({ first_name: data.first_name || "", last_name: data.last_name || "", phone: data.phone || "" });
      });
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ first_name: profile.first_name, last_name: profile.last_name, phone: profile.phone, updated_at: new Date().toISOString() }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(t("account.save_error"));
    else toast.success(t("account.save_success"));
  };

  const handleLogout = async () => {
    await signOut();
    navigate(localePath("/"));
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar /><Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-heading font-bold">{t("account.title")}</h1>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" asChild>
                <LocaleLink to="/admin"><Shield className="mr-2 h-4 w-4" />{t("account.admin")}</LocaleLink>
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />{t("header.logout")}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4 hidden md:block" />{t("account.profile")}</TabsTrigger>
            <TabsTrigger value="addresses" className="gap-2"><MapPin className="h-4 w-4 hidden md:block" />{t("account.addresses")}</TabsTrigger>
            <TabsTrigger value="payment" className="gap-2"><CreditCard className="h-4 w-4 hidden md:block" />{t("account.payment")}</TabsTrigger>
            <TabsTrigger value="orders" className="gap-2"><Package className="h-4 w-4 hidden md:block" />{t("account.orders")}</TabsTrigger>
            <TabsTrigger value="tracking" className="gap-2"><Truck className="h-4 w-4 hidden md:block" />{t("account.tracking")}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader><CardTitle>{t("account.personal_data")}</CardTitle><CardDescription>{t("account.personal_data_desc")}</CardDescription></CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="first_name">{t("auth.first_name")}</Label><Input id="first_name" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} /></div>
                    <div className="space-y-2"><Label htmlFor="last_name">{t("auth.last_name")}</Label><Input id="last_name" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="email">{t("auth.email")}</Label><Input id="email" type="email" value={user.email || ""} disabled /></div>
                  <div className="space-y-2"><Label htmlFor="phone">{t("account.phone")}</Label><Input id="phone" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
                  <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("account.save")}</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addresses">
            <Card><CardHeader><CardTitle>{t("account.addresses_title")}</CardTitle><CardDescription>{t("account.addresses_desc")}</CardDescription></CardHeader>
              <CardContent><div className="text-center py-8 text-muted-foreground"><MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("account.addresses_info")}</p><p className="text-sm mt-2">{t("account.addresses_edit")}</p></div></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card><CardHeader><CardTitle>{t("account.payment_title")}</CardTitle><CardDescription>{t("account.payment_desc")}</CardDescription></CardHeader>
              <CardContent><div className="text-center py-8 text-muted-foreground"><CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("account.payment_info")}</p><p className="text-sm mt-2">{t("account.payment_detail")}</p></div></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card><CardHeader><CardTitle>{t("account.orders_title")}</CardTitle><CardDescription>{t("account.orders_desc")}</CardDescription></CardHeader>
              <CardContent><div className="text-center py-8 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("account.no_orders")}</p><p className="text-sm mt-2">{t("account.no_orders_hint")}</p>
                <Button variant="outline" className="mt-4" asChild><LocaleLink to="/">{t("account.shop_now")}</LocaleLink></Button>
              </div></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tracking">
            <Card><CardHeader><CardTitle>{t("account.tracking_title")}</CardTitle><CardDescription>{t("account.tracking_desc")}</CardDescription></CardHeader>
              <CardContent><div className="text-center py-8 text-muted-foreground"><Truck className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>{t("account.no_tracking")}</p><p className="text-sm mt-2">{t("account.no_tracking_hint")}</p></div></CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
