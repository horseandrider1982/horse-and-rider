import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async (userId: string) => {
      try {
        console.log('[useAuth] checkAdmin start for', userId);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        console.log('[useAuth] checkAdmin result:', data, 'error:', error);
        setIsAdmin(!!data);
      } catch (e) {
        console.error('[useAuth] checkAdmin exception:', e);
        setIsAdmin(false);
      }
    };

    // Set up listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('[useAuth] onAuthStateChange event:', _event, 'user:', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await checkAdmin(session.user.id);
        } else {
          setIsAdmin(false);
        }
        console.log('[useAuth] setting loading=false (from listener)');
        setLoading(false);
      }
    );

    // Then get initial session
    console.log('[useAuth] calling getSession...');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[useAuth] getSession result, user:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkAdmin(session.user.id);
      }
      console.log('[useAuth] setting loading=false (from getSession)');
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, isAdmin, signOut };
}
