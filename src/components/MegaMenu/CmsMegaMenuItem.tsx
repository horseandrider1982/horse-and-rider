import { useState, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { LocaleLink } from '@/components/LocaleLink';
import type { PublicMenuItem } from '@/hooks/usePublicCmsMenus';

interface CmsMegaMenuItemProps {
  item: PublicMenuItem;
}

const HOVER_OPEN_DELAY = 150;
const HOVER_CLOSE_DELAY = 250;

export function CmsMegaMenuItem({ item }: CmsMegaMenuItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimeout = useRef<ReturnType<typeof setTimeout>>();
  const closeTimeout = useRef<ReturnType<typeof setTimeout>>();
  const hasChildren = item.children && item.children.length > 0;

  const handleMouseEnter = useCallback(() => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    openTimeout.current = setTimeout(() => setIsOpen(true), HOVER_OPEN_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (openTimeout.current) clearTimeout(openTimeout.current);
    closeTimeout.current = setTimeout(() => setIsOpen(false), HOVER_CLOSE_DELAY);
  }, []);

  const isExternal = item.target === '_blank' || item.url?.startsWith('http');

  if (!hasChildren) {
    return (
      <li className="relative">
        {isExternal ? (
          <a
            href={item.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {item.label}
          </a>
        ) : (
          <LocaleLink
            to={item.url || '#'}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {item.label}
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
        to={item.url || '#'}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${
          isOpen ? 'text-primary' : 'text-foreground hover:text-primary'
        }`}
      >
        {item.label}
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </LocaleLink>

      {isOpen && (
        <div
          className="fixed left-0 right-0 z-50 animate-in fade-in slide-in-from-top-1 duration-200"
          style={{ top: 'var(--mega-menu-top, 100%)' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <CmsMegaMenuDropdown item={item} />
        </div>
      )}
    </li>
  );
}

function CmsMegaMenuDropdown({ item }: { item: PublicMenuItem }) {
  const children = item.children || [];

  // Split into column groups of ~3-4
  const columnGroups: PublicMenuItem[][] = [];
  const perGroup = Math.max(3, Math.ceil(children.length / 4));
  for (let i = 0; i < children.length; i += perGroup) {
    columnGroups.push(children.slice(i, i + perGroup));
  }

  return (
    <div className="w-full bg-background border-b border-border shadow-lg">
      <div className="container mx-auto px-4 py-6">
        {/* TOP: Category title */}
        <div className="mb-4">
          <LocaleLink
            to={item.url || '#'}
            className="font-heading text-base font-semibold text-foreground hover:text-primary transition-colors"
          >
            {item.label}
          </LocaleLink>
        </div>

        {/* Menu columns in 4-column grid */}
        <div className="grid grid-cols-4 gap-x-8 gap-y-2">
          {columnGroups.map((group, gi) => (
            <div key={gi} className="space-y-4">
              {group.map((child) => (
                <CmsMenuColumn key={child.id} item={child} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CmsMenuColumn({ item }: { item: PublicMenuItem }) {
  const isExternal = item.target === '_blank' || item.url?.startsWith('http');

  return (
    <div className="space-y-2">
      {isExternal ? (
        <a
          href={item.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {item.label}
        </a>
      ) : (
        <LocaleLink
          to={item.url || '#'}
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {item.label}
        </LocaleLink>
      )}

      {item.children && item.children.length > 0 && (
        <ul className="space-y-1.5 pl-0">
          {item.children.map((child) => (
            <li key={child.id}>
              <LocaleLink
                to={child.url || '#'}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {child.label}
              </LocaleLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
