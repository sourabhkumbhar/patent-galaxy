import type { DataNode, Edge, Cluster, DataSet } from '../types/patent';

// ---------------------------------------------------------------------------
// Mulberry32 PRNG
// ---------------------------------------------------------------------------
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// arXiv categories & colors
// ---------------------------------------------------------------------------
interface FieldDef {
  id: string;
  label: string;
  color: string;
  weight: number;
  subcategories: string[];
}

const FIELDS: FieldDef[] = [
  {
    id: 'cs', label: 'Computer Science', color: '#00d4ff', weight: 0.30,
    subcategories: ['cs.AI', 'cs.LG', 'cs.CV', 'cs.CL', 'cs.CR', 'cs.DS', 'cs.SE', 'cs.RO', 'cs.NE', 'cs.DB', 'cs.DC', 'cs.HC'],
  },
  {
    id: 'math', label: 'Mathematics', color: '#ff5577', weight: 0.18,
    subcategories: ['math.AG', 'math.AP', 'math.CO', 'math.DG', 'math.NT', 'math.OC', 'math.PR', 'math.ST'],
  },
  {
    id: 'physics', label: 'Physics', color: '#a855f7', weight: 0.20,
    subcategories: ['hep-th', 'hep-ph', 'cond-mat', 'quant-ph', 'astro-ph', 'gr-qc', 'nucl-th', 'physics.optics'],
  },
  {
    id: 'stat', label: 'Statistics', color: '#34d399', weight: 0.08,
    subcategories: ['stat.ML', 'stat.ME', 'stat.AP', 'stat.TH', 'stat.CO'],
  },
  {
    id: 'eess', label: 'Electrical Engineering', color: '#facc15', weight: 0.10,
    subcategories: ['eess.SP', 'eess.IV', 'eess.AS', 'eess.SY'],
  },
  {
    id: 'q-bio', label: 'Quantitative Biology', color: '#f97316', weight: 0.06,
    subcategories: ['q-bio.BM', 'q-bio.GN', 'q-bio.NC', 'q-bio.PE', 'q-bio.QM'],
  },
  {
    id: 'q-fin', label: 'Quantitative Finance', color: '#60a5fa', weight: 0.04,
    subcategories: ['q-fin.CP', 'q-fin.MF', 'q-fin.PM', 'q-fin.RM', 'q-fin.ST'],
  },
  {
    id: 'econ', label: 'Economics', color: '#fb7185', weight: 0.04,
    subcategories: ['econ.EM', 'econ.GN', 'econ.TH'],
  },
];

function pickField(rand: () => number): FieldDef {
  const r = rand();
  let cumulative = 0;
  for (const field of FIELDS) {
    cumulative += field.weight;
    if (r < cumulative) return field;
  }
  return FIELDS[0];
}

// ---------------------------------------------------------------------------
// Author name generation
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  'Wei', 'Yuki', 'Priya', 'James', 'Maria', 'Ahmed', 'Li', 'Sarah',
  'Raj', 'Emma', 'Chen', 'Sofia', 'Min', 'Anna', 'Kai', 'Elena',
  'Jing', 'David', 'Aisha', 'Thomas', 'Yun', 'Laura', 'Ravi', 'Olga',
  'Jun', 'Fatima', 'Alex', 'Nina', 'Sato', 'Maya', 'Dmitri', 'Clara',
];

const LAST_NAMES = [
  'Zhang', 'Tanaka', 'Sharma', 'Smith', 'Garcia', 'Hassan', 'Wang', 'Johnson',
  'Patel', 'Mueller', 'Liu', 'Rossi', 'Kim', 'Petrov', 'Chen', 'Silva',
  'Park', 'Brown', 'Ali', 'Anderson', 'Nakamura', 'Martinez', 'Singh', 'Ivanov',
  'Wu', 'Lee', 'Taylor', 'Sato', 'Nguyen', 'Yamamoto', 'Wilson', 'Moreau',
];

function generateAuthor(rand: () => number): string {
  const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

// ---------------------------------------------------------------------------
// Paper title generation
// ---------------------------------------------------------------------------
const TITLE_TEMPLATES: Record<string, string[]> = {
  cs: [
    'Attention Is All You Need: Revisiting Transformer Architectures',
    'Scaling Laws for Neural Language Models',
    'Efficient Fine-Tuning of Large Language Models via Low-Rank Adaptation',
    'Diffusion Models Beat GANs on Image Synthesis',
    'Self-Supervised Learning for Visual Representations',
    'Graph Neural Networks for Molecular Property Prediction',
    'Reinforcement Learning from Human Feedback: Methods and Applications',
    'Neural Architecture Search with Gradient-Based Optimization',
    'Federated Learning with Differential Privacy Guarantees',
    'A Survey on Explainable Artificial Intelligence Methods',
    'Zero-Shot Cross-Lingual Transfer with Multilingual Encoders',
    'Contrastive Learning for Unsupervised Visual Feature Extraction',
    'Robustness of Deep Neural Networks to Adversarial Perturbations',
    'Efficient Inference on Edge Devices Using Model Distillation',
    'Code Generation with Large Language Models: Benchmarks and Evaluation',
  ],
  math: [
    'On the Convergence of Stochastic Gradient Descent in Non-Convex Settings',
    'New Bounds for the Riemann Zeta Function on the Critical Line',
    'Algebraic Geometry of High-Dimensional Tensor Decompositions',
    'Optimal Transport Theory and Applications to Machine Learning',
    'Random Matrix Theory in High-Dimensional Statistics',
    'Homological Algebra Methods in Topological Data Analysis',
    'Spectral Gap Estimates for Non-Reversible Markov Chains',
    'Geometric Measure Theory and Its Applications to PDEs',
    'Combinatorial Optimization via Semidefinite Programming Relaxations',
    'Number Theory Approaches to Lattice-Based Cryptography',
  ],
  physics: [
    'Topological Phases of Matter in Quantum Many-Body Systems',
    'Dark Energy Constraints from Large-Scale Structure Surveys',
    'Holographic Entanglement Entropy in Anti-de Sitter Spacetime',
    'Quantum Error Correction with Surface Codes',
    'Neutron Star Mergers as Sources of Heavy Element Nucleosynthesis',
    'Non-Equilibrium Dynamics in Strongly Correlated Electron Systems',
    'Precision Tests of the Standard Model at the LHC',
    'Machine Learning Methods for Lattice Quantum Chromodynamics',
    'Gravitational Wave Detection from Binary Black Hole Mergers',
    'Superconducting Qubit Architectures for Quantum Computing',
  ],
  stat: [
    'Bayesian Nonparametric Methods for Clustering',
    'Causal Inference in High-Dimensional Observational Studies',
    'Conformal Prediction with Distribution-Free Coverage Guarantees',
    'Double Machine Learning for Treatment Effect Estimation',
    'High-Dimensional Variable Selection with the Adaptive LASSO',
    'Modern Approaches to Multiple Hypothesis Testing',
    'Sparse Signal Recovery via Compressed Sensing',
    'Variational Inference Methods for Bayesian Deep Learning',
  ],
  eess: [
    'Deep Learning for Wireless Channel Estimation in 5G Systems',
    'Image Super-Resolution Using Generative Adversarial Networks',
    'Source Separation with Deep Neural Networks for Audio Processing',
    'Model Predictive Control for Autonomous Vehicle Systems',
    'Compressed Sensing for MRI Reconstruction',
    'MIMO Beamforming with Deep Reinforcement Learning',
  ],
  'q-bio': [
    'Single-Cell RNA Sequencing Analysis with Graph Autoencoders',
    'Protein Structure Prediction with Geometric Deep Learning',
    'Neural Population Dynamics During Decision Making',
    'Epidemiological Modeling of Infectious Disease Spread',
    'Machine Learning for Drug-Target Interaction Prediction',
  ],
  'q-fin': [
    'Deep Hedging: Machine Learning for Options Pricing',
    'Reinforcement Learning for Portfolio Optimization',
    'High-Frequency Trading with Recurrent Neural Networks',
    'Risk Measurement Under Model Uncertainty',
    'Generative Models for Financial Time Series Simulation',
  ],
  econ: [
    'Heterogeneous Treatment Effects in Randomized Experiments',
    'Machine Learning Methods for Economic Forecasting',
    'Auction Design with Deep Learning Approximations',
    'Network Effects in Digital Platform Markets',
  ],
};

function generateTitle(fieldId: string, rand: () => number): string {
  const templates = TITLE_TEMPLATES[fieldId] || TITLE_TEMPLATES['cs'];
  return templates[Math.floor(rand() * templates.length)];
}

// ---------------------------------------------------------------------------
// Paper ID generation (arXiv style: YYMM.NNNNN)
// ---------------------------------------------------------------------------
function generatePaperId(year: number, month: number, index: number, rand: () => number): string {
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, '0');
  const num = String(10000 + (index % 10000) + Math.floor(rand() * 5000)).padStart(5, '0');
  return `${yy}${mm}.${num}`;
}

// ---------------------------------------------------------------------------
// Power-law citation count
// ---------------------------------------------------------------------------
function generateCitationCount(rand: () => number): number {
  const u = rand();
  if (u < 0.30) return 0;
  if (u < 0.50) return 1;
  if (u < 0.65) return 2;
  if (u < 0.75) return 3;
  if (u < 0.83) return Math.floor(4 + rand() * 4);
  if (u < 0.90) return Math.floor(8 + rand() * 7);
  if (u < 0.95) return Math.floor(15 + rand() * 25);
  if (u < 0.98) return Math.floor(40 + rand() * 60);
  if (u < 0.995) return Math.floor(100 + rand() * 150);
  return Math.floor(250 + rand() * 500);
}

// ---------------------------------------------------------------------------
// 3D position generation for papers
// Fields are arranged like brain lobes around a central point
// ---------------------------------------------------------------------------
const FIELD_ANGLES: Record<string, number> = {};
FIELDS.forEach((field, i) => {
  FIELD_ANGLES[field.id] = (i / FIELDS.length) * Math.PI * 2;
});

function getFieldCentroid(fieldId: string): { x: number; y: number; z: number } {
  const angle = FIELD_ANGLES[fieldId] ?? 0;
  const radius = 130;
  const idx = FIELDS.findIndex(f => f.id === fieldId);
  const elevation = ((idx % 3) - 1) * 34;
  return {
    x: Math.cos(angle) * radius,
    y: elevation,
    z: Math.sin(angle) * radius,
  };
}

function generatePaperPosition(
  fieldId: string,
  subcategory: string,
): { x: number; y: number; z: number } {
  const centroid = getFieldCentroid(fieldId);

  const subNum = subcategory.charCodeAt(subcategory.length - 1) || 0;
  const subOffset = (subNum % 15) * 2.5;

  const spreadX = (Math.random() + Math.random() + Math.random() - 1.5) * 42;
  const spreadY = (Math.random() + Math.random() + Math.random() - 1.5) * 42;
  const spreadZ = (Math.random() + Math.random() + Math.random() - 1.5) * 42;

  return {
    x: centroid.x + spreadX + subOffset * Math.cos(subNum),
    y: centroid.y + spreadY,
    z: centroid.z + spreadZ + subOffset * Math.sin(subNum),
  };
}

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------
const TOTAL_NODES = 50000;
const TOTAL_EDGES = 150000;
const SEED = 137;

export function generateMockPaperData(): DataSet {
  const rand = mulberry32(SEED);

  const originalRandom = Math.random;
  Math.random = rand;

  try {
    return generateDataInternal(rand);
  } finally {
    Math.random = originalRandom;
  }
}

function generateDataInternal(rand: () => number): DataSet {
  const nodes: DataNode[] = [];
  const fieldIndices: Record<string, number[]> = {};

  for (let i = 0; i < TOTAL_NODES; i++) {
    const field = pickField(rand);
    const subcategory = field.subcategories[Math.floor(rand() * field.subcategories.length)];
    const detail = subcategory;

    const year = 2010 + Math.floor(rand() * 15);
    const month = 1 + Math.floor(rand() * 12);
    const citationCount = generateCitationCount(rand);
    const contributorCount = 1 + Math.floor(rand() * rand() * 8);

    const pos = generatePaperPosition(field.id, subcategory);

    const node: DataNode = {
      id: generatePaperId(year, month, i, rand),
      title: generateTitle(field.id, rand),
      year,
      month,
      category: field.id,
      subcategory,
      detail,
      creator: generateAuthor(rand),
      contributorCount,
      citationCount,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      color: field.color,
      size: Math.max(0.3, Math.log2(citationCount + 1) * 0.4),
    };

    nodes.push(node);

    if (!fieldIndices[field.id]) {
      fieldIndices[field.id] = [];
    }
    fieldIndices[field.id].push(i);
  }

  // ----- Edges -----
  const edges: Edge[] = [];
  const edgeSet = new Set<string>();
  const allFields = Object.keys(fieldIndices);

  let attempts = 0;
  while (edges.length < TOTAL_EDGES && attempts < TOTAL_EDGES * 5) {
    attempts++;

    const sourceIdx = Math.floor(rand() * TOTAL_NODES);
    const sourceField = nodes[sourceIdx].category;

    let targetIdx: number;

    if (rand() < 0.65) {
      const pool = fieldIndices[sourceField];
      targetIdx = pool[Math.floor(rand() * pool.length)];
    } else {
      const otherFields = allFields.filter(f => f !== sourceField);
      const targetField = otherFields[Math.floor(rand() * otherFields.length)];
      const pool = fieldIndices[targetField];
      targetIdx = pool[Math.floor(rand() * pool.length)];
    }

    if (sourceIdx === targetIdx) continue;

    const source = nodes[sourceIdx];
    const target = nodes[targetIdx];
    const citingIdx = source.year >= target.year ? sourceIdx : targetIdx;
    const citedIdx = source.year >= target.year ? targetIdx : sourceIdx;

    const key = `${citingIdx}-${citedIdx}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);

    edges.push({ source: citingIdx, target: citedIdx });
  }

  // ----- Clusters -----
  const clusters: Cluster[] = [];
  for (const field of FIELDS) {
    if (!fieldIndices[field.id]) continue;
    const centroid = getFieldCentroid(field.id);
    clusters.push({
      label: field.label,
      shortLabel: field.id,
      x: centroid.x,
      y: centroid.y,
      z: centroid.z,
      color: field.color,
      count: fieldIndices[field.id].length,
    });
  }

  clusters.sort((a, b) => b.count - a.count);

  return { nodes, edges, clusters };
}
