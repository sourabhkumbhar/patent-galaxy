export interface PatentNode {
  id: string;
  title: string;
  year: number;
  month: number;
  cpcSection: string;
  cpcClass: string;
  cpcSubclass: string;
  assignee: string;
  inventorCount: number;
  citationCount: number;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
}

export interface CitationEdge {
  source: number;
  target: number;
}

export interface Cluster {
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  z: number;
  color: string;
  count: number;
}

export interface PatentData {
  nodes: PatentNode[];
  edges: CitationEdge[];
  clusters: Cluster[];
}

// Columnar format used in the static JSON data file (public/data/patents.json)
export interface ColumnarNodes {
  id: string[];
  title: string[];
  year: number[];
  month: number[];
  cpcSection: string[];
  cpcClass: string[];
  cpcSubclass: string[];
  assignee: string[];
  inventorCount: number[];
  citationCount: number[];
  x: number[];
  y: number[];
  z: number[];
  color: string[];
  size: number[];
}

export interface PatentDataFile {
  meta: { minYear: number; maxYear: number; count: number };
  nodes: ColumnarNodes;
  edges: [number, number][];
  clusters: Cluster[];
}

export interface FilterState {
  yearRange: [number, number];
  cpcSections: Set<string>;
  minCitations: number;
  searchQuery: string;
  selectedPatentIndex: number | null;
  hoveredPatentIndex: number | null;
}
