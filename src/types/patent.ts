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

export interface FilterState {
  yearRange: [number, number];
  cpcSections: Set<string>;
  minCitations: number;
  searchQuery: string;
  selectedPatentIndex: number | null;
  hoveredPatentIndex: number | null;
}
