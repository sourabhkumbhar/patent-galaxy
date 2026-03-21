import { useState } from 'react';
import { CPC_COLORS, CPC_SECTION_NAMES } from '../utils/colors';

interface FilterPanelProps {
  cpcSections: Set<string>;
  onToggleSection: (section: string) => void;
  minCitations: number;
  onMinCitationsChange: (min: number) => void;
  totalCount: number;
  filteredCount: number;
}

/**
 * Collapsible left sidebar with CPC section toggles and citation filters.
 */
export default function FilterPanel({
  cpcSections,
  onToggleSection,
  minCitations,
  onMinCitationsChange,
  totalCount,
  filteredCount,
}: FilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className="fixed left-4 top-20 z-30 transition-all"
      style={{ width: isCollapsed ? 'auto' : 240 }}
    >
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'rgba(15, 15, 30, 0.9)',
          border: '1px solid rgba(100, 100, 180, 0.2)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-controls="filter-panel-content"
          className="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-white/5"
          style={{ color: '#e0e0f0' }}
        >
          <span className="font-medium">Filters</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              color: '#8888aa',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {!isCollapsed && (
          <div id="filter-panel-content" className="px-4 pb-4 space-y-4">
            {/* Stats */}
            <div className="text-xs" style={{ color: '#8888aa' }}>
              Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} patents
            </div>

            {/* CPC Section toggles */}
            <div>
              <div className="text-xs mb-2 font-medium" style={{ color: '#8888aa' }}>
                CPC Sections
              </div>
              <div className="space-y-1">
                {Object.entries(CPC_COLORS).map(([section, color]) => {
                  const isActive = cpcSections.has(section);
                  return (
                    <button
                      key={section}
                      onClick={() => onToggleSection(section)}
                      role="checkbox"
                      aria-checked={isActive}
                      aria-label={`${CPC_SECTION_NAMES[section]} (${section})`}
                      className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-white/5"
                      style={{
                        color: isActive ? '#c0c0d0' : '#555566',
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-sm shrink-0 transition-opacity"
                        style={{
                          background: color,
                          opacity: isActive ? 1 : 0.2,
                        }}
                      />
                      <span className="font-mono w-4">{section}</span>
                      <span className="truncate">
                        {CPC_SECTION_NAMES[section]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Citation filter */}
            <div>
              <div className="text-xs mb-2 font-medium" style={{ color: '#8888aa' }}>
                Min Citations: {minCitations}
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={minCitations}
                aria-label={`Minimum citations: ${minCitations}`}
                onChange={(e) => onMinCitationsChange(parseInt(e.target.value, 10))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgba(68, 136, 255, 0.6) ${(minCitations / 50) * 100}%, rgba(100, 100, 180, 0.2) ${(minCitations / 50) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: '#666677' }}>
                <span>0</span>
                <span>50+</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
