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
import { usePatentData } from './hooks/usePatentData';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useShareState } from './hooks/useShareState';

export default function App() {
  const {
    data,
    filters,
    filteredIndices,
    setYearRange,
    setCpcSections,
    setMinCitations,
    setSearchQuery,
    setSelectedPatentIndex,
    setHoveredPatentIndex,
    isLoading,
    error,
  } = usePatentData();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [citationPath, setCitationPath] = useState<number[] | null>(null);

  useKeyboardNavigation({
    nodes: data?.nodes ?? [],
    filteredIndices,
    selectedIndex: filters.selectedPatentIndex,
    onSelect: setSelectedPatentIndex,
    onHover: setHoveredPatentIndex,
  });

  const { copyShareUrl } = useShareState({
    yearRange: filters.yearRange,
    cpcSections: filters.cpcSections,
    minCitations: filters.minCitations,
    searchQuery: filters.searchQuery,
    selectedPatentIndex: filters.selectedPatentIndex,
    setYearRange,
    setCpcSections,
    setMinCitations,
    setSearchQuery,
    setSelectedPatentIndex,
    isLoading,
  });

  const hoveredNode = useMemo(() => {
    if (!data || filters.hoveredPatentIndex === null) return null;
    return data.nodes[filters.hoveredPatentIndex] ?? null;
  }, [data, filters.hoveredPatentIndex]);

  const selectedNode = useMemo(() => {
    if (!data || filters.selectedPatentIndex === null) return null;
    return data.nodes[filters.selectedPatentIndex] ?? null;
  }, [data, filters.selectedPatentIndex]);

  const handleToggleSection = useCallback(
    (section: string) => {
      const next = new Set(filters.cpcSections);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      setCpcSections(next);
    },
    [filters.cpcSections, setCpcSections]
  );

  const handleNavigate = useCallback(
    (index: number) => {
      setSelectedPatentIndex(index);
    },
    [setSelectedPatentIndex]
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
        style={{ background: '#0a0a12' }}
      >
        <h2 className="text-xl font-light mb-4" style={{ color: '#e0e0f0' }}>
          Failed to load patent data
        </h2>
        <p className="text-sm" style={{ color: '#8888aa' }}>{error}</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return <LoadingScreen />;
  }

  return (
    <div className="w-full h-full relative">
      {/* 3D Galaxy Scene */}
      <ErrorBoundary>
        <Galaxy
          data={data}
          filters={filters}
          filteredIndices={filteredIndices}
          onHover={setHoveredPatentIndex}
          onClick={setSelectedPatentIndex}
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
        cpcSections={filters.cpcSections}
        onToggleSection={handleToggleSection}
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
        nodeIndex={filters.selectedPatentIndex}
        onClose={() => setSelectedPatentIndex(null)}
        onNavigate={handleNavigate}
      />

      {/* Citation Path Tracer */}
      <PathTracerPanel
        nodes={data.nodes}
        edges={data.edges}
        selectedIndex={filters.selectedPatentIndex}
        onPathChange={setCitationPath}
        onNavigate={handleNavigate}
      />

      {/* Time Slider (bottom) */}
      <TimeSlider
        yearRange={filters.yearRange}
        minYear={2018}
        maxYear={2023}
        onChange={setYearRange}
        yearCounts={yearCounts}
      />

      {/* Legend / Title — hidden on small screens to avoid overlap with search */}
      <div className="fixed top-4 right-4 z-20 anim-fade-in hidden sm:block">
        <div className="glass-panel px-4 py-3 text-right flex items-center gap-4">
          <div>
            <h1 className="text-base font-light tracking-wider" style={{ color: 'var(--text-primary)' }}>
              Patent Galaxy
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {filteredIndices.length.toLocaleString()} patents visible
            </p>
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border-color)' }} />
          <ShareButton onCopy={copyShareUrl} />
        </div>
      </div>
    </div>
  );
}
