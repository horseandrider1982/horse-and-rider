import { useState, useRef, useCallback, useEffect } from "react";
import type { SearchResults } from "@/types/search";
import { supabase } from "@/integrations/supabase/client";

const DEBOUNCE_MS = 300;
const CACHE_TTL = 45_000;

const queryCache = new Map<string, { data: SearchResults; ts: number }>();

// Detect if query is an advisory/question query
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

export interface AIAdvisorResult {
  answer: string;
  recommendedProducts: string[]; // search queries for products
  categories: string[];
  isLoading: boolean;
}

export function useSearchOverlay() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [aiResult, setAiResult] = useState<AIAdvisorResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();
  const aiAbortRef = useRef<AbortController>();
  const lastQueryRef = useRef("");

  const fetchProducts = useCallback(async (q: string) => {
    const trimmed = q.trim().toLowerCase();
    if (trimmed.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    const cached = queryCache.get(trimmed);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setResults(cached.data);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/search-predictive?q=${encodeURIComponent(q.trim())}`,
        {
          headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
          signal: controller.signal,
        }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const searchData: SearchResults = await res.json();
      queryCache.set(trimmed, { data: searchData, ts: Date.now() });

      if (lastQueryRef.current === q) {
        setResults(searchData);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Search error:", err);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAIAdvice = useCallback(async (q: string) => {
    aiAbortRef.current?.abort();
    const controller = new AbortController();
    aiAbortRef.current = controller;

    setAiLoading(true);
    setAiResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("search-ai-advisor", {
        body: { query: q },
      });

      if (error) throw error;
      if (controller.signal.aborted) return;

      setAiResult({
        answer: data.answer || "",
        recommendedProducts: data.recommendedProducts || [],
        categories: data.categories || [],
        isLoading: false,
      });
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
        setIsLoading(false);
        setAiResult(null);
        setAiLoading(false);
        return;
      }

      setIsLoading(true);
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

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setResults(null);
    setAiResult(null);
    setAiLoading(false);
    setIsLoading(false);
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
    isOpen,
    aiResult,
    aiLoading,
    handleQueryChange,
    open,
    close,
    reset,
    isAdvisory: isAdvisoryQuery(query),
  };
}
