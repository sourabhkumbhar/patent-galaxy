import { useState, useCallback, useMemo, useEffect, createContext } from 'react';
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
import DemoMode from './components/DemoMode';
import { ProjectProvider } from './config/ProjectContext';
import { patentConfig } from './config/patents';
import { paperConfig } from './config/papers';
import { useProjectData } from './hooks/usePatentData';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useShareState } from './hooks/useShareState';
import type { ProjectConfig } from './config/types';

const PROJECTS: ProjectConfig[] = [patentConfig, paperConfig];

// Cinematic mode context — hides all UI chrome for video recording
export const CinematicContext = createContext(false);

function AppInner({ config }: { config: ProjectConfig }) {
  const [cinematic, setCinematic] = useState(() =>
    new URLSearchParams(window.location.search).get('demo') === 'true'
  );
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

  // Full reset: clear selection immediately, fly camera back, then restore filters
  const handleReset = useCallback(() => {
    // Immediately clear interactive state so camera can fly freely
    setSelectedIndex(null);
    setHoveredIndex(null);
    setCitationPath(null);
    setSearchQuery('');

    // Start camera animation
    window.dispatchEvent(new Event('galaxy:recenter'));

    // Restore filters midway through the camera animation
    setTimeout(() => {
      setCategories(config.allCategoryIds);
      setYearRange([yearBounds.min, yearBounds.max]);
      setMinCitations(0);
    }, 800);
  }, [config.allCategoryIds, yearBounds, setSelectedIndex, setHoveredIndex, setSearchQuery, setCategories, setYearRange, setMinCitations]);

  useEffect(() => {
    const onReset = () => handleReset();
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') handleReset();
    };
    window.addEventListener('galaxy:reset', onReset);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('galaxy:reset', onReset);
      window.removeEventListener('keydown', onKey);
    };
  }, [handleReset]);

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

      {/* ── UI Chrome — hidden in cinematic/demo mode ── */}
      {!cinematic && (
        <>
          <SearchPanel
            nodes={data.nodes}
            onSelect={handleNavigate}
            onSearch={setSearchQuery}
          />

          <FilterPanel
            categories={filters.categories}
            onToggleCategory={handleToggleCategory}
            minCitations={filters.minCitations}
            onMinCitationsChange={setMinCitations}
            totalCount={data.nodes.length}
            filteredCount={filteredIndices.length}
          />

          <HoverCard node={hoveredNode} mousePosition={mousePos} />

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

          <InfoPanel
            node={selectedNode}
            allNodes={data.nodes}
            edges={data.edges}
            nodeIndex={filters.selectedIndex}
            onClose={() => setSelectedIndex(null)}
            onNavigate={handleNavigate}
          />

          <PathTracerPanel
            nodes={data.nodes}
            edges={data.edges}
            selectedIndex={filters.selectedIndex}
            onPathChange={setCitationPath}
            onNavigate={handleNavigate}
          />

          <TimeSlider
            yearRange={filters.yearRange}
            minYear={yearBounds.min}
            maxYear={yearBounds.max}
            onChange={setYearRange}
            yearCounts={yearCounts}
          />

          <button
            onClick={() => window.dispatchEvent(new Event('galaxy:reset'))}
            title="Reset view (R)"
            className="fixed z-30 glass-panel hover-glow btn-interactive"
            style={{
              bottom: 240,
              right: 16,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              padding: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </button>

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
        </>
      )}

      {/* Automated demo mode for screen recording */}
      <DemoMode
        data={data}
        filteredIndices={filteredIndices}
        setSelectedIndex={setSelectedIndex}
        setHoveredIndex={setHoveredIndex}
        setCategories={setCategories}
        setCitationPath={setCitationPath}
        allCategoryIds={config.allCategoryIds}
        setCinematic={setCinematic}
      />
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
