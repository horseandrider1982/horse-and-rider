import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if the current path matches a stored 301 redirect and navigates accordingly.
 * Placed inside BrowserRouter in App.tsx.
 */
export function RedirectGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    const path = location.pathname;
    // Don't re-check paths we already checked this session
    if (checked.has(path)) return;

    const check = async () => {
      const { data } = await supabase
        .from("redirects")
        .select("new_url")
        .eq("old_url", path)
        .eq("is_active", true)
        .maybeSingle();

      setChecked(prev => new Set(prev).add(path));

      if (data?.new_url && data.new_url !== path) {
        navigate(data.new_url, { replace: true });
      }
    };
    check();
  }, [location.pathname]); // eslint-disable-line

  return null;
}
