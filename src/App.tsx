import { useState, useCallback, useMemo } from 'react';
import Galaxy from './components/Galaxy';
import HoverCard from './components/HoverCard';
import InfoPanel from './components/InfoPanel';
import SearchPanel from './components/SearchPanel';
import TimeSlider from './components/TimeSlider';
import FilterPanel from './components/FilterPanel';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import PathTracerPanel from './components/PathTracerPanel';
import ShareButton from './components/ShareButton';
import ProjectSelector from './components/ProjectSelector';
import { ProjectProvider } from './config/ProjectContext';
import { patentConfig } from './config/patents';
import { paperConfig } from './config/papers';
import { useProjectData } from './hooks/usePatentData';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useShareState } from './hooks/useShareState';
import type { ProjectConfig } from './config/types';

const PROJECTS: ProjectConfig[] = [patentConfig, paperConfig];

function AppInner({ config }: { config: ProjectConfig }) {
  const {
    data,
    filters,
    filteredIndices,
    setYearRange,
    setCategories,
    setMinCitations,
    setSearchQuery,
    setSelectedIndex,
    setHoveredIndex,
    isLoading,
    error,
    loadProgress,
    yearBounds,
  } = useProjectData(config);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [citationPath, setCitationPath] = useState<number[] | null>(null);

  useKeyboardNavigation({
    nodes: data?.nodes ?? [],
    filteredIndices,
    selectedIndex: filters.selectedIndex,
    onSelect: setSelectedIndex,
    onHover: setHoveredIndex,
  });

  const { copyShareUrl } = useShareState({
    yearRange: filters.yearRange,
    categories: filters.categories,
    minCitations: filters.minCitations,
    searchQuery: filters.searchQuery,
    selectedIndex: filters.selectedIndex,
    setYearRange,
    setCategories,
    setMinCitations,
    setSearchQuery,
    setSelectedIndex,
    isLoading,
  });

  const hoveredNode = useMemo(() => {
    if (!data || filters.hoveredIndex === null) return null;
    return data.nodes[filters.hoveredIndex] ?? null;
  }, [data, filters.hoveredIndex]);

  const selectedNode = useMemo(() => {
    if (!data || filters.selectedIndex === null) return null;
    return data.nodes[filters.selectedIndex] ?? null;
  }, [data, filters.selectedIndex]);

  const handleToggleCategory = useCallback(
    (category: string) => {
      const next = new Set(filters.categories);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      setCategories(next);
    },
    [filters.categories, setCategories]
  );

  const handleNavigate = useCallback(
    (index: number) => {
      setSelectedIndex(index);
    },
    [setSelectedIndex]
  );

  const yearCounts = useMemo(() => {
    if (!data) return new Map<number, number>();
    const counts = new Map<number, number>();
    for (const node of data.nodes) {
      counts.set(node.year, (counts.get(node.year) ?? 0) + 1);
    }
    return counts;
  }, [data]);

  if (error) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center"
        style={{ background: config.background }}
      >
        <h2 className="text-xl font-light mb-4" style={{ color: '#e0e0f0' }}>
          Failed to load {config.nodeLabel} data
        </h2>
        <p className="text-sm" style={{ color: '#8888aa' }}>{error}</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return <LoadingScreen progress={loadProgress} projectName={config.name} />;
  }

  return (
    <div className="w-full h-full relative">
      {/* 3D Galaxy Scene */}
      <ErrorBoundary>
        <Galaxy
          data={data}
          filters={filters}
          filteredIndices={filteredIndices}
          onHover={setHoveredIndex}
          onClick={setSelectedIndex}
          onMouseMove={setMousePos}
          citationPath={citationPath}
        />
      </ErrorBoundary>

      {/* Search Panel (top-left) */}
      <SearchPanel
        nodes={data.nodes}
        onSelect={handleNavigate}
        onSearch={setSearchQuery}
      />

      {/* Filter Panel (left sidebar) */}
      <FilterPanel
        categories={filters.categories}
        onToggleCategory={handleToggleCategory}
        minCitations={filters.minCitations}
        onMinCitationsChange={setMinCitations}
        totalCount={data.nodes.length}
        filteredCount={filteredIndices.length}
      />

      {/* Hover Card (follows cursor) */}
      <HoverCard node={hoveredNode} mousePosition={mousePos} />

      {/* Empty state hint */}
      {!selectedNode && !hoveredNode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-10 anim-fade-in pointer-events-none max-sm:bottom-14">
          <p className="text-xs px-4 py-2 rounded-full text-center" style={{
            color: 'var(--text-muted)',
            background: 'rgba(10, 10, 20, 0.6)',
            border: '1px solid var(--border-color)',
          }}>
            <span className="sm:hidden">Tap a star to explore &middot; Pinch to zoom</span>
            <span className="hidden sm:inline">Click a star to explore &middot; Tab to cycle &middot; Arrow keys to navigate</span>
          </p>
        </div>
      )}

      {/* Info Panel (right sidebar, on click) */}
      <InfoPanel
        node={selectedNode}
        allNodes={data.nodes}
        edges={data.edges}
        nodeIndex={filters.selectedIndex}
        onClose={() => setSelectedIndex(null)}
        onNavigate={handleNavigate}
      />

      {/* Citation Path Tracer */}
      <PathTracerPanel
        nodes={data.nodes}
        edges={data.edges}
        selectedIndex={filters.selectedIndex}
        onPathChange={setCitationPath}
        onNavigate={handleNavigate}
      />

      {/* Time Slider (bottom) */}
      <TimeSlider
        yearRange={filters.yearRange}
        minYear={yearBounds.min}
        maxYear={yearBounds.max}
        onChange={setYearRange}
        yearCounts={yearCounts}
      />

      {/* Legend / Title — hidden on small screens to avoid overlap with search */}
      <div className="fixed top-4 right-4 z-20 anim-fade-in hidden sm:block">
        <div className="glass-panel px-4 py-3 text-right flex items-center gap-4">
          <div>
            <h1 className="text-base font-light tracking-wider" style={{ color: 'var(--text-primary)' }}>
              {config.name}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {filteredIndices.length.toLocaleString()} {config.nodeLabelPlural} visible
            </p>
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border-color)' }} />
          <ShareButton onCopy={copyShareUrl} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeProject, setActiveProject] = useState<ProjectConfig>(patentConfig);

  return (
    <ProjectProvider config={activeProject}>
      <ProjectSelector
        projects={PROJECTS}
        activeId={activeProject.id}
        onSelect={(id) => {
          const project = PROJECTS.find(p => p.id === id);
          if (project) setActiveProject(project);
        }}
      />
      <AppInner config={activeProject} />
    </ProjectProvider>
  );
}
