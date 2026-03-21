import { useState, useMemo, useEffect, useCallback } from 'react';
import type { PatentData, PatentNode, CitationEdge, FilterState, PatentDataFile } from '../types/patent';
import { generateMockData } from '../utils/generateMockData';

const ALL_CPC_SECTIONS = new Set([
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Y',
]);

/**
 * Parse the columnar JSON format back into PatentData.
 */
function parseColumnarData(raw: PatentDataFile): PatentData {
  const { nodes: cols, edges: rawEdges, clusters } = raw;
  const count = cols.id.length;
  const nodes: PatentNode[] = new Array(count);
  for (let i = 0; i < count; i++) {
    nodes[i] = {
      id: cols.id[i],
      title: cols.title[i],
      year: cols.year[i],
      month: cols.month[i],
      cpcSection: cols.cpcSection[i],
      cpcClass: cols.cpcClass[i],
      cpcSubclass: cols.cpcSubclass[i],
      assignee: cols.assignee[i],
      inventorCount: cols.inventorCount[i],
      citationCount: cols.citationCount[i],
      x: cols.x[i],
      y: cols.y[i],
      z: cols.z[i],
      color: cols.color[i],
      size: cols.size[i],
    };
  }
  const edges: CitationEdge[] = rawEdges.map(([s, t]) => ({ source: s, target: t }));
  return { nodes, edges, clusters };
}

/**
 * Fetch the real patent data file with download progress tracking.
 * Falls back to mock data if the file is unavailable.
 */
async function fetchPatentData(
  onProgress: (pct: number) => void,
): Promise<{ data: PatentData; yearBounds: { min: number; max: number } }> {
  const response = await fetch('/data/patents.json');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentLength = Number(response.headers.get('content-length')) || 0;
  const reader = response.body?.getReader();

  let jsonText: string;

  if (reader && contentLength > 0) {
    // Stream with progress
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress(Math.min(95, Math.round((received / contentLength) * 95)));
    }

    const merged = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    jsonText = new TextDecoder().decode(merged);
  } else {
    // Fallback: no streaming
    jsonText = await response.text();
    onProgress(95);
  }

  onProgress(97); // parsing
  const raw: PatentDataFile = JSON.parse(jsonText);

  onProgress(99); // reconstructing
  const data = parseColumnarData(raw);

  onProgress(100);
  return {
    data,
    yearBounds: { min: raw.meta.minYear, max: raw.meta.maxYear },
  };
}

export function usePatentData() {
  const [data, setData] = useState<PatentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [yearBounds, setYearBounds] = useState({ min: 2010, max: 2024 });

  const [yearRange, setYearRange] = useState<[number, number]>([2010, 2024]);
  const [cpcSections, setCpcSections] = useState<Set<string>>(new Set(ALL_CPC_SECTIONS));
  const [minCitations, setMinCitations] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPatentIndex, setSelectedPatentIndex] = useState<number | null>(null);
  const [hoveredPatentIndex, setHoveredPatentIndex] = useState<number | null>(null);

  const handleProgress = useCallback((pct: number) => {
    setLoadProgress(pct);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        // Try real data first
        const result = await fetchPatentData((pct) => {
          if (!cancelled) handleProgress(pct);
        });
        if (cancelled) return;
        setData(result.data);
        setYearBounds(result.yearBounds);
        setYearRange([result.yearBounds.min, result.yearBounds.max]);
      } catch {
        // Fall back to mock data
        console.warn('Real patent data not found, using mock data. Run `npm run fetch-data` to generate.');
        if (cancelled) return;
        try {
          const mockData = generateMockData();
          setData(mockData);
          setYearBounds({ min: 2010, max: 2024 });
          setYearRange([2010, 2024]);
          setLoadProgress(100);
        } catch (err) {
          console.error('Failed to generate mock data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load patent data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [handleProgress]);

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
    loadProgress,
    yearBounds,
  };
}
