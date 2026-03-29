import { useShopifyMenu, type ShopifyMenuItem } from '@/hooks/useShopifyMenu';
import type { PublicMenuItem } from '@/hooks/usePublicCmsMenus';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LocaleLink } from './LocaleLink';

interface CmsMenuItemRendererProps {
  items: PublicMenuItem[];
  className?: string;
  linkClassName?: string;
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
  return <LocaleLink to={item.url} className={linkCls}>{item.title}</LocaleLink>;
}

function ShopifyMenuPlaceholder({ handle, className, mode }: { handle?: string; className?: string; mode: 'inline' | 'block' }) {
  const { data: shopifyItems } = useShopifyMenu(handle || 'main-menu');
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
  const [open, setOpen] = useState(false);
  const isExternal = item.target === '_blank' || item.url?.startsWith('http');
  const cls = className || '';
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren && mode === 'inline') {
    return (
      <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
        <button className={`${cls} flex items-center gap-1`}>
          {item.label}
          <ChevronDown className="h-3 w-3" />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-md shadow-lg py-1 min-w-[180px] z-50">
            {item.children!.map(child => (
              <SingleMenuLink key={child.id} item={child} className="block px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors" mode="block" />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isExternal) {
    return <a href={item.url || '#'} target={item.target} rel="noopener noreferrer" className={cls}>{item.label}</a>;
  }
  return <LocaleLink to={item.url || '#'} className={cls}>{item.label}</LocaleLink>;
}

export function CmsMenuItemRenderer({ items, linkClassName, mode = 'inline' }: CmsMenuItemRendererProps) {
  return (
    <>
      {items.map(item => {
        if (item.type === 'shopify_menu_placeholder') {
          return <ShopifyMenuPlaceholder key={item.id} handle={item.url || undefined} className={linkClassName} mode={mode} />;
        }
        return <SingleMenuLink key={item.id} item={item} className={linkClassName} mode={mode} />;
      })}
    </>
  );
}
