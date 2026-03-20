import { useState, useCallback, useMemo } from 'react';
import type { PatentNode } from '../types/patent';
import { formatPatentId } from '../utils/formatters';

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

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    const matches: { index: number; node: PatentNode }[] = [];
    for (let i = 0; i < nodes.length && matches.length < 12; i++) {
      const n = nodes[i];
      if (
        n.title.toLowerCase().includes(q) ||
        n.assignee.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q)
      ) {
        matches.push({ index: i, node: n });
      }
    }
    return matches;
  }, [query, nodes]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      onSearch(val);
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
