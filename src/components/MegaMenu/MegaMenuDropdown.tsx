import { useMemo } from 'react';
import type { ShopifyMenuItem } from '@/hooks/useShopifyMenu';
import { useCollectionImages } from '@/hooks/useCollectionImages';
import { MenuColumn } from './MenuColumn';
import { CategoryCard } from './CategoryCard';
import { LocaleLink } from '@/components/LocaleLink';
import { useI18n } from '@/i18n';

interface MegaMenuDropdownProps {
  item: ShopifyMenuItem;
}

export function MegaMenuDropdown({ item }: MegaMenuDropdownProps) {
  const { t } = useI18n();
  const children = item.items || [];

  // Collect all handles for category cards (top-level children with handles)
  const handles = useMemo(
    () => children.map((c) => c.handle).filter(Boolean) as string[],
    [children]
  );

  const { data: collectionImages } = useCollectionImages(handles);

  // Split children: use first few with images as cards, rest as columns
  const cardsData = useMemo(() => {
    if (!collectionImages) return [];
    return handles
      .filter((h) => collectionImages[h]?.imageUrl)
      .slice(0, 3);
  }, [handles, collectionImages]);

  // All children go into menu columns
  const columns = children;

  // Split columns into groups of ~4 for multi-column layout
  const columnGroups = useMemo(() => {
    const groups: ShopifyMenuItem[][] = [];
    const perGroup = Math.max(4, Math.ceil(columns.length / 3));
    for (let i = 0; i < columns.length; i += perGroup) {
      groups.push(columns.slice(i, i + perGroup));
    }
    return groups;
  }, [columns]);

  if (children.length === 0) return null;

  return (
    <div className="w-full bg-background border-b border-border shadow-lg">
      <div className="container mx-auto px-4 py-6">
        {/* TOP: Category title centered */}
        <div className="mb-4">
          <LocaleLink
            to={item.url}
            className="font-heading text-base font-semibold text-foreground hover:text-primary transition-colors"
          >
            {item.title}
          </LocaleLink>
        </div>

        <div className="flex gap-8">
          {/* Menu columns in 4-column grid */}
          <div className="flex-1 grid grid-cols-4 gap-x-8 gap-y-2">
            {columnGroups.map((group, gi) => (
              <div key={gi} className="space-y-4">
                {group.map((col) => (
                  <MenuColumn key={col.id} item={col} />
                ))}
              </div>
            ))}
          </div>

          {/* RIGHT: Category cards */}
          {cardsData.length > 0 && collectionImages && (
            <div className="flex-shrink-0 w-72">
              <div className="grid grid-cols-1 gap-3">
                {cardsData.slice(0, 2).map((handle) => {
                  const col = collectionImages[handle];
                  const menuItem = children.find((c) => c.handle === handle);
                  if (!col || !menuItem) return null;
                  return (
                    <CategoryCard
                      key={handle}
                      collection={col}
                      url={menuItem.url}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
