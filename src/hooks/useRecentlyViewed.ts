import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'hr_recently_viewed_v1';
const MAX_ITEMS = 12;

export interface RecentlyViewedEntry {
  handle: string;
  viewedAt: number;
}

function read(): RecentlyViewedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e): e is RecentlyViewedEntry =>
      e && typeof e.handle === 'string' && typeof e.viewedAt === 'number'
    );
  } catch {
    return [];
  }
}

function write(entries: RecentlyViewedEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('recently-viewed-updated'));
  } catch {
    /* noop – quota / disabled */
  }
}

export function trackProductView(handle: string) {
  if (!handle) return;
  const existing = read().filter(e => e.handle !== handle);
  const next = [{ handle, viewedAt: Date.now() }, ...existing].slice(0, MAX_ITEMS);
  write(next);
}

export function useRecentlyViewed(excludeHandle?: string): string[] {
  const [entries, setEntries] = useState<RecentlyViewedEntry[]>(() => read());

  useEffect(() => {
    const sync = () => setEntries(read());
    window.addEventListener('recently-viewed-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('recently-viewed-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return entries
    .filter(e => !excludeHandle || e.handle !== excludeHandle)
    .map(e => e.handle);
}

export function useClearRecentlyViewed() {
  return useCallback(() => write([]), []);
}
