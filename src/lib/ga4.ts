/**
 * GA4 E-Commerce dataLayer helpers
 * All events follow the GA4 recommended e-commerce schema.
 * @see https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
 */

import type { ShopifyProduct } from '@/lib/shopify';

type DL = typeof window & { dataLayer: Record<string, unknown>[] };

function push(event: Record<string, unknown>) {
  const w = window as unknown as DL;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ ecommerce: null }); // clear previous ecommerce object
  w.dataLayer.push(event);
}

function mapItem(product: ShopifyProduct, variantId?: string, quantity = 1, price?: number) {
  const variant = variantId
    ? product.node.variants.edges.find(v => v.node.id === variantId)?.node
    : product.node.variants.edges[0]?.node;
  const p = price ?? parseFloat(variant?.price.amount || product.node.priceRange.minVariantPrice.amount);
  return {
    item_id: variant?.sku || product.node.handle,
    item_name: product.node.title,
    item_brand: product.node.vendor || '',
    item_variant: variant?.title !== 'Default Title' ? variant?.title : undefined,
    price: p,
    quantity,
  };
}

/** Fired on product detail page */
export function trackViewItem(product: ShopifyProduct) {
  const item = mapItem(product);
  push({
    event: 'view_item',
    ecommerce: {
      currency: product.node.priceRange.minVariantPrice.currencyCode || 'EUR',
      value: item.price,
      items: [item],
    },
  });
}

/** Fired when product is added to cart */
export function trackAddToCart(product: ShopifyProduct, variantId: string, quantity = 1, totalPrice?: number) {
  const item = mapItem(product, variantId, quantity, totalPrice);
  push({
    event: 'add_to_cart',
    ecommerce: {
      currency: product.node.priceRange.minVariantPrice.currencyCode || 'EUR',
      value: item.price * quantity,
      items: [item],
    },
  });
}

/** Fired when product is removed from cart */
export function trackRemoveFromCart(product: ShopifyProduct, variantId: string, quantity = 1) {
  const item = mapItem(product, variantId, quantity);
  push({
    event: 'remove_from_cart',
    ecommerce: {
      currency: product.node.priceRange.minVariantPrice.currencyCode || 'EUR',
      value: item.price * quantity,
      items: [item],
    },
  });
}

/** Fired when cart drawer is opened */
export function trackViewCart(items: Array<{ product: ShopifyProduct; variantId: string; quantity: number; price: { amount: string; currencyCode: string } }>) {
  const mapped = items.map(i => mapItem(i.product, i.variantId, i.quantity));
  const value = items.reduce((sum, i) => sum + parseFloat(i.price.amount) * i.quantity, 0);
  push({
    event: 'view_cart',
    ecommerce: {
      currency: items[0]?.price.currencyCode || 'EUR',
      value,
      items: mapped,
    },
  });
}

/** Fired when user clicks checkout */
export function trackBeginCheckout(items: Array<{ product: ShopifyProduct; variantId: string; quantity: number; price: { amount: string; currencyCode: string } }>) {
  const mapped = items.map(i => mapItem(i.product, i.variantId, i.quantity));
  const value = items.reduce((sum, i) => sum + parseFloat(i.price.amount) * i.quantity, 0);
  push({
    event: 'begin_checkout',
    ecommerce: {
      currency: items[0]?.price.currencyCode || 'EUR',
      value,
      items: mapped,
    },
  });
}

/** Fired on product listing / collection pages (limit items to keep payload small) */
export function trackViewItemList(products: ShopifyProduct[], listName: string) {
  const mapped = products.slice(0, 24).map((p, idx) => ({ ...mapItem(p), index: idx, item_list_name: listName }));
  push({
    event: 'view_item_list',
    ecommerce: {
      item_list_name: listName,
      items: mapped,
    },
  });
}

/** Fired when user clicks a product in a listing */
export function trackSelectItem(product: ShopifyProduct, listName: string, index?: number) {
  const item = { ...mapItem(product), item_list_name: listName, ...(index !== undefined ? { index } : {}) };
  push({
    event: 'select_item',
    ecommerce: {
      item_list_name: listName,
      items: [item],
    },
  });
}
