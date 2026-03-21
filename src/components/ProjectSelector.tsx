import { useState } from 'react';
import type { ProjectConfig } from '../config/types';

interface ProjectSelectorProps {
  projects: ProjectConfig[];
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Minimal floating button that opens a project switcher overlay.
 * Positioned bottom-right, above the minimap.
 */
export default function ProjectSelector({ projects, activeId, onSelect }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const active = projects.find(p => p.id === activeId);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Switch project"
        className="fixed right-4 z-30 glass-panel px-3 py-2 text-xs btn-interactive"
        style={{ bottom: 240, color: 'var(--text-secondary)' }}
      >
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Switch
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(5, 5, 16, 0.85)' }}>
      <div
        className="glass-panel glass-panel-inner-glow p-6 w-full max-w-md mx-4 anim-slide-up"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-light tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Choose Visualization
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close project selector"
            className="text-xs px-2.5 py-1 rounded-md btn-interactive"
            style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          >
            Close
          </button>
        </div>

        <div className="space-y-3">
          {projects.map((project) => {
            const isActive = project.id === activeId;
            return (
              <button
                key={project.id}
                onClick={() => {
                  onSelect(project.id);
                  setIsOpen(false);
                }}
                className="w-full text-left rounded-xl p-4 transition-all"
                style={{
                  background: isActive ? 'rgba(68, 136, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isActive ? 'rgba(68, 136, 255, 0.3)' : 'var(--border-color)'}`,
                  boxShadow: isActive ? '0 0 20px rgba(68, 136, 255, 0.1)' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{
                      background: isActive ? 'rgba(68, 136, 255, 0.15)' : 'rgba(100, 100, 180, 0.08)',
                    }}
                  >
                    {project.id === 'patents' ? '✦' : '◉'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {project.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {project.tagline}
                    </div>
                  </div>
                  {isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: 'rgba(68, 136, 255, 0.15)',
                      color: 'var(--accent)',
                    }}>
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {project.description}
                </p>
                {/* Category color dots */}
                <div className="flex gap-1 mt-3">
                  {project.categories.slice(0, 8).map((cat) => (
                    <div
                      key={cat.id}
                      className="w-2 h-2 rounded-full"
                      title={cat.label}
                      style={{
                        background: cat.color,
                        boxShadow: `0 0 4px ${cat.color}44`,
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {active && (
          <p className="text-xs mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
            Currently viewing: {active.name}
          </p>
        )}
      </div>
    </div>
  );
}
