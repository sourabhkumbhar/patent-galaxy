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
// ShareButton functionality is now inlined in the right toolbar
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

          {/* ── Bottom-right action buttons ── */}
          <div className="fixed right-4 z-30 flex items-center gap-2" style={{ bottom: 72 }}>
            {/* Share */}
            <button
              onClick={copyShareUrl}
              title="Share this view"
              className="flex items-center gap-2 rounded-full px-4 py-2.5
                transition-all duration-200 hover:scale-[1.03] active:scale-95"
              style={{
                background: 'rgba(8, 8, 24, 0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(100, 100, 180, 0.2)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-secondary)' }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span className="text-xs font-medium hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>Share</span>
            </button>

            {/* Recenter / Reset */}
            <button
              onClick={() => window.dispatchEvent(new Event('galaxy:reset'))}
              title="Reset view (R)"
              className="flex items-center gap-2 rounded-full px-4 py-2.5
                transition-all duration-200 hover:scale-[1.03] active:scale-95"
              style={{
                background: 'rgba(68, 136, 255, 0.12)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(68, 136, 255, 0.25)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 12px rgba(68, 136, 255, 0.08)',
                color: 'var(--accent)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span className="text-xs font-medium">Recenter</span>
            </button>
          </div>

          {/* ── Top-right stats badge ── */}
          <div className="fixed top-16 right-4 z-20 hidden sm:block">
            <div
              className="rounded-2xl px-4 py-3 text-right"
              style={{
                background: 'rgba(8, 8, 24, 0.75)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(100, 100, 180, 0.12)',
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
              }}
            >
              <h1 className="text-sm font-medium tracking-wide" style={{ color: 'var(--text-primary)' }}>
                {config.name}
              </h1>
              <p className="text-xs mt-0.5 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {filteredIndices.length.toLocaleString()} {config.nodeLabelPlural} visible
              </p>
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
  const isDemo = new URLSearchParams(window.location.search).get('demo') === 'true';

  return (
    <ProjectProvider config={activeProject}>
      {!isDemo && (
        <ProjectSelector
          projects={PROJECTS}
          activeId={activeProject.id}
          onSelect={(id) => {
            const project = PROJECTS.find(p => p.id === id);
            if (project) setActiveProject(project);
          }}
        />
      )}
      <AppInner config={activeProject} />
    </ProjectProvider>
  );
}
