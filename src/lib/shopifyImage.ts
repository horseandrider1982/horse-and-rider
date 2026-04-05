/**
 * Append Shopify CDN image size parameters to avoid downloading
 * full-resolution originals, and provide intrinsic width/height
 * for CLS-free rendering.
 */
export function shopifyImageUrl(url: string, width: number): string {
  if (!url || !url.includes('cdn.shopify.com')) return url;
  // Shopify CDN supports _WIDTHx at the end of the filename or query params
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=${width}`;
}
