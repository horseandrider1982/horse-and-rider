import { useRef, useEffect } from 'react';
import { useShopifyMenu, type ShopifyMenuItem } from '@/hooks/useShopifyMenu';
import { usePublicCmsMenus, type PublicMenuItem } from '@/hooks/usePublicCmsMenus';
import { MegaMenuItem } from './MegaMenuItem';
import { CmsMegaMenuItem } from './CmsMegaMenuItem';
import { ExternalLink } from 'lucide-react';

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
      const header = navRef.current?.closest('header');
      if (header) {
        const rect = header.getBoundingClientRect();
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
          return <CmsMegaMenuItem key={cmsItem.id} item={cmsItem} />;
        })}
        <li>
          <a
            href="https://sattelservice.horse-and-rider.de"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            Sattelservice
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        </li>
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

