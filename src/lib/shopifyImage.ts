/**
 * Shopify CDN image transforms.
 * Shopify auto-converts to WebP/AVIF based on Accept header — `format` is mostly insurance.
 * Always supply width to avoid downloading full-resolution originals.
 */
export function shopifyImageUrl(url: string, width: number, format?: 'webp' | 'pjpg'): string {
  if (!url) return url;
  if (!url.includes('cdn.shopify.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('width', String(width));
    if (format) u.searchParams.set('format', format);
    return u.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}width=${width}${format ? `&format=${format}` : ''}`;
  }
}

/**
 * Build a responsive srcset for a Shopify image.
 * Default widths are tuned for 4-column product grids (mobile → desktop).
 */
export function shopifyImageSrcSet(url: string, widths: number[] = [200, 300, 400, 600, 800]): string | undefined {
  if (!url || !url.includes('cdn.shopify.com')) return undefined;
  return widths.map(w => `${shopifyImageUrl(url, w)} ${w}w`).join(', ');
}
