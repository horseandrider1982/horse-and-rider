import { Link } from 'react-router-dom';
import { useShopifyMenu, type ShopifyMenuItem } from '@/hooks/useShopifyMenu';
import type { PublicMenuItem } from '@/hooks/usePublicCmsMenus';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CmsMenuItemRendererProps {
  items: PublicMenuItem[];
  className?: string;
  linkClassName?: string;
  /** Render mode: 'inline' renders items as siblings, 'block' renders as block links */
  mode?: 'inline' | 'block';
}

function ShopifyNavLink({ item, className, mode }: { item: ShopifyMenuItem; className?: string; mode: 'inline' | 'block' }) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.items && item.items.length > 0;
  const isExternal = item.url.startsWith('http');
  const linkCls = className || '';

  if (hasChildren && mode === 'inline') {
    return (
      <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <button className={`${linkCls} flex items-center gap-1`}>
          {item.title}
          <ChevronDown className="h-3 w-3" />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg py-1 min-w-[180px] z-50">
            {item.items!.map(child => (
              <ShopifyNavLink key={child.id} item={child} className="block px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors" mode="block" />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isExternal) {
    return <a href={item.url} target="_blank" rel="noopener noreferrer" className={linkCls}>{item.title}</a>;
  }
  return <Link to={item.url} className={linkCls}>{item.title}</Link>;
}

function ShopifyMenuPlaceholder({ className, mode }: { className?: string; mode: 'inline' | 'block' }) {
  const { data: shopifyItems } = useShopifyMenu('main-menu');
  if (!shopifyItems?.length) return null;
  return (
    <>
      {shopifyItems.map(item => (
        <ShopifyNavLink key={item.id} item={item} className={className} mode={mode} />
      ))}
    </>
  );
}

function SingleMenuLink({ item, className, mode }: { item: PublicMenuItem; className?: string; mode: 'inline' | 'block' }) {
  const isExternal = item.target === '_blank' || item.url?.startsWith('http');
  const cls = className || '';
  if (isExternal) {
    return <a href={item.url || '#'} target={item.target} rel="noopener noreferrer" className={cls}>{item.label}</a>;
  }
  return <Link to={item.url || '#'} className={cls}>{item.label}</Link>;
}

export function CmsMenuItemRenderer({ items, className, linkClassName, mode = 'inline' }: CmsMenuItemRendererProps) {
  return (
    <>
      {items.map(item => {
        if (item.type === 'shopify_menu_placeholder') {
          return <ShopifyMenuPlaceholder key={item.id} className={linkClassName} mode={mode} />;
        }
        return <SingleMenuLink key={item.id} item={item} className={linkClassName} mode={mode} />;
      })}
    </>
  );
}
