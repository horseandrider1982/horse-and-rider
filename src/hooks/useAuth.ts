import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const adminCheckDone = useRef(false);

  useEffect(() => {
    let mounted = true;

    const checkAdminAndFinish = async (currentUser: User | null) => {
      if (currentUser) {
        try {
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id)
            .eq('role', 'admin')
            .maybeSingle();
          if (mounted) setIsAdmin(!!data);
        } catch {
          if (mounted) setIsAdmin(false);
        }
      } else {
        if (mounted) setIsAdmin(false);
      }
      adminCheckDone.current = true;
      if (mounted) setLoading(false);
    };

    // Set up listener first (no async work directly!)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Only re-check admin on sign-out or new sign-in after initial load
        if (adminCheckDone.current) {
          if (!session?.user) {
            setIsAdmin(false);
          } else {
            // Re-check admin for new login
            checkAdminAndFinish(session.user);
          }
        }
      }
    );

    // Get initial session and do admin check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        checkAdminAndFinish(session?.user ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, isAdmin, signOut };
}
