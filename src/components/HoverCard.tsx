import type { PatentNode } from '../types/patent';
import { formatPatentId, formatDate } from '../utils/formatters';
import { CPC_SECTION_NAMES } from '../utils/colors';

interface HoverCardProps {
  node: PatentNode | null;
  mousePosition: { x: number; y: number };
}

// Detect touch-primary device once (hover card makes no sense without a pointer)
const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export default function HoverCard({ node, mousePosition }: HoverCardProps) {
  if (!node || isTouchDevice) return null;

  const sectionName = CPC_SECTION_NAMES[node.cpcSection] ?? node.cpcSection;

  return (
    <div
      className="pointer-events-none fixed z-50 anim-fade-in"
      style={{
        left: mousePosition.x + 16,
        top: mousePosition.y - 10,
        maxWidth: 340,
      }}
    >
      <div
        className="rounded-xl px-4 py-3 text-left text-sm"
        style={{
          background: 'var(--bg-panel)',
          border: `1px solid ${node.color}25`,
          backdropFilter: 'blur(24px) saturate(1.3)',
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px ${node.color}10`,
        }}
      >
        {/* Accent line */}
        <div
          className="h-0.5 rounded-full mb-2.5 -mx-4 -mt-3"
          style={{
            background: `linear-gradient(90deg, ${node.color}, transparent)`,
            marginTop: 0,
            marginLeft: -16,
            marginRight: -16,
            borderRadius: '12px 12px 0 0',
          }}
        />

        <div className="mb-1 text-xs font-mono" style={{ color: node.color }}>
          {formatPatentId(node.id)}
        </div>
        <div className="mb-2 font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
          {node.title}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>{formatDate(node.year, node.month)}</span>
          <span>{node.assignee}</span>
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-xs">
          <span
            className="rounded-full px-2.5 py-0.5"
            style={{
              background: `${node.color}10`,
              color: node.color,
              border: `1px solid ${node.color}20`,
            }}
          >
            {node.cpcSection} - {sectionName}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            {node.citationCount} citation{node.citationCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
