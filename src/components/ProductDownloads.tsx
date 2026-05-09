import { useMemo } from "react";
import { FileText, Download } from "lucide-react";
import { useDownloadCategories, useDownloadsForSkus, type ProductDownload } from "@/hooks/useProductDownloads";

interface ProductDownloadsProps {
  skus: string[];
}

/**
 * PDP block: shows product downloads grouped by category for the given SKUs.
 * Renders nothing if no downloads found.
 */
export function ProductDownloads({ skus }: ProductDownloadsProps) {
  const { data: categories } = useDownloadCategories();
  const { data: downloads, isLoading } = useDownloadsForSkus(skus);

  const grouped = useMemo(() => {
    if (!downloads || !categories) return [];
    const byCat = new Map<string, ProductDownload[]>();
    for (const d of downloads) {
      const arr = byCat.get(d.category_key) ?? [];
      arr.push(d);
      byCat.set(d.category_key, arr);
    }
    return categories
      .map((c) => ({ category: c, items: byCat.get(c.key) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [downloads, categories]);

  if (isLoading || grouped.length === 0) return null;

  return (
    <section className="mt-6 pt-4 border-t border-border">
      <h2 className="text-base font-heading font-semibold text-foreground mb-3">Downloads</h2>
      <div className="space-y-4">
        {grouped.map(({ category, items }) => (
          <div key={category.key}>
            <h3 className="text-sm font-medium text-foreground mb-2">{category.label}</h3>
            <ul className="space-y-1.5">
              {items.map((d) => (
                <li key={d.id}>
                  <a
                    href={d.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={d.display_filename}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>{d.display_filename}</span>
                    <Download className="h-3.5 w-3.5 opacity-60" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
