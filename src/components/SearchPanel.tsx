import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { PatentNode } from '../types/patent';
import { formatPatentId } from '../utils/formatters';

const MAX_RESULTS = 12;

interface SearchPanelProps {
  nodes: PatentNode[];
  onSelect: (index: number) => void;
  onSearch: (query: string) => void;
}

/**
 * Search panel in the top-left that allows searching patents by keyword,
 * inventor, or company name. Shows matching results with click-to-navigate.
 */
export default function SearchPanel({ nodes, onSelect, onSearch }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const { results, totalMatches } = useMemo(() => {
    if (query.length < 2) return { results: [], totalMatches: 0 };
    const q = query.toLowerCase();
    const matches: { index: number; node: PatentNode }[] = [];
    let total = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (
        n.title.toLowerCase().includes(q) ||
        n.assignee.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q)
      ) {
        total++;
        if (matches.length < MAX_RESULTS) {
          matches.push({ index: i, node: n });
        }
      }
    }
    return { results: matches, totalMatches: total };
  }, [query, nodes]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onSearch(val), 250);
    },
    [onSearch]
  );

  const handleSelect = useCallback(
    (index: number) => {
      onSelect(index);
      setIsFocused(false);
    },
    [onSelect]
  );

  return (
    <div className="fixed top-4 left-4 z-30 w-80">
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'rgba(15, 15, 30, 0.9)',
          border: '1px solid rgba(100, 100, 180, 0.2)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: '#8888aa', flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search patents, companies..."
            aria-label="Search patents"
            aria-autocomplete="list"
            aria-expanded={isFocused && results.length > 0}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: '#e0e0f0' }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); onSearch(''); }}
              className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-white/10"
              style={{ color: '#8888aa' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {isFocused && results.length > 0 && (
          <div
            className="max-h-72 overflow-y-auto"
            style={{ borderTop: '1px solid rgba(100, 100, 180, 0.15)' }}
          >
            {results.map(({ index, node }) => (
              <button
                key={index}
                onMouseDown={() => handleSelect(index)}
                className="w-full text-left px-4 py-2.5 transition-colors hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: node.color }}
                  />
                  <span className="text-xs font-mono truncate" style={{ color: node.color }}>
                    {formatPatentId(node.id)}
                  </span>
                </div>
                <div className="text-sm truncate mt-0.5" style={{ color: '#c0c0d0' }}>
                  {node.title}
                </div>
                <div className="text-xs truncate mt-0.5" style={{ color: '#8888aa' }}>
                  {node.assignee}
                </div>
              </button>
            ))}
          </div>
        )}

        {isFocused && results.length > 0 && totalMatches > MAX_RESULTS && (
          <div
            className="px-4 py-2 text-xs"
            style={{
              color: '#8888aa',
              borderTop: '1px solid rgba(100, 100, 180, 0.1)',
            }}
          >
            Showing {MAX_RESULTS} of {totalMatches.toLocaleString()} matches
          </div>
        )}

        {isFocused && query.length >= 2 && results.length === 0 && (
          <div
            className="px-4 py-3 text-xs"
            style={{
              color: '#8888aa',
              borderTop: '1px solid rgba(100, 100, 180, 0.15)',
            }}
          >
            No patents found matching "{query}"
          </div>
        )}
      </div>
    </div>
  );
}
