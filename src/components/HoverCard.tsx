import type { PatentNode } from '../types/patent';
import { formatPatentId, formatDate } from '../utils/formatters';
import { CPC_SECTION_NAMES } from '../utils/colors';

interface HoverCardProps {
  node: PatentNode | null;
  mousePosition: { x: number; y: number };
}

/**
 * Floating tooltip that follows the cursor, showing patent details on hover.
 */
export default function HoverCard({ node, mousePosition }: HoverCardProps) {
  if (!node) return null;

  const sectionName = CPC_SECTION_NAMES[node.cpcSection] ?? node.cpcSection;

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: mousePosition.x + 16,
        top: mousePosition.y - 10,
        maxWidth: 340,
      }}
    >
      <div
        className="rounded-lg px-4 py-3 text-left text-sm shadow-xl"
        style={{
          background: 'rgba(15, 15, 30, 0.95)',
          border: '1px solid rgba(100, 100, 180, 0.3)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="mb-1 text-xs font-mono" style={{ color: node.color }}>
          {formatPatentId(node.id)}
        </div>
        <div className="mb-2 font-medium leading-snug" style={{ color: '#e0e0f0' }}>
          {node.title}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: '#8888aa' }}>
          <span>{formatDate(node.year, node.month)}</span>
          <span>{node.assignee}</span>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span
            className="rounded-full px-2 py-0.5"
            style={{
              background: `${node.color}22`,
              color: node.color,
              border: `1px solid ${node.color}44`,
            }}
          >
            {node.cpcSection} - {sectionName}
          </span>
          <span style={{ color: '#8888aa' }}>
            {node.citationCount} citation{node.citationCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
