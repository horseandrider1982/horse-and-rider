import { LocaleLink } from '@/components/LocaleLink';
import type { CollectionImage } from '@/hooks/useCollectionImages';

interface CategoryCardProps {
  collection: CollectionImage;
  url: string;
}

export function CategoryCard({ collection, url }: CategoryCardProps) {
  return (
    <LocaleLink
      to={url}
      className="group block rounded-lg overflow-hidden border border-border bg-card hover:shadow-md transition-shadow duration-200"
    >
      {collection.imageUrl ? (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={collection.imageUrl}
            alt={collection.imageAlt || collection.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">{collection.title}</span>
        </div>
      )}
      <div className="p-3">
        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {collection.title}
        </h4>
        {collection.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{collection.description}</p>
        )}
      </div>
    </LocaleLink>
  );
}
