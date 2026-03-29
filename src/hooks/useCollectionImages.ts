import { useQuery } from '@tanstack/react-query';
import { storefrontApiRequest } from '@/lib/shopify';
import { useI18n } from '@/i18n';

const COLLECTIONS_BY_HANDLES_QUERY = `
  query GetCollectionsByHandles($handles: [String!]!, $language: LanguageCode) @inContext(language: $language) {
    nodes: collections(first: 50, query: "") {
      edges {
        node {
          id
          handle
          title
          description
          image {
            url
            altText
          }
        }
      }
    }
  }
`;

const COLLECTION_BY_HANDLE_QUERY = `
  query GetCollectionByHandle($handle: String!, $language: LanguageCode) @inContext(language: $language) {
    collectionByHandle(handle: $handle) {
      id
      handle
      title
      description
      image {
        url
        altText
      }
    }
  }
`;

export interface CollectionImage {
  handle: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageAlt: string | null;
}

/**
 * Fetches collection images for a list of handles.
 * Uses individual queries per handle for reliability.
 */
export function useCollectionImages(handles: string[]) {
  const { locale } = useI18n();
  const filteredHandles = handles.filter(Boolean);

  return useQuery({
    queryKey: ['collection-images', filteredHandles.sort().join(','), locale],
    queryFn: async (): Promise<Record<string, CollectionImage>> => {
      if (filteredHandles.length === 0) return {};

      const results: Record<string, CollectionImage> = {};

      // Fetch in parallel, max 6 concurrent
      const chunks: string[][] = [];
      for (let i = 0; i < filteredHandles.length; i += 6) {
        chunks.push(filteredHandles.slice(i, i + 6));
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async (handle) => {
          try {
            const data = await storefrontApiRequest(COLLECTION_BY_HANDLE_QUERY, {
              handle,
              language: locale.toUpperCase(),
            });
            const col = data?.data?.collectionByHandle;
            if (col) {
              results[handle] = {
                handle: col.handle,
                title: col.title,
                description: col.description || '',
                imageUrl: col.image?.url || null,
                imageAlt: col.image?.altText || null,
              };
            }
          } catch (err) {
            console.warn(`Failed to fetch collection image for ${handle}:`, err);
          }
        });
        await Promise.all(promises);
      }

      return results;
    },
    enabled: filteredHandles.length > 0,
    staleTime: 1000 * 60 * 15,
  });
}
