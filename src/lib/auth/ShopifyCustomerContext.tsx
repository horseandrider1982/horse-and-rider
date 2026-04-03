/**
 * Shopify Customer Session Context
 * 
 * Provides customer authentication state throughout the app.
 * Separate from the Supabase admin auth (useAuth hook).
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  isAuthenticated as checkAuth,
  fetchCustomerData,
  startLogin,
  logout as doLogout,
  getAuthenticatedCheckoutUrl,
  type ShopifyCustomerData,
} from './shopify-customer';

interface ShopifyCustomerContextValue {
  customer: ShopifyCustomerData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (returnTo?: string) => Promise<void>;
  logout: () => void;
  refreshCustomer: () => Promise<void>;
  getCheckoutUrl: (url: string) => string;
}

const ShopifyCustomerContext = createContext<ShopifyCustomerContextValue | null>(null);

export function ShopifyCustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<ShopifyCustomerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const loadCustomer = useCallback(async () => {
    if (!checkAuth()) {
      setCustomer(null);
      setAuthenticated(false);
      setIsLoading(false);
      return;
    }

    setAuthenticated(true);
    try {
      const data = await fetchCustomerData();
      setCustomer(data);
    } catch {
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const login = useCallback(async (returnTo?: string) => {
    await startLogin(returnTo || window.location.pathname);
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setCustomer(null);
    setAuthenticated(false);
  }, []);

  const refreshCustomer = useCallback(async () => {
    await loadCustomer();
  }, [loadCustomer]);

  const getCheckoutUrl = useCallback((url: string) => {
    return getAuthenticatedCheckoutUrl(url);
  }, []);

  return (
    <ShopifyCustomerContext.Provider
      value={{
        customer,
        isAuthenticated: authenticated,
        isLoading,
        login,
        logout,
        refreshCustomer,
        getCheckoutUrl,
      }}
    >
      {children}
    </ShopifyCustomerContext.Provider>
  );
}

export function useShopifyCustomer(): ShopifyCustomerContextValue {
  const ctx = useContext(ShopifyCustomerContext);
  if (!ctx) {
    // Return safe defaults when used outside provider (e.g. admin routes)
    return {
      customer: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => {},
      logout: () => {},
      refreshCustomer: async () => {},
      getCheckoutUrl: (url: string) => url,
    };
  }
  return ctx;
}
