import { useState, useMemo, useEffect } from 'react';
import type { PatentData, FilterState } from '../types/patent';
import { generateMockData } from '../utils/generateMockData';

const ALL_CPC_SECTIONS = new Set([
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Y',
]);

const DEFAULT_FILTERS: FilterState = {
  yearRange: [2018, 2023],
  cpcSections: new Set(ALL_CPC_SECTIONS),
  minCitations: 0,
  searchQuery: '',
  selectedPatentIndex: null,
  hoveredPatentIndex: null,
};

export function usePatentData() {
  const [data, setData] = useState<PatentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [yearRange, setYearRange] = useState<[number, number]>(DEFAULT_FILTERS.yearRange);
  const [cpcSections, setCpcSections] = useState<Set<string>>(DEFAULT_FILTERS.cpcSections);
  const [minCitations, setMinCitations] = useState<number>(DEFAULT_FILTERS.minCitations);
  const [searchQuery, setSearchQuery] = useState<string>(DEFAULT_FILTERS.searchQuery);
  const [selectedPatentIndex, setSelectedPatentIndex] = useState<number | null>(
    DEFAULT_FILTERS.selectedPatentIndex,
  );
  const [hoveredPatentIndex, setHoveredPatentIndex] = useState<number | null>(
    DEFAULT_FILTERS.hoveredPatentIndex,
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const mockData = generateMockData();
        setData(mockData);
      } catch (err) {
        console.error('Failed to generate patent data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load patent data');
      } finally {
        setIsLoading(false);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, []);

  const filters: FilterState = useMemo(
    () => ({
      yearRange,
      cpcSections,
      minCitations,
      searchQuery,
      selectedPatentIndex,
      hoveredPatentIndex,
    }),
    [yearRange, cpcSections, minCitations, searchQuery, selectedPatentIndex, hoveredPatentIndex],
  );

  const filteredIndices: number[] = useMemo(() => {
    if (!data) return [];

    const query = searchQuery.trim().toLowerCase();
    const [minYear, maxYear] = yearRange;

    const indices: number[] = [];
    const nodes = data.nodes;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (node.year < minYear || node.year > maxYear) continue;
      if (!cpcSections.has(node.cpcSection)) continue;
      if (node.citationCount < minCitations) continue;

      if (query.length > 0) {
        const titleMatch = node.title.toLowerCase().includes(query);
        const assigneeMatch = node.assignee.toLowerCase().includes(query);
        if (!titleMatch && !assigneeMatch) continue;
      }

      indices.push(i);
    }

    return indices;
  }, [data, yearRange, cpcSections, minCitations, searchQuery]);

  return {
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
  };
}
