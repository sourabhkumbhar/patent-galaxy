import type { DataSet } from '../types/patent';

export interface CategoryDef {
  id: string;
  label: string;
  color: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  tagline: string;
  description: string;

  // Data
  dataPath: string;
  generateMockData: () => DataSet;

  // Categories
  categories: CategoryDef[];
  allCategoryIds: Set<string>;
  categoryLabel: string;         // "CPC Section" | "Research Field"

  // Terminology
  nodeLabel: string;             // "patent" | "paper"
  nodeLabelPlural: string;       // "patents" | "papers"
  edgeLabel: string;             // "citation" | "citation"
  creatorLabel: string;          // "Assignee" | "First Author"
  contributorLabel: string;      // "Inventors" | "Co-authors"

  // Formatting
  formatNodeId: (id: string) => string;
  getNodeUrl: (id: string) => string;
  nodeUrlLabel: string;          // "View on Google Patents" | "View on arXiv"
  searchPlaceholder: string;

  // Theme
  background: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;

  // Category names for display
  categoryNames: Record<string, string>;
}
