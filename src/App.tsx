import { useState, useCallback, useMemo } from 'react';
import Galaxy from './components/Galaxy';
import HoverCard from './components/HoverCard';
import InfoPanel from './components/InfoPanel';
import SearchPanel from './components/SearchPanel';
import TimeSlider from './components/TimeSlider';
import FilterPanel from './components/FilterPanel';
import LoadingScreen from './components/LoadingScreen';
import { usePatentData } from './hooks/usePatentData';

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
  } = usePatentData();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  if (isLoading || !data) {
    return <LoadingScreen />;
  }

  return (
    <div className="w-full h-full relative">
      {/* 3D Galaxy Scene */}
      <Galaxy
        data={data}
        filters={filters}
        filteredIndices={filteredIndices}
        onHover={setHoveredPatentIndex}
        onClick={setSelectedPatentIndex}
        onMouseMove={setMousePos}
      />

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

      {/* Info Panel (right sidebar, on click) */}
      <InfoPanel
        node={selectedNode}
        allNodes={data.nodes}
        edges={data.edges}
        nodeIndex={filters.selectedPatentIndex}
        onClose={() => setSelectedPatentIndex(null)}
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

      {/* Legend / Title */}
      <div className="fixed top-4 right-4 z-20 text-right">
        <h1 className="text-lg font-light tracking-wider" style={{ color: '#e0e0f0' }}>
          Patent Galaxy
        </h1>
        <p className="text-xs" style={{ color: '#8888aa' }}>
          {filteredIndices.length.toLocaleString()} patents visible
        </p>
      </div>
    </div>
  );
}
