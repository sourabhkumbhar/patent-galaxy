import { useState, useMemo, useCallback } from 'react';
import type { DataNode, Edge } from '../types/patent';
import { useProject } from '../config/ProjectContext';
import { findCitationPath } from '../utils/citationPath';

interface PathTracerPanelProps {
  nodes: DataNode[];
  edges: Edge[];
  selectedIndex: number | null;
  onPathChange: (path: number[] | null) => void;
  onNavigate: (index: number) => void;
}

export default function PathTracerPanel({
  nodes,
  edges,
  selectedIndex,
  onPathChange,
  onNavigate,
}: PathTracerPanelProps) {
  const config = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);

  const path = useMemo(() => {
    if (startIndex === null || endIndex === null) return null;
    return findCitationPath(edges, startIndex, endIndex);
  }, [edges, startIndex, endIndex]);

  const prevPathRef = useMemo(() => {
    onPathChange(isOpen ? path : null);
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, isOpen]);
  void prevPathRef;

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onPathChange(null);
  }, [onPathChange]);

  const handleClear = useCallback(() => {
    setStartIndex(null);
    setEndIndex(null);
    onPathChange(null);
  }, [onPathChange]);

  // Closed state
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 z-30 flex items-center gap-3
          hover:scale-[1.02] active:scale-[0.98] transition-transform"
        style={{
          bottom: 80,
          padding: '14px 20px',
          background: 'rgba(12, 12, 28, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(238, 187, 51, 0.2)',
          borderRadius: 16,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eebb33" strokeWidth="2" strokeLinecap="round">
          <circle cx="5" cy="12" r="2.5" />
          <circle cx="19" cy="12" r="2.5" />
          <path d="M7.5 12h9" strokeDasharray="3 2" />
        </svg>
        <span className="text-[15px] font-medium" style={{ color: '#eebb33' }}>Path Tracer</span>
      </button>
    );
  }

  return (
    <div
      className="fixed left-4 right-4 sm:right-auto z-30"
      style={{
        bottom: 80,
        maxWidth: 440,
        background: 'rgba(12, 12, 28, 0.95)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(238, 187, 51, 0.15)',
        borderRadius: 20,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: '18px 24px 14px 24px' }}>
        <div className="flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eebb33" strokeWidth="2" strokeLinecap="round">
            <circle cx="5" cy="12" r="2.5" />
            <circle cx="19" cy="12" r="2.5" />
            <path d="M7.5 12h9" strokeDasharray="3 2" />
          </svg>
          <span className="text-[15px] font-medium" style={{ color: '#eebb33' }}>Path Tracer</span>
        </div>
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '0 24px 24px 24px', borderTop: '1px solid rgba(80, 80, 140, 0.1)' }}>
        {/* From / To — inline search built into each slot */}
        <div className="flex items-start gap-4" style={{ paddingTop: 20 }}>
          <Slot
            label="From"
            node={startIndex !== null ? nodes[startIndex] : null}
            nodes={nodes}
            formatId={config.formatNodeId}
            onSelect={(idx) => setStartIndex(idx)}
            onUseSelected={selectedIndex !== null ? () => setStartIndex(selectedIndex) : undefined}
            accent="#22ccdd"
          />

          <div className="flex items-center pt-8 px-1 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#55557a" strokeWidth="2" strokeLinecap="round">
              <path d="M5 12h14" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
          </div>

          <Slot
            label="To"
            node={endIndex !== null ? nodes[endIndex] : null}
            nodes={nodes}
            formatId={config.formatNodeId}
            onSelect={(idx) => setEndIndex(idx)}
            onUseSelected={selectedIndex !== null ? () => setEndIndex(selectedIndex) : undefined}
            accent="#ff6688"
          />
        </div>

        {/* Result */}
        {startIndex !== null && endIndex !== null && (
          <div style={{
            background: path ? 'rgba(238, 187, 51, 0.05)' : 'rgba(255, 80, 80, 0.05)',
            border: `1px solid ${path ? 'rgba(238, 187, 51, 0.15)' : 'rgba(255, 80, 80, 0.15)'}`,
            borderRadius: 14,
            marginTop: 16,
          }}>
            {path ? (
              <div style={{ padding: 16 }}>
                <div className="text-sm font-medium" style={{ color: '#eebb33', marginBottom: 12 }}>
                  {path.length - 1} step{path.length - 1 !== 1 ? 's' : ''} apart
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {path.map((nodeIdx, i) => (
                    <button key={nodeIdx} onClick={() => onNavigate(nodeIdx)}
                      className="flex items-center gap-3 w-full text-left rounded-xl hover:bg-white/[0.04] transition-colors"
                      style={{ padding: '10px 12px' }}>
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{
                          background: i === 0 || i === path.length - 1 ? 'rgba(238,187,51,0.2)' : 'rgba(80,80,140,0.12)',
                          color: i === 0 || i === path.length - 1 ? '#eebb33' : '#777',
                        }}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-mono" style={{ color: nodes[nodeIdx].color }}>
                          {config.formatNodeId(nodes[nodeIdx].id)}
                        </span>
                        <div className="text-xs truncate mt-0.5" style={{ color: '#999' }}>{nodes[nodeIdx].title}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: 16, fontSize: 14, color: '#ff6666' }}>
                No path found within 10 steps
              </div>
            )}
          </div>
        )}

        {(startIndex !== null || endIndex !== null) && (
          <button onClick={handleClear}
            className="w-full text-center text-sm rounded-xl hover:bg-white/[0.04] transition-colors"
            style={{ color: '#55557a', marginTop: 12, padding: '10px 0' }}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A single From/To slot with inline search.
 * Empty state shows a search input directly inside the slot.
 * Filled state shows the selected node.
 */
function Slot({
  label, node, nodes, formatId, onSelect, onUseSelected, accent,
}: {
  label: string;
  node: DataNode | null;
  nodes: DataNode[];
  formatId: (id: string) => string;
  onSelect: (index: number) => void;
  onUseSelected?: () => void;
  accent: string;
}) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    const matches: { index: number; node: DataNode }[] = [];
    for (let i = 0; i < nodes.length && matches.length < 5; i++) {
      const n = nodes[i];
      if (n.title.toLowerCase().includes(q) || n.creator.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)) {
        matches.push({ index: i, node: n });
      }
    }
    return matches;
  }, [query, nodes]);

  const handleSelect = useCallback((idx: number) => {
    onSelect(idx);
    setQuery('');
    setIsFocused(false);
  }, [onSelect]);

  // If node is selected, show it
  if (node) {
    return (
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: accent, marginBottom: 8 }}>{label}</div>
        <div
          className="rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors"
          style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${accent}25` }}
          onClick={() => { onSelect(-1); /* reset to allow re-search */ }}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: node.color, boxShadow: `0 0 6px ${node.color}44` }} />
            <span className="text-sm font-mono truncate" style={{ color: node.color }}>{formatId(node.id)}</span>
          </div>
          <div className="text-sm truncate mt-1.5" style={{ color: '#999', paddingLeft: 18 }}>{node.title}</div>
        </div>
      </div>
    );
  }

  // Empty state — the slot IS the search input
  return (
    <div className="flex-1 min-w-0 relative">
      <div className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: accent, marginBottom: 8 }}>{label}</div>

      {/* Search input inside the slot */}
      <div
        className="rounded-xl flex items-center gap-2"
        style={{
          padding: '10px 14px',
          border: `1px solid ${isFocused ? `${accent}50` : `${accent}25`}`,
          background: isFocused ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" className="shrink-0" style={{ opacity: 0.5 }}>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="Search..."
          className="flex-1 bg-transparent outline-none min-w-0"
          style={{ color: '#d0d0e8', fontSize: 14 }}
        />
      </div>

      {/* Dropdown results */}
      {isFocused && results.length > 0 && (
        <div
          className="absolute left-0 overflow-y-auto z-50"
          style={{
            bottom: '100%',
            marginBottom: 4,
            width: 280,
            maxHeight: 240,
            background: 'rgba(12, 12, 28, 0.98)',
            border: '1px solid rgba(80,80,140,0.25)',
            borderRadius: 14,
            padding: '6px 0',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {results.map(({ index, node: n }) => (
            <button key={index} onMouseDown={() => handleSelect(index)}
              className="w-full text-left hover:bg-white/[0.05] transition-colors"
              style={{ padding: '10px 14px' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: n.color }} />
                <span className="text-sm font-mono truncate" style={{ color: n.color }}>{formatId(n.id)}</span>
              </div>
              <div className="text-xs truncate mt-0.5" style={{ color: '#999', paddingLeft: 16 }}>{n.title}</div>
            </button>
          ))}
        </div>
      )}

      {/* Use selected shortcut */}
      {onUseSelected && !isFocused && query.length === 0 && (
        <button onClick={onUseSelected}
          className="w-full rounded-lg hover:bg-white/[0.04] transition-colors text-center"
          style={{ color: accent, fontSize: 12, marginTop: 6, padding: '6px 0', border: `1px solid ${accent}20` }}>
          Use selected
        </button>
      )}
    </div>
  );
}
