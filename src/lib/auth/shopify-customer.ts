/**
 * Shopify Customer Account API - OAuth 2.0 with PKCE
 * 
 * Architecture:
 * - Uses Shopify's hosted login (no custom password forms)
 * - PKCE flow for public clients (SPA)
 * - Tokens stored in sessionStorage (cleared on tab close)
 * - Separate from Supabase admin auth
 */

import { generateCodeVerifier, generateCodeChallenge, generateState, generateNonce } from './pkce';

// Shopify Customer Account API configuration
const SHOPIFY_CUSTOMER_CLIENT_ID = '6c0f10ad-d50b-4745-bd0b-70329879cfea';
const SHOPIFY_SHOP_ID = '324083278';
const SHOPIFY_AUTH_BASE = `https://shopify.com/${SHOPIFY_SHOP_ID}/auth/oauth`;
const SHOPIFY_CUSTOMER_API = `https://shopify.com/${SHOPIFY_SHOP_ID}/account/customer/api/2025-01/graphql`;
const REDIRECT_URI = `${window.location.origin}/de/auth/callback`;

// Storage keys
const STORAGE_KEYS = {
  codeVerifier: 'shopify_pkce_verifier',
  state: 'shopify_auth_state',
  nonce: 'shopify_auth_nonce',
  accessToken: 'shopify_access_token',
  refreshToken: 'shopify_refresh_token',
  expiresAt: 'shopify_token_expires_at',
  idToken: 'shopify_id_token',
  returnTo: 'shopify_return_to',
} as const;

export interface ShopifyCustomerData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

export interface ShopifyCustomerOrder {
  id: string;
  name: string;
  processedAt: string;
  financialStatus: string;
  fulfillmentStatus: string;
  totalPrice: { amount: string; currencyCode: string };
}

/**
 * Start the Shopify Customer Account login flow
 */
export async function startLogin(returnTo?: string): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();
  const nonce = generateNonce();

  // Store PKCE values for the callback
  sessionStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);
  sessionStorage.setItem(STORAGE_KEYS.state, state);
  sessionStorage.setItem(STORAGE_KEYS.nonce, nonce);
  
  if (returnTo) {
    sessionStorage.setItem(STORAGE_KEYS.returnTo, returnTo);
  }

  const params = new URLSearchParams({
    client_id: SHOPIFY_CUSTOMER_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: 'openid email customer-account-api:full',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${SHOPIFY_AUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Handle the OAuth callback - exchange authorization code for tokens
 */
export async function handleCallback(searchParams: URLSearchParams): Promise<{ success: boolean; error?: string }> {
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    return { success: false, error: errorDescription || error };
  }

  if (!code || !state) {
    return { success: false, error: 'Fehlende Parameter im Callback' };
  }

  // Validate state
  const storedState = sessionStorage.getItem(STORAGE_KEYS.state);
  if (state !== storedState) {
    return { success: false, error: 'Ungültiger State-Parameter (CSRF-Schutz)' };
  }

  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier);
  if (!codeVerifier) {
    return { success: false, error: 'Code Verifier nicht gefunden' };
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(`${SHOPIFY_AUTH_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: SHOPIFY_CUSTOMER_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('Token exchange failed:', errBody);
      return { success: false, error: 'Token-Austausch fehlgeschlagen' };
    }

    const tokens = await tokenResponse.json();

    // Store tokens
    sessionStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
    if (tokens.refresh_token) {
      sessionStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
    }
    if (tokens.id_token) {
      sessionStorage.setItem(STORAGE_KEYS.idToken, tokens.id_token);
    }

    const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;
    sessionStorage.setItem(STORAGE_KEYS.expiresAt, expiresAt.toString());

    // Clean up PKCE values
    sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
    sessionStorage.removeItem(STORAGE_KEYS.state);
    sessionStorage.removeItem(STORAGE_KEYS.nonce);

    return { success: true };
  } catch (err) {
    console.error('Callback error:', err);
    return { success: false, error: 'Netzwerkfehler beim Token-Austausch' };
  }
}

/**
 * Get the stored return URL and clear it
 */
export function getAndClearReturnTo(): string | null {
  const returnTo = sessionStorage.getItem(STORAGE_KEYS.returnTo);
  sessionStorage.removeItem(STORAGE_KEYS.returnTo);
  return returnTo;
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  const token = sessionStorage.getItem(STORAGE_KEYS.accessToken);
  const expiresAt = sessionStorage.getItem(STORAGE_KEYS.expiresAt);

  if (!token || !expiresAt) return false;

  // Check if token is expired (with 60s buffer)
  return Date.now() < parseInt(expiresAt) - 60_000;
}

/**
 * Get the access token (returns null if expired)
 */
export function getAccessToken(): string | null {
  if (!isAuthenticated()) return null;
  return sessionStorage.getItem(STORAGE_KEYS.accessToken);
}

/**
 * Try to refresh the access token
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = sessionStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${SHOPIFY_AUTH_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: SHOPIFY_CUSTOMER_CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) return false;

    const tokens = await response.json();
    sessionStorage.setItem(STORAGE_KEYS.accessToken, tokens.access_token);
    if (tokens.refresh_token) {
      sessionStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh_token);
    }
    const expiresAt = Date.now() + (tokens.expires_in || 3600) * 1000;
    sessionStorage.setItem(STORAGE_KEYS.expiresAt, expiresAt.toString());

    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch customer data from Shopify Customer Account API
 */
export async function fetchCustomerData(): Promise<ShopifyCustomerData | null> {
  let token = getAccessToken();
  
  // Try refresh if expired
  if (!token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) token = getAccessToken();
  }

  if (!token) return null;

  try {
    const response = await fetch(SHOPIFY_CUSTOMER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({
        query: `
          query {
            customer {
              id
              emailAddress { emailAddress }
              firstName
              lastName
              displayName
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token invalid, try refresh
        const refreshed = await refreshAccessToken();
        if (refreshed) return fetchCustomerData();
        logout();
      }
      return null;
    }

    const data = await response.json();
    const customer = data?.data?.customer;
    if (!customer) return null;

    return {
      id: customer.id,
      email: customer.emailAddress?.emailAddress || '',
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      displayName: customer.displayName || '',
    };
  } catch (err) {
    console.error('Failed to fetch customer data:', err);
    return null;
  }
}

/**
 * Logout - clear all tokens and session data
 */
export function logout(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    sessionStorage.removeItem(key);
  });
}

/**
 * Append logged_in=true to checkout URL for authenticated customers
 */
export function getAuthenticatedCheckoutUrl(checkoutUrl: string): string {
  if (!isAuthenticated()) return checkoutUrl;
  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set('logged_in', 'true');
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}
