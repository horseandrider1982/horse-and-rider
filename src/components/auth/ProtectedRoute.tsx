/**
 * Protected Route - requires Shopify Customer login
 * Admins (Supabase) bypass the Shopify auth requirement
 * so they can preview account pages without Shopify login.
 */

import { useEffect } from 'react';
import { useShopifyCustomer } from '@/lib/auth/ShopifyCustomerContext';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useShopifyCustomer();
  const { isAdmin, loading: adminLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !adminLoading && !isAuthenticated && !isAdmin) {
      login(window.location.pathname);
    }
  }, [isLoading, adminLoading, isAuthenticated, isAdmin, login]);

  if (isLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Allow access if Shopify-authenticated OR Supabase admin
  if (!isAuthenticated && !isAdmin) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
