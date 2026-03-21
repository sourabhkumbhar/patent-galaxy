import { useState, useMemo, useCallback } from 'react';
import type { PatentNode, CitationEdge } from '../types/patent';
import { formatPatentId } from '../utils/formatters';
import { findCitationPath } from '../utils/citationPath';

interface PathTracerPanelProps {
  nodes: PatentNode[];
  edges: CitationEdge[];
  selectedIndex: number | null;
  onPathChange: (path: number[] | null) => void;
  onNavigate: (index: number) => void;
}

/**
 * Panel for finding and visualizing the shortest citation path
 * between two patents ("6 degrees of separation").
 */
export default function PathTracerPanel({
  nodes,
  edges,
  selectedIndex,
  onPathChange,
  onNavigate,
}: PathTracerPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingTarget, setSettingTarget] = useState<'start' | 'end' | null>(null);

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const matches: { index: number; node: PatentNode }[] = [];
    for (let i = 0; i < nodes.length && matches.length < 8; i++) {
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
  }, [searchQuery, nodes]);

  const path = useMemo(() => {
    if (startIndex === null || endIndex === null) return null;
    return findCitationPath(edges, startIndex, endIndex);
  }, [edges, startIndex, endIndex]);

  // Propagate path to parent
  const prevPathRef = useMemo(() => {
    onPathChange(isOpen ? path : null);
    return path;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, isOpen]);
  void prevPathRef; // suppress unused warning

  const handleSetFromSelected = useCallback(
    (target: 'start' | 'end') => {
      if (selectedIndex === null) return;
      if (target === 'start') {
        setStartIndex(selectedIndex);
      } else {
        setEndIndex(selectedIndex);
      }
    },
    [selectedIndex]
  );

  const handleSearchSelect = useCallback(
    (index: number) => {
      if (settingTarget === 'start') {
        setStartIndex(index);
      } else if (settingTarget === 'end') {
        setEndIndex(index);
      }
      setSettingTarget(null);
      setSearchQuery('');
    },
    [settingTarget]
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onPathChange(null);
  }, [onPathChange]);

  const handleClear = useCallback(() => {
    setStartIndex(null);
    setEndIndex(null);
    onPathChange(null);
  }, [onPathChange]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open citation path tracer"
        className="fixed bottom-16 left-4 z-30 rounded-lg px-3 py-2 text-xs transition-colors hover:bg-white/10"
        style={{
          background: 'rgba(15, 15, 30, 0.9)',
          border: '1px solid rgba(100, 100, 180, 0.2)',
          color: '#8888aa',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="5" cy="12" r="3" />
            <circle cx="19" cy="12" r="3" />
            <line x1="8" y1="12" x2="16" y2="12" strokeDasharray="2 2" />
          </svg>
          Path Tracer
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-16 left-4 z-30 w-80 rounded-lg overflow-hidden"
      style={{
        background: 'rgba(15, 15, 30, 0.95)',
        border: '1px solid rgba(100, 100, 180, 0.2)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium" style={{ color: '#e0e0f0' }}>
          Citation Path Tracer
        </span>
        <button
          onClick={handleClose}
          aria-label="Close path tracer"
          className="text-xs px-1.5 py-0.5 rounded transition-colors hover:bg-white/10"
          style={{ color: '#8888aa' }}
        >
          Close
        </button>
      </div>

      <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(100, 100, 180, 0.15)' }}>
        {/* Start patent */}
        <PatentSlot
          label="From"
          node={startIndex !== null ? nodes[startIndex] : null}
          onClickSearch={() => { setSettingTarget('start'); setSearchQuery(''); }}
          onUseSelected={() => handleSetFromSelected('start')}
          hasSelected={selectedIndex !== null}
          onNavigate={startIndex !== null ? () => onNavigate(startIndex) : undefined}
        />

        {/* Arrow */}
        <div className="flex justify-center" style={{ color: '#555566' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </div>

        {/* End patent */}
        <PatentSlot
          label="To"
          node={endIndex !== null ? nodes[endIndex] : null}
          onClickSearch={() => { setSettingTarget('end'); setSearchQuery(''); }}
          onUseSelected={() => handleSetFromSelected('end')}
          hasSelected={selectedIndex !== null}
          onNavigate={endIndex !== null ? () => onNavigate(endIndex) : undefined}
        />

        {/* Search overlay for setting a target */}
        {settingTarget !== null && (
          <div className="space-y-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search patent for "${settingTarget}" endpoint...`}
              autoFocus
              className="w-full bg-transparent text-sm outline-none px-3 py-2 rounded"
              style={{
                color: '#e0e0f0',
                border: '1px solid rgba(100, 100, 180, 0.3)',
              }}
            />
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {searchResults.map(({ index, node }) => (
                  <button
                    key={index}
                    onClick={() => handleSearchSelect(index)}
                    className="w-full text-left px-3 py-1.5 text-xs rounded transition-colors hover:bg-white/5"
                    style={{ color: '#c0c0d0' }}
                  >
                    <span className="font-mono" style={{ color: node.color }}>
                      {formatPatentId(node.id)}
                    </span>
                    <span className="ml-2 truncate">{node.title}</span>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setSettingTarget(null)}
              className="text-xs px-2 py-1 rounded transition-colors hover:bg-white/10"
              style={{ color: '#8888aa' }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Result */}
        {startIndex !== null && endIndex !== null && (
          <div
            className="rounded px-3 py-2 text-sm"
            style={{
              background: path ? 'rgba(255, 221, 68, 0.08)' : 'rgba(255, 68, 68, 0.08)',
              border: `1px solid ${path ? 'rgba(255, 221, 68, 0.2)' : 'rgba(255, 68, 68, 0.2)'}`,
            }}
          >
            {path ? (
              <>
                <div style={{ color: '#ffdd44' }}>
                  Path found: {path.length - 1} step{path.length - 1 !== 1 ? 's' : ''}
                </div>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {path.map((nodeIdx, i) => (
                    <button
                      key={nodeIdx}
                      onClick={() => onNavigate(nodeIdx)}
                      className="flex items-center gap-2 text-xs w-full text-left rounded px-1 py-0.5 hover:bg-white/5 transition-colors"
                      style={{ color: '#c0c0d0' }}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-xs shrink-0"
                        style={{
                          background: i === 0 || i === path.length - 1
                            ? 'rgba(255, 221, 68, 0.3)'
                            : 'rgba(100, 100, 180, 0.2)',
                          color: '#ffdd44',
                          fontSize: 10,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="font-mono" style={{ color: nodes[nodeIdx].color }}>
                        {formatPatentId(nodes[nodeIdx].id)}
                      </span>
                      <span className="truncate">{nodes[nodeIdx].title}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: '#ff6666' }}>
                No citation path found within 10 steps
              </div>
            )}
          </div>
        )}

        {/* Clear */}
        {(startIndex !== null || endIndex !== null) && (
          <button
            onClick={handleClear}
            className="text-xs px-2 py-1 rounded transition-colors hover:bg-white/10"
            style={{ color: '#8888aa' }}
          >
            Clear endpoints
          </button>
        )}
      </div>
    </div>
  );
}

function PatentSlot({
  label,
  node,
  onClickSearch,
  onUseSelected,
  hasSelected,
  onNavigate,
}: {
  label: string;
  node: PatentNode | null;
  onClickSearch: () => void;
  onUseSelected: () => void;
  hasSelected: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <div className="text-xs mb-1" style={{ color: '#8888aa' }}>{label}</div>
      {node ? (
        <div
          className="rounded px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-white/5 transition-colors"
          style={{
            background: 'rgba(100, 100, 180, 0.08)',
            border: '1px solid rgba(100, 100, 180, 0.15)',
          }}
          onClick={onNavigate}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: node.color }} />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono" style={{ color: node.color }}>
              {formatPatentId(node.id)}
            </div>
            <div className="text-xs truncate" style={{ color: '#c0c0d0' }}>
              {node.title}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onClickSearch}
            className="flex-1 rounded px-3 py-2 text-xs transition-colors hover:bg-white/5"
            style={{
              color: '#8888aa',
              border: '1px dashed rgba(100, 100, 180, 0.3)',
            }}
          >
            Search...
          </button>
          {hasSelected && (
            <button
              onClick={onUseSelected}
              className="rounded px-3 py-2 text-xs transition-colors hover:bg-white/5"
              style={{
                color: '#4488ff',
                border: '1px solid rgba(68, 136, 255, 0.3)',
              }}
            >
              Use selected
            </button>
          )}
        </div>
      )}
    </div>
  );
}
