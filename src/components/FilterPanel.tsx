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
  const [isOpen, setIsOpen] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 640
  );
  const pct = totalCount > 0 ? Math.round((filteredCount / totalCount) * 100) : 100;
  const isFiltered = filteredCount < totalCount;

  return (
    <div className="fixed left-4 z-20" style={{ top: 'calc(3.5rem + 76px)', width: 280 }}>
      <div
        style={{
          background: 'rgba(12, 12, 28, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(80, 80, 140, 0.18)',
          borderRadius: 16,
        }}
      >
        {/* Toggle header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between hover:bg-white/[0.03] transition-colors"
          style={{ padding: '16px 20px', borderRadius: 16 }}
        >
          <span className="flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              style={{ color: isFiltered ? '#6699ff' : '#55557a' }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span className="text-[15px] font-medium" style={{ color: '#d0d0e8' }}>Filters</span>
            {isFiltered && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(68, 136, 255, 0.15)', color: '#6699ff' }}>
                {pct}%
              </span>
            )}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#55557a" strokeWidth="2" strokeLinecap="round"
            style={{ transform: isOpen ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen && (
          <div style={{ padding: '0 20px 20px 20px' }}>
            {/* Count bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs mb-2" style={{ color: '#77779a' }}>
                <span className="tabular-nums">{filteredCount.toLocaleString()} {config.nodeLabelPlural}</span>
                <span className="tabular-nums">of {totalCount.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'rgba(80, 80, 140, 0.12)' }}>
                <div className="h-full rounded-full" style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #4488ff, #22d3ee)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>

            {/* Separator */}
            <div className="mb-4" style={{ height: 1, background: 'rgba(80, 80, 140, 0.1)' }} />

            {/* Categories */}
            <div className="text-[11px] uppercase tracking-widest mb-3 font-medium" style={{ color: '#55557a' }}>
              {config.categoryLabel}
            </div>
            <div className="space-y-0.5 mb-5">
              {config.categories.map(({ id, label, color }) => {
                const on = categories.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => onToggleCategory(id)}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px]
                      hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{
                        background: color,
                        opacity: on ? 1 : 0.18,
                        boxShadow: on ? `0 0 8px ${color}55` : 'none',
                        transition: 'opacity 0.15s, box-shadow 0.15s',
                      }}
                    />
                    <span style={{ color: on ? '#d0d0e8' : '#55557a', transition: 'color 0.15s' }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Separator */}
            <div className="mb-4" style={{ height: 1, background: 'rgba(80, 80, 140, 0.1)' }} />

            {/* Citations slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-widest font-medium" style={{ color: '#55557a' }}>Min Citations</span>
                <span className="text-sm font-mono tabular-nums px-2 py-0.5 rounded-lg" style={{
                  color: minCitations > 0 ? '#6699ff' : '#55557a',
                  background: minCitations > 0 ? 'rgba(68,136,255,0.1)' : 'transparent',
                }}>
                  {minCitations}
                </span>
              </div>
              <input
                type="range" min={0} max={50}
                value={minCitations}
                onChange={(e) => onMinCitationsChange(parseInt(e.target.value, 10))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #4488ff ${(minCitations / 50) * 100}%, rgba(80, 80, 140, 0.12) ${(minCitations / 50) * 100}%)`,
                }}
              />
              <div className="flex justify-between text-[11px] mt-2" style={{ color: '#44445a' }}>
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
