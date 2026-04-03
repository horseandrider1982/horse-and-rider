/**
 * Shopify Customer Login Page
 * Redirects to Shopify hosted login
 */

import { useEffect } from 'react';
import { useShopifyCustomer } from '@/lib/auth/ShopifyCustomerContext';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '@/i18n';

function ShopifyLogin() {
  const { isAuthenticated, isLoading, login } = useShopifyCustomer();
  const [searchParams] = useSearchParams();
  const { localePath } = useI18n();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnTo = searchParams.get('returnTo') || localePath('/account');
      login(returnTo);
    }
  }, [isLoading, isAuthenticated, login, searchParams, localePath]);

  // If already authenticated, could redirect to account
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Du bist bereits angemeldet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Weiterleitung zum Login...</p>
      </div>
    </div>
  );
}

export default ShopifyLogin;
