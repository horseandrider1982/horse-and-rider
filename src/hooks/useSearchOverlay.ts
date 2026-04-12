import { useState, useRef, useCallback, useEffect } from "react";
import type { SearchResults, SearchProductResult } from "@/types/search";
import { supabase } from "@/integrations/supabase/client";

const DEBOUNCE_MS = 300;
const CACHE_TTL = 45_000;

const queryCache = new Map<string, { data: SearchResults; ts: number }>();

function isAdvisoryQuery(q: string): boolean {
  const trimmed = q.trim().toLowerCase();
  if (trimmed.endsWith("?")) return true;
  const patterns = [
    /^welch/i, /^was /i, /^wie /i, /^warum/i, /^wann/i, /^wo /i,
    /^kann ich/i, /^soll ich/i, /^brauche ich/i, /^brauch/i,
    /^eignet sich/i, /^passt/i, /^empfehl/i, /^unterschied/i,
    /^hilf/i, /^berät/i, /^berat/i,
    /für mein pferd/i, /für mein/i, /geeignet/i, /empfehlung/i,
    /größe.*bei/i, /größenberatung/i,
  ];
  return patterns.some((p) => p.test(trimmed));
}

export interface AIAdvisorCategory {
  name: string;
  handle: string | null;
}

export interface AIAdvisorResult {
  answer: string;
  recommendedProducts: string[];
  categories: AIAdvisorCategory[];
  isLoading: boolean;
}

export function useSearchOverlay() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [allProducts, setAllProducts] = useState<SearchProductResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [aiResult, setAiResult] = useState<AIAdvisorResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProducts, setAiProducts] = useState<SearchProductResult[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();
  const aiAbortRef = useRef<AbortController>();
  const lastQueryRef = useRef("");

  const fetchProducts = useCallback(async (q: string, after?: string | null) => {
    const trimmed = q.trim().toLowerCase();
    if (trimmed.length < 2) {
      setResults(null);
      setAllProducts([]);
      setIsLoading(false);
      setHasNextPage(false);
      setEndCursor(null);
      return;
    }

    // Only use cache for initial page (no cursor)
    if (!after) {
      const cached = queryCache.get(trimmed);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setResults(cached.data);
        setAllProducts(cached.data.groups.products);
        setIsLoading(false);
        setHasNextPage(cached.data.pageInfo?.hasNextPage ?? false);
        setEndCursor(cached.data.pageInfo?.endCursor ?? null);
        return;
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const isCurrentRequest = () => abortRef.current === controller;

    if (!after) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      let url = `https://${projectId}.supabase.co/functions/v1/search-predictive?q=${encodeURIComponent(q.trim())}`;
      if (after) url += `&after=${encodeURIComponent(after)}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const searchData: SearchResults = await res.json();

      if (lastQueryRef.current === q) {
        if (!after) {
          // First page
          queryCache.set(trimmed, { data: searchData, ts: Date.now() });
          setResults(searchData);
          setAllProducts(searchData.groups.products);
        } else {
          // Append products
          setAllProducts((prev) => {
            const merged = [...prev, ...searchData.groups.products];
            return merged;
          });
          // Update results with merged products for the grid
          setResults((prev) => prev ? {
            ...prev,
            groups: {
              ...prev.groups,
              products: [...prev.groups.products, ...searchData.groups.products],
            },
            pageInfo: searchData.pageInfo,
          } : searchData);
        }
        setHasNextPage(searchData.pageInfo?.hasNextPage ?? false);
        setEndCursor(searchData.pageInfo?.endCursor ?? null);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Search error:", err);
      if (!after) setResults(null);
    } finally {
      // Only clear loading state if this is still the active request
      if (isCurrentRequest()) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, []);

  const fetchAIAdvice = useCallback(async (q: string) => {
    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;

    setAiLoading(true);
    setAiResult(null);
    setAiProducts([]);

    try {
      const { data, error } = await supabase.functions.invoke("search-ai-advisor", {
        body: { query: q },
      });

      if (error) throw error;
      if (controller.signal.aborted) return;

      const recommended: string[] = data.recommendedProducts || [];

      setAiResult({
        answer: data.answer || "",
        recommendedProducts: recommended,
        categories: data.categories || [],
        isLoading: false,
      });

      // Fetch products matching AI recommendations
      if (recommended.length > 0) {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        // Search for each recommended product name
        const fetches = recommended.slice(0, 5).map(async (name) => {
          try {
            const url = `https://${projectId}.supabase.co/functions/v1/search-predictive?q=${encodeURIComponent(name)}&limit=3`;
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${anonKey}`, apikey: anonKey },
              signal: controller.signal,
            });
            if (!res.ok) return [];
            const searchData: SearchResults = await res.json();
            return searchData.groups?.products || [];
          } catch { return []; }
        });

        const allRec = await Promise.all(fetches);
        if (controller.signal.aborted) return;

        // Deduplicate by id
        const seen = new Set<string>();
        const unique: SearchProductResult[] = [];
        for (const products of allRec) {
          for (const p of products) {
            if (!seen.has(p.id)) {
              seen.add(p.id);
              unique.push(p);
            }
          }
        }
        setAiProducts(unique);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("AI advisor error:", err);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      lastQueryRef.current = value;

      if (value.trim().length < 2) {
        setResults(null);
        setAllProducts([]);
        setIsLoading(false);
        setAiResult(null);
        setAiLoading(false);
        setHasNextPage(false);
        setEndCursor(null);
        return;
      }

      setIsLoading(true);
      setResults(null);
      setAllProducts([]);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchProducts(value);
        if (isAdvisoryQuery(value)) {
          fetchAIAdvice(value);
        } else {
          setAiResult(null);
          setAiLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [fetchProducts, fetchAIAdvice]
  );

  const loadMore = useCallback(() => {
    if (!hasNextPage || isLoadingMore || !endCursor) return;
    fetchProducts(query, endCursor);
  }, [hasNextPage, isLoadingMore, endCursor, query, fetchProducts]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setResults(null);
    setAllProducts([]);
    setAiResult(null);
    setAiLoading(false);
    setAiProducts([]);
    setIsLoading(false);
    setHasNextPage(false);
    setEndCursor(null);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
      aiAbortRef.current?.abort();
    };
  }, []);

  return {
    query,
    results,
    isLoading,
    isLoadingMore,
    isOpen,
    aiResult,
    aiLoading,
    aiProducts,
    hasNextPage,
    handleQueryChange,
    loadMore,
    open,
    close,
    reset,
    isAdvisory: isAdvisoryQuery(query),
  };
}
