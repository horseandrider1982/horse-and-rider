import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShopifyProductPicker } from "@/components/admin/ShopifyProductPicker";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const SETTINGS_KEY = "homepage_product_handles";

export default function HomepageProducts() {
  const [handles, setHandles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try {
            setHandles(JSON.parse(data.value));
          } catch {}
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const value = JSON.stringify(handles);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: SETTINGS_KEY, value }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast.error("Fehler beim Speichern");
    } else {
      toast.success("Startseiten-Produkte gespeichert");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Wählen Sie bis zu 4 Produkte aus, die auf der Startseite angezeigt werden.
      </p>

      <ShopifyProductPicker
        selectedHandles={handles}
        onChange={(h) => setHandles(h.slice(0, 4))}
      />

      {handles.length > 0 && (
        <p className="text-xs text-muted-foreground">{handles.length}/4 Produkte ausgewählt</p>
      )}

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Speichern
      </Button>
    </div>
  );
}
