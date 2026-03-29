import { useRef, useEffect } from 'react';
import { useShopifyMenu, type ShopifyMenuItem } from '@/hooks/useShopifyMenu';
import { usePublicCmsMenus, type PublicMenuItem } from '@/hooks/usePublicCmsMenus';
import { MegaMenuItem } from './MegaMenuItem';
import { LocaleLink } from '@/components/LocaleLink';

/**
 * Desktop-only Mega Menu.
 * Dynamically renders from CMS top_navigation + Shopify menu data.
 */
export function MegaMenu() {
  const { data: menus } = usePublicCmsMenus();
  const topNavItems = menus?.top_navigation || [];
  const navRef = useRef<HTMLElement>(null);

  // Calculate top position for mega dropdown
  useEffect(() => {
    const updateTop = () => {
      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        document.documentElement.style.setProperty(
          '--mega-menu-top',
          `${rect.bottom}px`
        );
      }
    };
    updateTop();
    window.addEventListener('resize', updateTop);
    window.addEventListener('scroll', updateTop);
    return () => {
      window.removeEventListener('resize', updateTop);
      window.removeEventListener('scroll', updateTop);
    };
  }, []);

  return (
    <nav ref={navRef} className="hidden lg:block">
      <ul className="flex items-center gap-0">
        {topNavItems.map((cmsItem) => {
          if (cmsItem.type === 'shopify_menu_placeholder') {
            return (
              <ShopifyMenuItems
                key={cmsItem.id}
                handle={cmsItem.url || 'main-menu'}
              />
            );
          }
          return <CmsNavItem key={cmsItem.id} item={cmsItem} />;
        })}
      </ul>
    </nav>
  );
}

function ShopifyMenuItems({ handle }: { handle: string }) {
  const { data: shopifyItems } = useShopifyMenu(handle);
  if (!shopifyItems?.length) return null;

  return (
    <>
      {shopifyItems.map((item) => (
        <MegaMenuItem key={item.id} item={item} />
      ))}
    </>
  );
}

function CmsNavItem({ item }: { item: PublicMenuItem }) {
  const isExternal = item.target === '_blank' || item.url?.startsWith('http');

  if (isExternal) {
    return (
      <li>
        <a
          href={item.url || '#'}
          target={item.target}
          rel="noopener noreferrer"
          className="flex items-center px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          {item.label}
        </a>
      </li>
    );
  }

  return (
    <li>
      <LocaleLink
        to={item.url || '#'}
        className="flex items-center px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        {item.label}
      </LocaleLink>
    </li>
  );
}
