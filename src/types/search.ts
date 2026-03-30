export interface SearchProductResult {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  priceText: string;
  vendor: string | null;
}

export interface SearchArticleResult {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  excerpt: string | null;
}

export interface SearchPageResult {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
}

export interface SearchPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface SearchResults {
  query: string;
  groups: {
    products: SearchProductResult[];
    articles: SearchArticleResult[];
    pages: SearchPageResult[];
  };
  pageInfo?: SearchPageInfo;
}

export type SearchItem =
  | ({ type: "product" } & SearchProductResult)
  | ({ type: "article" } & SearchArticleResult)
  | ({ type: "page" } & SearchPageResult);
