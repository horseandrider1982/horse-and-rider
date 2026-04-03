/**
 * Protected Route - requires Shopify Customer login
 * Redirects unauthenticated users to Shopify login
 */

import { useEffect } from 'react';
import { useShopifyCustomer } from '@/lib/auth/ShopifyCustomerContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, login } = useShopifyCustomer();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login(window.location.pathname);
    }
  }, [isLoading, isAuthenticated, login]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
