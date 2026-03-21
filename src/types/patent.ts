// ── Generic data types used by the visualization engine ──

export interface DataNode {
  id: string;
  title: string;
  year: number;
  month: number;
  category: string;        // CPC section (A-H) or arXiv field (cs, math, physics)
  subcategory: string;      // CPC class (G06) or arXiv subcategory (cs.AI)
  detail: string;           // CPC subclass (G06F) or arXiv subcategory detail
  creator: string;          // Assignee or first author
  contributorCount: number; // Inventor count or co-author count
  citationCount: number;
  x: number;
  y: number;
  z: number;
  color: string;
  size: number;
}

export interface Edge {
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

export interface DataSet {
  nodes: DataNode[];
  edges: Edge[];
  clusters: Cluster[];
}

export interface FilterState {
  yearRange: [number, number];
  categories: Set<string>;
  minCitations: number;
  searchQuery: string;
  selectedIndex: number | null;
  hoveredIndex: number | null;
}

// ── Columnar format for static JSON data files ──
// Field names match the JSON keys (patent-specific names preserved in JSON)

export interface PatentColumnarNodes {
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
  nodes: PatentColumnarNodes;
  edges: [number, number][];
  clusters: Cluster[];
}

// Paper columnar format (for future paper data files)
export interface PaperColumnarNodes {
  id: string[];
  title: string[];
  year: number[];
  month: number[];
  primaryCategory: string[];
  subcategory: string[];
  field: string[];
  firstAuthor: string[];
  coauthorCount: number[];
  citationCount: number[];
  x: number[];
  y: number[];
  z: number[];
  color: string[];
  size: number[];
}

export interface PaperDataFile {
  meta: { minYear: number; maxYear: number; count: number };
  nodes: PaperColumnarNodes;
  edges: [number, number][];
  clusters: Cluster[];
}
