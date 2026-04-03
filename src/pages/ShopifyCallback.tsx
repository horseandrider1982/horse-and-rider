/**
 * Shopify OAuth Callback Page
 * Handles the redirect from Shopify Customer Account login
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleCallback, getAndClearReturnTo } from '@/lib/auth/shopify-customer';
import { useShopifyCustomer } from '@/lib/auth/ShopifyCustomerContext';
import { toast } from 'sonner';
import { useI18n } from '@/i18n';

function ShopifyCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCustomer } = useShopifyCustomer();
  const { localePath } = useI18n();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function processCallback() {
      const result = await handleCallback(searchParams);

      if (cancelled) return;

      if (result.success) {
        await refreshCustomer();
        toast.success('Erfolgreich angemeldet!');
        const returnTo = getAndClearReturnTo();
        navigate(returnTo || localePath('/account'), { replace: true });
      } else {
        setError(result.error || 'Login fehlgeschlagen');
        toast.error(result.error || 'Login fehlgeschlagen');
        // Redirect to home after a delay
        setTimeout(() => {
          if (!cancelled) navigate(localePath('/'), { replace: true });
        }, 3000);
      }
    }

    processCallback();
    return () => { cancelled = true; };
  }, [searchParams, navigate, refreshCustomer, localePath]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg">{error}</p>
          <p className="text-muted-foreground">Du wirst weitergeleitet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-muted-foreground">Anmeldung wird verarbeitet...</p>
      </div>
    </div>
  );
}

export default ShopifyCallback;
