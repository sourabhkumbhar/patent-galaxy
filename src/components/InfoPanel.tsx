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

/**
 * Right sidebar panel showing full details for a selected patent,
 * including citation links that can be clicked to navigate.
 */
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

  // Find citations: patents this one cites, and patents that cite this one
  const citesSources: number[] = [];
  const citedBy: number[] = [];

  for (const edge of edges) {
    if (edge.source === nodeIndex) {
      citesSources.push(edge.target);
    }
    if (edge.target === nodeIndex) {
      citedBy.push(edge.source);
    }
  }

  return (
    <div
      className="fixed right-0 top-0 h-full w-96 z-40 overflow-y-auto"
      style={{
        background: 'rgba(10, 10, 20, 0.97)',
        borderLeft: '1px solid rgba(100, 100, 180, 0.2)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between px-5 py-4"
        style={{ background: 'rgba(10, 10, 20, 0.98)', borderBottom: '1px solid rgba(100, 100, 180, 0.15)' }}
      >
        <span className="text-xs font-mono" style={{ color: node.color }}>
          {formatPatentId(node.id)}
        </span>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-sm transition-colors hover:bg-white/10"
          style={{ color: '#8888aa' }}
        >
          Close
        </button>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Title */}
        <h2 className="text-lg font-semibold leading-snug" style={{ color: '#e0e0f0' }}>
          {node.title}
        </h2>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <MetaItem label="Grant Date" value={formatDate(node.year, node.month)} />
          <MetaItem label="Assignee" value={node.assignee} />
          <MetaItem label="Inventors" value={`${node.inventorCount} inventor${node.inventorCount !== 1 ? 's' : ''}`} />
          <MetaItem label="Citations" value={node.citationCount.toString()} />
        </div>

        {/* CPC Classification */}
        <div>
          <div className="text-xs mb-2" style={{ color: '#8888aa' }}>Classification</div>
          <div
            className="inline-flex rounded-full px-3 py-1 text-sm"
            style={{
              background: `${node.color}15`,
              color: node.color,
              border: `1px solid ${node.color}33`,
            }}
          >
            {node.cpcSection} - {sectionName}
          </div>
          <div className="mt-1 text-xs" style={{ color: '#8888aa' }}>
            {node.cpcClass} / {node.cpcSubclass}
          </div>
        </div>

        {/* External Link */}
        <a
          href={patentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors"
          style={{
            background: 'rgba(68, 136, 255, 0.15)',
            color: '#4488ff',
            border: '1px solid rgba(68, 136, 255, 0.3)',
          }}
        >
          View on Google Patents
          <span className="text-xs">&#8599;</span>
        </a>

        {/* Citations - cites */}
        {citesSources.length > 0 && (
          <div>
            <div className="text-xs mb-2" style={{ color: '#8888aa' }}>
              Cites ({citesSources.length})
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {citesSources.slice(0, 20).map((idx) => (
                <CitationLink
                  key={idx}
                  node={allNodes[idx]}
                  onClick={() => onNavigate(idx)}
                />
              ))}
              {citesSources.length > 20 && (
                <div className="text-xs py-1" style={{ color: '#8888aa' }}>
                  and {citesSources.length - 20} more...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Citations - cited by */}
        {citedBy.length > 0 && (
          <div>
            <div className="text-xs mb-2" style={{ color: '#8888aa' }}>
              Cited By ({citedBy.length})
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {citedBy.slice(0, 20).map((idx) => (
                <CitationLink
                  key={idx}
                  node={allNodes[idx]}
                  onClick={() => onNavigate(idx)}
                />
              ))}
              {citedBy.length > 20 && (
                <div className="text-xs py-1" style={{ color: '#8888aa' }}>
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
      <div className="text-xs" style={{ color: '#8888aa' }}>{label}</div>
      <div className="text-sm" style={{ color: '#c0c0d0' }}>{value}</div>
    </div>
  );
}

function CitationLink({ node, onClick }: { node: PatentNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded px-3 py-2 text-xs transition-colors hover:bg-white/5"
      style={{ color: '#c0c0d0' }}
    >
      <div className="font-mono text-xs" style={{ color: node.color }}>
        {formatPatentId(node.id)}
      </div>
      <div className="truncate mt-0.5">{node.title}</div>
    </button>
  );
}
