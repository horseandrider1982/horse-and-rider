import { LocaleLink } from '@/components/LocaleLink';
import type { ShopifyMenuItem } from '@/hooks/useShopifyMenu';

interface MenuColumnProps {
  item: ShopifyMenuItem;
}

export function MenuColumn({ item }: MenuColumnProps) {
  const isExternal = item.url.startsWith('http');

  return (
    <div className="space-y-2">
      {isExternal ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {item.title}
        </a>
      ) : (
        <LocaleLink
          to={item.url}
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          {item.title}
        </LocaleLink>
      )}

      {item.items && item.items.length > 0 && (
        <ul className="space-y-1.5 pl-0">
          {item.items.map((child) => {
            const childExternal = child.url.startsWith('http');
            return (
              <li key={child.id}>
                {childExternal ? (
                  <a
                    href={child.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {child.title}
                  </a>
                ) : (
                  <LocaleLink
                    to={child.url}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {child.title}
                  </LocaleLink>
                )}

                {/* Level 3 */}
                {child.items && child.items.length > 0 && (
                  <ul className="pl-3 mt-1 space-y-1 border-l border-border">
                    {child.items.map((grandchild) => (
                      <li key={grandchild.id}>
                        <LocaleLink
                          to={grandchild.url}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          {grandchild.title}
                        </LocaleLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
