import { useEffect, useCallback, useRef } from 'react';

interface UseShareStateParams {
  yearRange: [number, number];
  cpcSections: Set<string>;
  minCitations: number;
  searchQuery: string;
  selectedPatentIndex: number | null;
  setYearRange: (range: [number, number]) => void;
  setCpcSections: (sections: Set<string>) => void;
  setMinCitations: (min: number) => void;
  setSearchQuery: (query: string) => void;
  setSelectedPatentIndex: (index: number | null) => void;
  isLoading: boolean;
}

/**
 * Encodes the current filter/view state into the URL hash and restores it
 * on page load, enabling bookmarkable and shareable views.
 */
export function useShareState({
  yearRange,
  cpcSections,
  minCitations,
  searchQuery,
  selectedPatentIndex,
  setYearRange,
  setCpcSections,
  setMinCitations,
  setSearchQuery,
  setSelectedPatentIndex,
  isLoading,
}: UseShareStateParams) {
  const hasRestoredRef = useRef(false);

  // Restore state from URL hash on mount (once data is loaded)
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

      const cpc = params.get('cpc');
      if (cpc) {
        setCpcSections(new Set(cpc.split('')));
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
        if (!isNaN(val)) setSelectedPatentIndex(val);
      }
    } catch {
      // Invalid hash, ignore
    }
  }, [isLoading, setYearRange, setCpcSections, setMinCitations, setSearchQuery, setSelectedPatentIndex]);

  // Encode state to URL hash
  const encodeState = useCallback((): string => {
    const params = new URLSearchParams();
    params.set('yr', `${yearRange[0]}-${yearRange[1]}`);
    params.set('cpc', Array.from(cpcSections).sort().join(''));
    if (minCitations > 0) params.set('mc', String(minCitations));
    if (searchQuery) params.set('q', searchQuery);
    if (selectedPatentIndex !== null) params.set('sel', String(selectedPatentIndex));
    return params.toString();
  }, [yearRange, cpcSections, minCitations, searchQuery, selectedPatentIndex]);

  const getShareUrl = useCallback((): string => {
    const base = window.location.origin + window.location.pathname;
    return `${base}#${encodeState()}`;
  }, [encodeState]);

  const copyShareUrl = useCallback(async (): Promise<boolean> => {
    const url = getShareUrl();
    // Update current URL hash silently
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
