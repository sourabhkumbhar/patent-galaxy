import { useEffect, useCallback, useRef } from 'react';

interface UseShareStateParams {
  yearRange: [number, number];
  categories: Set<string>;
  minCitations: number;
  searchQuery: string;
  selectedIndex: number | null;
  setYearRange: (range: [number, number]) => void;
  setCategories: (categories: Set<string>) => void;
  setMinCitations: (min: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedIndex: (index: number | null) => void;
  isLoading: boolean;
}

/**
 * Encodes the current filter/view state into the URL hash and restores it
 * on page load, enabling bookmarkable and shareable views.
 */
export function useShareState({
  yearRange,
  categories,
  minCitations,
  searchQuery,
  selectedIndex,
  setYearRange,
  setCategories,
  setMinCitations,
  setSearchQuery,
  setSelectedIndex,
  isLoading,
}: UseShareStateParams) {
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (isLoading || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const hash = window.location.hash.slice(1);
    if (!hash) return;

    try {
      const params = new URLSearchParams(hash);

      const yr = params.get('yr');
      if (yr) {
        const [min, max] = yr.split('-').map(Number);
        if (!isNaN(min) && !isNaN(max)) {
          setYearRange([min, max]);
        }
      }

      const cat = params.get('cat') || params.get('cpc');
      if (cat) {
        setCategories(new Set(cat.split(',')));
      }

      const mc = params.get('mc');
      if (mc) {
        const val = parseInt(mc, 10);
        if (!isNaN(val)) setMinCitations(val);
      }

      const q = params.get('q');
      if (q) setSearchQuery(q);

      const sel = params.get('sel');
      if (sel) {
        const val = parseInt(sel, 10);
        if (!isNaN(val)) setSelectedIndex(val);
      }
    } catch {
      // Invalid hash, ignore
    }
  }, [isLoading, setYearRange, setCategories, setMinCitations, setSearchQuery, setSelectedIndex]);

  const encodeState = useCallback((): string => {
    const params = new URLSearchParams();
    params.set('yr', `${yearRange[0]}-${yearRange[1]}`);
    params.set('cat', Array.from(categories).sort().join(','));
    if (minCitations > 0) params.set('mc', String(minCitations));
    if (searchQuery) params.set('q', searchQuery);
    if (selectedIndex !== null) params.set('sel', String(selectedIndex));
    return params.toString();
  }, [yearRange, categories, minCitations, searchQuery, selectedIndex]);

  const getShareUrl = useCallback((): string => {
    const base = window.location.origin + window.location.pathname;
    return `${base}#${encodeState()}`;
  }, [encodeState]);

  const copyShareUrl = useCallback(async (): Promise<boolean> => {
    const url = getShareUrl();
    window.history.replaceState(null, '', `#${encodeState()}`);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }, [getShareUrl, encodeState]);

  return { getShareUrl, copyShareUrl };
}
