import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { BreadcrumbJsonLd } from "@/components/JsonLd";
import { LocaleLink } from "@/components/LocaleLink";
import { useI18n } from "@/i18n";

const SITE_URL = "https://horse-and-rider.de";

export interface BreadcrumbEntry {
  label: string;
  to?: string; // omit for current page (last item)
}

interface BreadcrumbsProps {
  items: BreadcrumbEntry[];
  className?: string;
}

export function Breadcrumbs({ items, className = "mb-6" }: BreadcrumbsProps) {
  const { locale } = useI18n();

  const jsonLdItems = items.map((item) => ({
    name: item.label,
    url: item.to
      ? `${SITE_URL}/${locale}${item.to.startsWith("/") ? item.to : `/${item.to}`}`
      : `${SITE_URL}${window.location.pathname}`,
  }));

  return (
    <>
      <BreadcrumbJsonLd items={jsonLdItems} />
      <Breadcrumb className={className}>
        <BreadcrumbList>
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <BreadcrumbItem key={i}>
                {i > 0 && <BreadcrumbSeparator />}
                {isLast || !item.to ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <LocaleLink to={item.to}>{item.label}</LocaleLink>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}