/**
 * URL normalization – must match the DB function `normalize_url` exactly.
 */
export function normalizeUrl(input: string): string {
  let result = input;
  // Remove domain
  result = result.replace(/^https?:\/\/[^/]+/, '');
  // Remove query string
  result = result.split('?')[0];
  // Remove fragment
  result = result.split('#')[0];
  // Lowercase
  result = result.toLowerCase();
  // Reduce multiple slashes
  result = result.replace(/\/+/g, '/');
  // Remove trailing slash (except root)
  if (result.length > 1) {
    result = result.replace(/\/+$/, '');
  }
  // Ensure leading slash
  if (!result.startsWith('/')) {
    result = '/' + result;
  }
  return result;
}
