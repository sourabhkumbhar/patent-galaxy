import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { PatentNode } from '../types/patent';
import { formatPatentId } from '../utils/formatters';

const MAX_RESULTS = 12;

interface SearchPanelProps {
  nodes: PatentNode[];
  onSelect: (index: number) => void;
  onSearch: (query: string) => void;
}

export default function SearchPanel({ nodes, onSelect, onSearch }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    <div className="fixed top-4 left-4 z-40 w-80 anim-slide-left">
      <div className="glass-panel glass-panel-inner-glow overflow-hidden hover-glow">
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0"
            style={{ color: isFocused ? 'var(--accent)' : 'var(--text-secondary)', transition: 'color 0.2s' }}
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
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            style={{ color: 'var(--text-primary)' }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); onSearch(''); }}
              className="text-xs px-2 py-0.5 rounded-md btn-interactive"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {isFocused && results.length > 0 && (
          <div
            className="max-h-72 overflow-y-auto anim-expand-down"
            style={{ borderTop: '1px solid var(--border-color)' }}
          >
            {results.map(({ index, node }, i) => (
              <button
                key={index}
                onMouseDown={() => handleSelect(index)}
                className="w-full text-left px-4 py-2.5 list-item-hover"
                style={{ animationDelay: `${i * 20}ms` }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: node.color, boxShadow: `0 0 6px ${node.color}66` }}
                  />
                  <span className="text-xs font-mono truncate" style={{ color: node.color }}>
                    {formatPatentId(node.id)}
                  </span>
                </div>
                <div className="text-sm truncate mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {node.title}
                </div>
                <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
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
              color: 'var(--text-secondary)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            Showing {MAX_RESULTS} of {totalMatches.toLocaleString()} matches
          </div>
        )}

        {isFocused && query.length >= 2 && results.length === 0 && (
          <div
            className="px-4 py-3 text-xs anim-fade-in"
            style={{
              color: 'var(--text-secondary)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            No patents found matching "{query}"
          </div>
        )}
      </div>
    </div>
  );
}
