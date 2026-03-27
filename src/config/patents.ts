import type { ProjectConfig } from './types';
import { generateMockData } from '../utils/generateMockData';

const CPC_CATEGORIES = [
  { id: 'A', label: 'Human Necessities', color: '#ff5577' },
  { id: 'B', label: 'Operations & Transport', color: '#22d3ee' },
  { id: 'C', label: 'Chemistry & Metallurgy', color: '#ffb020' },
  { id: 'D', label: 'Textiles & Paper', color: '#a855f7' },
  { id: 'E', label: 'Fixed Constructions', color: '#34d399' },
  { id: 'F', label: 'Mechanical Engineering', color: '#f97316' },
  { id: 'G', label: 'Physics', color: '#60a5fa' },
  { id: 'H', label: 'Electricity', color: '#facc15' },
  { id: 'Y', label: 'Emerging Tech', color: '#c084fc' },
];

function formatPatentId(id: string): string {
  const parts = id.split('-');
  if (parts.length !== 3) return id;
  const num = parseInt(parts[1], 10);
  return `${parts[0]} ${num.toLocaleString()} ${parts[2]}`;
}

function getPatentUrl(id: string): string {
  const parts = id.split('-');
  if (parts.length !== 3) return `https://patents.google.com/patent/${id}`;
  return `https://patents.google.com/patent/${parts[0]}${parts[1]}${parts[2]}`;
}

export const patentConfig: ProjectConfig = {
  id: 'patents',
  name: 'NodeVerse — Patents',
  tagline: 'Explore the universe of innovation',
  description: 'Navigate 100,000 real USPTO patents as stars in a 3D galaxy. Each star is a patent, colored by technology domain, connected by citation links.',

  dataPath: '/data/patents.json',
  generateMockData,

  categories: CPC_CATEGORIES,
  allCategoryIds: new Set(CPC_CATEGORIES.map(c => c.id)),
  categoryLabel: 'CPC Section',

  nodeLabel: 'patent',
  nodeLabelPlural: 'patents',
  edgeLabel: 'citation',
  creatorLabel: 'Assignee',
  contributorLabel: 'Inventors',

  formatNodeId: formatPatentId,
  getNodeUrl: getPatentUrl,
  nodeUrlLabel: 'View on Google Patents',
  searchPlaceholder: 'Search patents, companies...',

  background: '#0a0a12',
  fogColor: '#0a0a12',
  fogNear: 500,
  fogFar: 1400,

  categoryNames: Object.fromEntries(CPC_CATEGORIES.map(c => [c.id, c.label])),
};
