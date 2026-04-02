import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { LocaleLink } from '@/components/LocaleLink';
import { MegaMenuDropdown } from './MegaMenuDropdown';
import type { ShopifyMenuItem } from '@/hooks/useShopifyMenu';

interface MegaMenuItemProps {
  item: ShopifyMenuItem;
}

const HOVER_OPEN_DELAY = 150;
const HOVER_CLOSE_DELAY = 250;

export function MegaMenuItem({ item }: MegaMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimeout = useRef<ReturnType<typeof setTimeout>>();
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>();
  const hasChildren = item.items && item.items.length > 0;
  const location = useLocation();

  // Close menu on any route change (SPA navigation)
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleMouseEnter = useCallback(() => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    openTimeout.current = setTimeout(() => setIsOpen(true), HOVER_OPEN_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (openTimeout.current) clearTimeout(openTimeout.current);
    closeTimeout.current = setTimeout(() => setIsOpen(false), HOVER_CLOSE_DELAY);
  }, []);

  const isExternal = item.url.startsWith('http');

  if (!hasChildren) {
    return (
      <li className="relative">
        {isExternal ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {item.title}
          </a>
        ) : (
          <LocaleLink
            to={item.url}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {item.title}
          </LocaleLink>
        )}
      </li>
    );
  }

  return (
    <li
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <LocaleLink
        to={item.url}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
          isOpen ? 'text-primary' : 'text-foreground hover:text-primary'
        }`}
      >
        {item.title}
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </LocaleLink>

      {/* Full-width dropdown, positioned absolute from the nav bar */}
      {isOpen && (
        <div
          className="fixed left-0 right-0 z-50 animate-in fade-in slide-in-from-top-1 duration-200"
          style={{ top: 'var(--mega-menu-top, 100%)' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <MegaMenuDropdown item={item} />
        </div>
      )}
    </li>
  );
}
