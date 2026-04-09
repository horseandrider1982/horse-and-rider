import { useCollectionSeoText } from "@/hooks/useCollectionSeoText";

interface Props {
  handle: string | undefined;
  locale: string;
}

export function CollectionSeoText({ handle, locale }: Props) {
  const { data } = useCollectionSeoText(handle, locale);

  if (!data?.body) return null;

  return (
    <section className="mt-12 pt-8 border-t border-border max-w-3xl">
      {data.heading && (
        <h2 className="font-heading text-xl font-bold text-foreground mb-3">
          {data.heading}
        </h2>
      )}
      <div
        className="prose prose-sm text-muted-foreground max-w-none [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-3 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_p]:mb-2"
        dangerouslySetInnerHTML={{ __html: data.body }}
      />
    </section>
  );
}
