import type { ProjectConfig } from '../config/types';

interface ProjectSelectorProps {
  projects: ProjectConfig[];
  activeId: string;
  onSelect: (id: string) => void;
}

export default function ProjectSelector({ projects, activeId, onSelect }: ProjectSelectorProps) {
  return (
    <div
      className="fixed z-40 left-1/2 -translate-x-1/2 flex items-center"
      style={{
        top: 12,
        padding: 3,
        background: 'rgba(12, 12, 28, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(80, 80, 140, 0.2)',
        borderRadius: 24,
        gap: 3,
      }}
    >
      {projects.map((project) => {
        const isActive = project.id === activeId;
        const label = project.id === 'patents' ? 'Patents' : 'Papers';

        return (
          <button
            key={project.id}
            onClick={() => onSelect(project.id)}
            style={{
              padding: '6px 20px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 500,
              background: isActive ? 'rgba(68, 136, 255, 0.18)' : 'transparent',
              color: isActive ? '#c8d8ff' : 'rgba(140, 140, 170, 0.5)',
              border: isActive ? '1px solid rgba(68, 136, 255, 0.25)' : '1px solid transparent',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
