import type { ProjectConfig } from './types';
import { generateMockPaperData } from '../utils/generateMockPaperData';

const ARXIV_CATEGORIES = [
  { id: 'cs', label: 'Computer Science', color: '#00d4ff' },
  { id: 'math', label: 'Mathematics', color: '#ff5577' },
  { id: 'physics', label: 'Physics', color: '#a855f7' },
  { id: 'stat', label: 'Statistics', color: '#34d399' },
  { id: 'eess', label: 'Electrical Engineering', color: '#facc15' },
  { id: 'q-bio', label: 'Quantitative Biology', color: '#f97316' },
  { id: 'q-fin', label: 'Quantitative Finance', color: '#60a5fa' },
  { id: 'econ', label: 'Economics', color: '#fb7185' },
];

function formatPaperId(id: string): string {
  return id; // arXiv IDs are already human-readable (e.g., "2301.12345")
}

function getPaperUrl(id: string): string {
  return `https://arxiv.org/abs/${id}`;
}

export const paperConfig: ProjectConfig = {
  id: 'papers',
  name: 'NodeVerse — Papers',
  tagline: 'The neural network of human knowledge',
  description: 'Explore 50,000 research papers as neurons in a 3D brain. Each neuron is a paper, colored by research field, connected by citation synapses.',

  dataPath: '/data/papers.json',
  generateMockData: generateMockPaperData,

  categories: ARXIV_CATEGORIES,
  allCategoryIds: new Set(ARXIV_CATEGORIES.map(c => c.id)),
  categoryLabel: 'Research Field',

  nodeLabel: 'paper',
  nodeLabelPlural: 'papers',
  edgeLabel: 'citation',
  creatorLabel: 'First Author',
  contributorLabel: 'Co-authors',

  formatNodeId: formatPaperId,
  getNodeUrl: getPaperUrl,
  nodeUrlLabel: 'View on arXiv',
  searchPlaceholder: 'Search papers, authors...',

  background: '#050510',
  fogColor: '#050510',
  fogNear: 500,
  fogFar: 1400,

  categoryNames: Object.fromEntries(ARXIV_CATEGORIES.map(c => [c.id, c.label])),
};
