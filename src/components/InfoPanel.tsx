import { useRef, useCallback } from 'react';
import type { DataNode, Edge } from '../types/patent';
import { useProject } from '../config/ProjectContext';
import { formatDate } from '../utils/formatters';

interface InfoPanelProps {
  node: DataNode | null;
  allNodes: DataNode[];
  edges: Edge[];
  nodeIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function InfoPanel({
  node,
  allNodes,
  edges,
  nodeIndex,
  onClose,
  onNavigate,
}: InfoPanelProps) {
  const config = useProject();

  // Swipe-down-to-close on mobile
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (dy > 80) onClose();
  }, [onClose]);

  if (!node || nodeIndex === null) return null;

  const categoryName = config.categoryNames[node.category] ?? node.category;
  const nodeUrl = config.getNodeUrl(node.id);

  const citesSources: number[] = [];
  const citedBy: number[] = [];

  for (const edge of edges) {
    if (edge.source === nodeIndex) citesSources.push(edge.target);
    if (edge.target === nodeIndex) citedBy.push(edge.source);
  }

  const maxCitations = 100;
  const citationBarPct = Math.min(100, (node.citationCount / maxCitations) * 100);

  return (
    <>
      {/* Backdrop overlay on mobile for easy dismiss */}
      <div
        className="fixed inset-0 z-35 sm:hidden"
        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />

      <div
        role="complementary"
        aria-label={`${config.nodeLabel} details`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="fixed z-40 overflow-y-auto
          right-0 top-0 h-full w-[420px]
          max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:h-[75vh] max-sm:w-full max-sm:rounded-t-3xl"
        style={{
          background: 'rgba(8, 8, 24, 0.92)',
          borderLeft: '1px solid rgba(100, 100, 180, 0.15)',
          backdropFilter: 'blur(32px) saturate(1.3)',
          boxShadow: '-12px 0 48px rgba(0, 0, 0, 0.5), 0 0 80px rgba(68, 136, 255, 0.05)',
          animation: 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full" style={{ background: 'rgba(100, 100, 180, 0.4)' }} />
        </div>

        {/* Mobile close hint */}
        <div className="sm:hidden text-center pb-2">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(136, 136, 170, 0.5)' }}>
            Swipe down to close
          </span>
        </div>

        {/* Color accent bar + glow */}
        <div className="max-sm:hidden relative">
          <div
            className="h-1"
            style={{
              background: `linear-gradient(90deg, ${node.color}, ${node.color}66, transparent)`,
            }}
          />
          <div
            className="absolute inset-x-0 h-16 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, ${node.color}15, transparent)`,
            }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: node.color,
                boxShadow: `0 0 12px ${node.color}66`,
              }}
            />
            <span className="text-sm font-mono tracking-wide" style={{ color: node.color }}>
              {config.formatNodeId(node.id)}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label={`Close ${config.nodeLabel} details panel`}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
              hover:bg-white/10 active:scale-90"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(100, 100, 180, 0.2)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: 'var(--text-secondary)' }}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-8 space-y-6">
          {/* Title */}
          <h2
            className="text-xl font-semibold leading-snug"
            style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}
          >
            {node.title}
          </h2>

          {/* Metadata cards */}
          <div className="grid grid-cols-2 gap-3">
            <MetaCard label="Date" value={formatDate(node.year, node.month)} />
            <MetaCard label={config.creatorLabel} value={node.creator} />
            <MetaCard
              label={config.contributorLabel}
              value={`${node.contributorCount} ${config.contributorLabel.toLowerCase()}`}
            />
            <div
              className="rounded-xl p-3"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(100, 100, 180, 0.1)',
              }}
            >
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Citations
              </div>
              <div className="text-lg font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {node.citationCount}
              </div>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(100, 100, 180, 0.1)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${citationBarPct}%`,
                    background: `linear-gradient(90deg, ${node.color}, ${node.color}88)`,
                    boxShadow: `0 0 8px ${node.color}44`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Classification badge */}
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              {config.categoryLabel}
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2"
              style={{
                background: `${node.color}12`,
                border: `1px solid ${node.color}25`,
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: node.color,
                  boxShadow: `0 0 8px ${node.color}66`,
                }}
              />
              <span className="text-sm font-medium" style={{ color: node.color }}>
                {categoryName}
              </span>
            </div>
            <div className="mt-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {node.category} / {node.subcategory} / {node.detail}
            </div>
          </div>

          {/* External Link */}
          <a
            href={nodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-xl px-5 py-3 text-sm font-medium
              transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${node.color}20, ${node.color}10)`,
              color: node.color,
              border: `1px solid ${node.color}30`,
            }}
          >
            {config.nodeUrlLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>

          {/* Citations - Cites */}
          {citesSources.length > 0 && (
            <CitationSection
              title={`Cites (${citesSources.length})`}
              indices={citesSources}
              allNodes={allNodes}
              formatId={config.formatNodeId}
              onNavigate={onNavigate}
            />
          )}

          {/* Citations - Cited By */}
          {citedBy.length > 0 && (
            <CitationSection
              title={`Cited By (${citedBy.length})`}
              indices={citedBy}
              allNodes={allNodes}
              formatId={config.formatNodeId}
              onNavigate={onNavigate}
            />
          )}
        </div>
      </div>
    </>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(100, 100, 180, 0.1)',
      }}
    >
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

function CitationSection({
  title,
  indices,
  allNodes,
  formatId,
  onNavigate,
}: {
  title: string;
  indices: number[];
  allNodes: DataNode[];
  formatId: (id: string) => string;
  onNavigate: (index: number) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-2 font-medium" style={{ color: 'var(--text-muted)' }}>
        {title}
      </div>
      <div
        className="space-y-1 max-h-56 overflow-y-auto rounded-xl p-2"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(100, 100, 180, 0.08)',
        }}
      >
        {indices.slice(0, 20).map((idx) => {
          const n = allNodes[idx];
          return (
            <button
              key={idx}
              onClick={() => onNavigate(idx)}
              className="w-full text-left rounded-lg px-3 py-2.5 transition-all duration-150
                hover:bg-white/5 active:scale-[0.99] group"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0 transition-shadow"
                  style={{
                    background: n.color,
                    boxShadow: `0 0 4px ${n.color}44`,
                  }}
                />
                <span className="text-xs font-mono" style={{ color: n.color }}>
                  {formatId(n.id)}
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              <div className="text-xs truncate mt-1 ml-4.5" style={{ color: 'var(--text-secondary)' }}>
                {n.title}
              </div>
            </button>
          );
        })}
        {indices.length > 20 && (
          <div className="text-xs py-2 px-3 text-center" style={{ color: 'var(--text-muted)' }}>
            and {indices.length - 20} more
          </div>
        )}
      </div>
    </div>
  );
}
