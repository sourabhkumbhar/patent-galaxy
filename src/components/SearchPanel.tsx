import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { DataNode } from '../types/patent';
import { useProject } from '../config/ProjectContext';

const MAX_RESULTS = 10;

interface SearchPanelProps {
  nodes: DataNode[];
  onSelect: (index: number) => void;
  onSearch: (query: string) => void;
}

export default function SearchPanel({ nodes, onSelect, onSearch }: SearchPanelProps) {
  const config = useProject();
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
    const matches: { index: number; node: DataNode }[] = [];
    let total = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (
        n.title.toLowerCase().includes(q) ||
        n.creator.toLowerCase().includes(q) ||
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

  const showResults = isFocused && results.length > 0;

  return (
    <div className="fixed left-4 right-4 sm:right-auto z-30" style={{ top: 52, maxWidth: 320 }}>
      {/* Search bar */}
      <div
        className="flex items-center gap-3"
        style={{
          padding: '14px 20px',
          background: 'rgba(12, 12, 28, 0.9)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isFocused ? 'rgba(68, 136, 255, 0.35)' : 'rgba(80, 80, 140, 0.18)'}`,
          borderRadius: showResults ? '16px 16px 0 0' : 16,
          transition: 'border-color 0.2s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="shrink-0" style={{ color: isFocused ? '#6699ff' : '#55557a' }}>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={config.searchPlaceholder}
          className="flex-1 bg-transparent outline-none min-w-0"
          style={{ color: '#d0d0e8', fontSize: 16 }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); onSearch(''); }}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Results */}
      {showResults && (
        <div
          className="overflow-y-auto"
          style={{
            maxHeight: 400,
            background: 'rgba(12, 12, 28, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(80, 80, 140, 0.18)',
            borderTop: '1px solid rgba(80, 80, 140, 0.1)',
            borderRadius: '0 0 16px 16px',
            paddingTop: 4,
            paddingBottom: 8,
          }}
        >
          {results.map(({ index, node }) => (
            <button
              key={index}
              onMouseDown={() => handleSelect(index)}
              className="w-full text-left hover:bg-white/[0.04] transition-colors"
              style={{ padding: '12px 20px' }}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: node.color, boxShadow: `0 0 6px ${node.color}44` }} />
                <span className="text-sm font-mono truncate" style={{ color: node.color }}>
                  {config.formatNodeId(node.id)}
                </span>
              </div>
              <div className="text-sm truncate mt-1" style={{ color: '#b0b0c8', paddingLeft: 22 }}>
                {node.title}
              </div>
              <div className="text-xs truncate mt-0.5" style={{ color: '#666680', paddingLeft: 22 }}>
                {node.creator}
              </div>
            </button>
          ))}
          {totalMatches > MAX_RESULTS && (
            <div className="text-xs text-center" style={{ color: '#55557a', padding: '10px 20px' }}>
              {totalMatches.toLocaleString()} total matches
            </div>
          )}
        </div>
      )}

      {isFocused && query.length >= 2 && results.length === 0 && (
        <div
          className="text-sm text-center"
          style={{
            padding: '16px 20px',
            background: 'rgba(12, 12, 28, 0.95)',
            border: '1px solid rgba(80, 80, 140, 0.18)',
            borderTop: 'none',
            borderRadius: '0 0 16px 16px',
            color: '#55557a',
          }}
        >
          No results found
        </div>
      )}
    </div>
  );
}
