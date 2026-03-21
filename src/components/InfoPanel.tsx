import type { PatentNode, CitationEdge } from '../types/patent';
import { formatPatentId, formatDate, getPatentUrl } from '../utils/formatters';
import { CPC_SECTION_NAMES } from '../utils/colors';

interface InfoPanelProps {
  node: PatentNode | null;
  allNodes: PatentNode[];
  edges: CitationEdge[];
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
  if (!node || nodeIndex === null) return null;

  const sectionName = CPC_SECTION_NAMES[node.cpcSection] ?? node.cpcSection;
  const patentUrl = getPatentUrl(node.id);

  const citesSources: number[] = [];
  const citedBy: number[] = [];

  for (const edge of edges) {
    if (edge.source === nodeIndex) citesSources.push(edge.target);
    if (edge.target === nodeIndex) citedBy.push(edge.source);
  }

  const maxCitations = 100;
  const citationBarPct = Math.min(100, (node.citationCount / maxCitations) * 100);

  return (
    <div
      role="complementary"
      aria-label="Patent details"
      className="fixed right-0 top-0 h-full w-96 z-40 overflow-y-auto anim-slide-right"
      style={{
        background: 'var(--bg-panel)',
        borderLeft: '1px solid var(--border-color)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Color accent bar */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${node.color}, ${node.color}44)`,
          boxShadow: `0 2px 12px ${node.color}33`,
        }}
      />

      {/* Header */}
      <div
        className="sticky top-0 flex items-center justify-between px-5 py-4"
        style={{
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-color)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <span className="text-xs font-mono" style={{ color: node.color }}>
          {formatPatentId(node.id)}
        </span>
        <button
          onClick={onClose}
          aria-label="Close patent details panel"
          className="rounded-md px-2.5 py-1 text-xs btn-interactive"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
        >
          Close
        </button>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Title */}
        <h2 className="text-lg font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
          {node.title}
        </h2>

        {/* Metadata grid */}
        <div
          className="grid grid-cols-2 gap-3 text-sm rounded-lg p-3"
          style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}
        >
          <MetaItem label="Grant Date" value={formatDate(node.year, node.month)} />
          <MetaItem label="Assignee" value={node.assignee} />
          <MetaItem label="Inventors" value={`${node.inventorCount} inventor${node.inventorCount !== 1 ? 's' : ''}`} />
          <div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Citations</div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {node.citationCount}
            </div>
            <div className="mt-1 h-1 rounded-full" style={{ background: 'rgba(100, 100, 180, 0.1)' }}>
              <div
                className="citation-bar"
                style={{ width: `${citationBarPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* CPC Classification */}
        <div>
          <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Classification</div>
          <div
            className="inline-flex rounded-full px-3 py-1 text-sm"
            style={{
              background: `${node.color}10`,
              color: node.color,
              border: `1px solid ${node.color}25`,
              boxShadow: `0 0 12px ${node.color}10`,
            }}
          >
            {node.cpcSection} - {sectionName}
          </div>
          <div className="mt-1.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {node.cpcClass} / {node.cpcSubclass}
          </div>
        </div>

        {/* External Link */}
        <a
          href={patentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm btn-interactive"
          style={{
            background: 'var(--accent-glow)',
            color: 'var(--accent)',
            border: '1px solid rgba(68, 136, 255, 0.2)',
          }}
        >
          View on Google Patents
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>

        {/* Citations - cites */}
        {citesSources.length > 0 && (
          <div>
            <div className="text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Cites ({citesSources.length})
            </div>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {citesSources.slice(0, 20).map((idx) => (
                <CitationLink
                  key={idx}
                  node={allNodes[idx]}
                  onClick={() => onNavigate(idx)}
                />
              ))}
              {citesSources.length > 20 && (
                <div className="text-xs py-1.5 px-3" style={{ color: 'var(--text-muted)' }}>
                  and {citesSources.length - 20} more...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Citations - cited by */}
        {citedBy.length > 0 && (
          <div>
            <div className="text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
              Cited By ({citedBy.length})
            </div>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {citedBy.slice(0, 20).map((idx) => (
                <CitationLink
                  key={idx}
                  node={allNodes[idx]}
                  onClick={() => onNavigate(idx)}
                />
              ))}
              {citedBy.length > 20 && (
                <div className="text-xs py-1.5 px-3" style={{ color: 'var(--text-muted)' }}>
                  and {citedBy.length - 20} more...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function CitationLink({ node, onClick }: { node: PatentNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg px-3 py-2 text-xs list-item-hover"
    >
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: node.color, boxShadow: `0 0 4px ${node.color}66` }}
        />
        <span className="font-mono" style={{ color: node.color }}>
          {formatPatentId(node.id)}
        </span>
      </div>
      <div className="truncate mt-0.5" style={{ color: 'var(--text-primary)' }}>{node.title}</div>
    </button>
  );
}
