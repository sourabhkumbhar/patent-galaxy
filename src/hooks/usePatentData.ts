import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet, DataNode, Edge, FilterState, PatentDataFile, PaperDataFile } from '../types/patent';
import type { ProjectConfig } from '../config/types';

/**
 * Parse patent columnar JSON format into DataSet.
 */
function parsePatentData(raw: PatentDataFile): DataSet {
  const { nodes: cols, edges: rawEdges, clusters } = raw;
  const count = cols.id.length;
  const nodes: DataNode[] = new Array(count);
  for (let i = 0; i < count; i++) {
    nodes[i] = {
      id: cols.id[i],
      title: cols.title[i],
      year: cols.year[i],
      month: cols.month[i],
      category: cols.cpcSection[i],
      subcategory: cols.cpcClass[i],
      detail: cols.cpcSubclass[i],
      creator: cols.assignee[i],
      contributorCount: cols.inventorCount[i],
      citationCount: cols.citationCount[i],
      x: cols.x[i],
      y: cols.y[i],
      z: cols.z[i],
      color: cols.color[i],
      size: cols.size[i],
    };
  }
  const edges: Edge[] = rawEdges.map(([s, t]) => ({ source: s, target: t }));
  return { nodes, edges, clusters };
}

/**
 * Parse paper columnar JSON format into DataSet.
 */
function parsePaperData(raw: PaperDataFile): DataSet {
  const { nodes: cols, edges: rawEdges, clusters } = raw;
  const count = cols.id.length;
  const nodes: DataNode[] = new Array(count);
  for (let i = 0; i < count; i++) {
    nodes[i] = {
      id: cols.id[i],
      title: cols.title[i],
      year: cols.year[i],
      month: cols.month[i],
      category: cols.primaryCategory[i],
      subcategory: cols.subcategory[i],
      detail: cols.field[i],
      creator: cols.firstAuthor[i],
      contributorCount: cols.coauthorCount[i],
      citationCount: cols.citationCount[i],
      x: cols.x[i],
      y: cols.y[i],
      z: cols.z[i],
      color: cols.color[i],
      size: cols.size[i],
    };
  }
  const edges: Edge[] = rawEdges.map(([s, t]) => ({ source: s, target: t }));
  return { nodes, edges, clusters };
}

/**
 * Fetch data with download progress tracking.
 * Falls back to mock data if the file is unavailable.
 */
async function fetchProjectData(
  config: ProjectConfig,
  onProgress: (pct: number) => void,
): Promise<{ data: DataSet; yearBounds: { min: number; max: number } }> {
  const response = await fetch(config.dataPath);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentLength = Number(response.headers.get('content-length')) || 0;
  const reader = response.body?.getReader();

  let jsonText: string;

  if (reader && contentLength > 0) {
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
    jsonText = await response.text();
    onProgress(95);
  }

  onProgress(97);
  const raw = JSON.parse(jsonText);

  onProgress(99);
  // Detect format by checking which field names exist
  const data = raw.nodes.cpcSection
    ? parsePatentData(raw as PatentDataFile)
    : parsePaperData(raw as PaperDataFile);

  onProgress(100);
  return {
    data,
    yearBounds: { min: raw.meta.minYear, max: raw.meta.maxYear },
  };
}

export function useProjectData(config: ProjectConfig) {
  const [data, setData] = useState<DataSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [yearBounds, setYearBounds] = useState({ min: 2010, max: 2024 });

  const [yearRange, setYearRange] = useState<[number, number]>([2010, 2024]);
  const [categories, setCategories] = useState<Set<string>>(new Set(config.allCategoryIds));
  const [minCitations, setMinCitations] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleProgress = useCallback((pct: number) => {
    setLoadProgress(pct);
  }, []);

  // Reset state when project changes
  useEffect(() => {
    setData(null);
    setIsLoading(true);
    setError(null);
    setLoadProgress(0);
    setCategories(new Set(config.allCategoryIds));
    setMinCitations(0);
    setSearchQuery('');
    setSelectedIndex(null);
    setHoveredIndex(null);

    let cancelled = false;

    async function loadData() {
      try {
        const result = await fetchProjectData(config, (pct) => {
          if (!cancelled) handleProgress(pct);
        });
        if (cancelled) return;
        setData(result.data);
        setYearBounds(result.yearBounds);
        setYearRange([result.yearBounds.min, result.yearBounds.max]);
      } catch {
        console.warn(`Real data not found at ${config.dataPath}, using mock data.`);
        if (cancelled) return;
        try {
          const mockData = config.generateMockData();
          setData(mockData);
          setYearBounds({ min: 2010, max: 2024 });
          setYearRange([2010, 2024]);
          setLoadProgress(100);
        } catch (err) {
          console.error('Failed to generate mock data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [config, handleProgress]);

  const filters: FilterState = useMemo(
    () => ({
      yearRange,
      categories,
      minCitations,
      searchQuery,
      selectedIndex,
      hoveredIndex,
    }),
    [yearRange, categories, minCitations, searchQuery, selectedIndex, hoveredIndex],
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
      if (!categories.has(node.category)) continue;
      if (node.citationCount < minCitations) continue;

      if (query.length > 0) {
        const titleMatch = node.title.toLowerCase().includes(query);
        const creatorMatch = node.creator.toLowerCase().includes(query);
        if (!titleMatch && !creatorMatch) continue;
      }

      indices.push(i);
    }

    return indices;
  }, [data, yearRange, categories, minCitations, searchQuery]);

  return {
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
  };
}

// Keep old name as alias for backward compatibility during migration
export const usePatentData = useProjectData;
