import { useState } from 'react';
import { useProject } from '../config/ProjectContext';

interface FilterPanelProps {
  categories: Set<string>;
  onToggleCategory: (category: string) => void;
  minCitations: number;
  onMinCitationsChange: (min: number) => void;
  totalCount: number;
  filteredCount: number;
}

export default function FilterPanel({
  categories,
  onToggleCategory,
  minCitations,
  onMinCitationsChange,
  totalCount,
  filteredCount,
}: FilterPanelProps) {
  const config = useProject();
  const [isCollapsed, setIsCollapsed] = useState(
    typeof window !== 'undefined' && window.innerWidth < 640
  );
  const filterPct = totalCount > 0 ? Math.round((filteredCount / totalCount) * 100) : 100;

  return (
    <div
      className="fixed left-4 right-4 sm:right-auto top-20 sm:top-24 z-30 anim-slide-left"
      style={{ width: isCollapsed ? 'auto' : undefined, maxWidth: isCollapsed ? undefined : 240, animationDelay: '0.05s' }}
    >
      <div className="glass-panel glass-panel-inner-glow overflow-hidden hover-glow">
        {/* Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-controls="filter-panel-content"
          className="w-full flex items-center justify-between px-4 py-3 text-sm btn-interactive"
          style={{ color: 'var(--text-primary)' }}
        >
          <span className="font-medium flex items-center gap-2">
            Filters
            {filteredCount < totalCount && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: 'var(--accent-glow)',
                  color: 'var(--accent)',
                  fontSize: 10,
                }}
              >
                {filterPct}%
              </span>
            )}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              color: 'var(--text-secondary)',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {!isCollapsed && (
          <div id="filter-panel-content" className="px-4 pb-4 space-y-4 anim-expand-down">
            {/* Stats bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <span>{filteredCount.toLocaleString()} {config.nodeLabelPlural}</span>
                <span style={{ color: 'var(--text-muted)' }}>of {totalCount.toLocaleString()}</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'rgba(100, 100, 180, 0.1)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${filterPct}%`,
                    background: 'linear-gradient(90deg, var(--accent), rgba(34, 211, 238, 0.6))',
                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 0 8px rgba(68, 136, 255, 0.3)',
                  }}
                />
              </div>
            </div>

            {/* Category toggles */}
            <div>
              <div className="text-xs mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>
                {config.categoryLabel}
              </div>
              <div className="space-y-0.5">
                {config.categories.map(({ id, label, color }) => {
                  const isActive = categories.has(id);
                  return (
                    <button
                      key={id}
                      onClick={() => onToggleCategory(id)}
                      role="checkbox"
                      aria-checked={isActive}
                      aria-label={`${label} (${id})`}
                      className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs"
                      style={{
                        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                        background: isActive ? `${color}08` : 'transparent',
                        borderLeft: `2px solid ${isActive ? color : 'transparent'}`,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded shrink-0"
                        style={{
                          background: color,
                          opacity: isActive ? 1 : 0.15,
                          boxShadow: isActive ? `0 0 8px ${color}44` : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      />
                      <span className="font-mono w-8 text-left" style={{ color: isActive ? color : 'inherit' }}>{id}</span>
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Citation filter */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium">Min Citations</span>
                <span
                  className="px-1.5 py-0.5 rounded font-mono"
                  style={{
                    background: minCitations > 0 ? 'var(--accent-glow)' : 'transparent',
                    color: minCitations > 0 ? 'var(--accent)' : 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {minCitations}
                </span>
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
                  background: `linear-gradient(to right, var(--accent) ${(minCitations / 50) * 100}%, rgba(100, 100, 180, 0.12) ${(minCitations / 50) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
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
