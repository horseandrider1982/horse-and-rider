import { useState, useRef, useCallback, useEffect } from "react";
import type { SearchResults } from "@/types/search";

const DEBOUNCE_MS = 350;
const CACHE_TTL = 45_000;

const queryCache = new Map<string, { data: SearchResults; ts: number }>();

export function useSmartSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();
  const lastQueryRef = useRef("");

  const fetchResults = useCallback(async (q: string) => {
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
      setIsOpen(true);
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
        setIsOpen(true);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Search error:", err);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      lastQueryRef.current = value;

      if (value.trim().length < 2) {
        setResults(null);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchResults(value), DEBOUNCE_MS);
    },
    [fetchResults]
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const open = useCallback(() => {
    if (query.trim().length >= 2 && results) {
      setIsOpen(true);
    }
  }, [query, results]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return { query, results, isLoading, isOpen, handleQueryChange, close, open };
}
