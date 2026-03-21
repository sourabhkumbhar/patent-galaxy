import type { PatentNode, CitationEdge, Cluster, PatentData } from '../types/patent';
import { CPC_COLORS, CPC_SECTION_NAMES } from '../utils/colors';
import { generatePatentPosition, getSectionCentroid } from '../utils/spatial';

// ---------------------------------------------------------------------------
// Mulberry32 PRNG - deterministic 32-bit generator
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
// Weighted CPC section distribution
// ---------------------------------------------------------------------------
interface WeightedSection {
  section: string;
  weight: number;
}

const SECTION_WEIGHTS: WeightedSection[] = [
  { section: 'G', weight: 0.25 },
  { section: 'H', weight: 0.25 },
  { section: 'B', weight: 0.15 },
  { section: 'A', weight: 0.15 },
  { section: 'C', weight: 0.10 },
  { section: 'Y', weight: 0.05 },
  { section: 'F', weight: 0.05 },
  { section: 'E', weight: 0.03 },
  { section: 'D', weight: 0.02 },
];

function pickSection(rand: () => number): string {
  const r = rand();
  let cumulative = 0;
  for (const { section, weight } of SECTION_WEIGHTS) {
    cumulative += weight;
    if (r < cumulative) return section;
  }
  return 'G';
}

// ---------------------------------------------------------------------------
// Realistic CPC classes per section
// ---------------------------------------------------------------------------
const CPC_CLASSES: Record<string, string[]> = {
  A: ['A01', 'A21', 'A23', 'A41', 'A43', 'A47', 'A61', 'A62', 'A63'],
  B: ['B01', 'B05', 'B21', 'B23', 'B25', 'B29', 'B32', 'B60', 'B62', 'B64', 'B65'],
  C: ['C01', 'C02', 'C04', 'C07', 'C08', 'C09', 'C10', 'C12', 'C22', 'C23', 'C25'],
  D: ['D01', 'D02', 'D03', 'D04', 'D06', 'D21'],
  E: ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E21'],
  F: ['F01', 'F02', 'F03', 'F04', 'F15', 'F16', 'F17', 'F21', 'F23', 'F24', 'F25', 'F28'],
  G: ['G01', 'G02', 'G03', 'G05', 'G06', 'G07', 'G08', 'G09', 'G10', 'G11', 'G16'],
  H: ['H01', 'H02', 'H03', 'H04', 'H05', 'H10'],
  Y: ['Y02', 'Y04', 'Y10'],
};

const CPC_SUBCLASSES: Record<string, string[]> = {
  A01: ['A01B', 'A01C', 'A01D', 'A01G', 'A01K', 'A01N'],
  A21: ['A21B', 'A21C', 'A21D'],
  A23: ['A23B', 'A23C', 'A23G', 'A23L', 'A23N'],
  A41: ['A41B', 'A41D', 'A41F', 'A41G'],
  A43: ['A43B', 'A43C', 'A43D'],
  A47: ['A47B', 'A47C', 'A47G', 'A47J', 'A47L'],
  A61: ['A61B', 'A61C', 'A61F', 'A61K', 'A61L', 'A61M', 'A61N', 'A61P'],
  A62: ['A62B', 'A62C', 'A62D'],
  A63: ['A63B', 'A63C', 'A63F', 'A63G', 'A63H'],
  B01: ['B01D', 'B01F', 'B01J', 'B01L'],
  B05: ['B05B', 'B05C', 'B05D'],
  B21: ['B21B', 'B21C', 'B21D', 'B21F', 'B21J'],
  B23: ['B23B', 'B23C', 'B23D', 'B23K', 'B23P', 'B23Q'],
  B25: ['B25B', 'B25F', 'B25J'],
  B29: ['B29B', 'B29C', 'B29D', 'B29K', 'B29L'],
  B32: ['B32B'],
  B60: ['B60C', 'B60K', 'B60L', 'B60N', 'B60R', 'B60S', 'B60T', 'B60W'],
  B62: ['B62D', 'B62K', 'B62M'],
  B64: ['B64B', 'B64C', 'B64D', 'B64F', 'B64G'],
  B65: ['B65B', 'B65D', 'B65G', 'B65H'],
  C01: ['C01B', 'C01D', 'C01F', 'C01G'],
  C02: ['C02F'],
  C04: ['C04B'],
  C07: ['C07C', 'C07D', 'C07F', 'C07H', 'C07K'],
  C08: ['C08F', 'C08G', 'C08J', 'C08K', 'C08L'],
  C09: ['C09B', 'C09D', 'C09J', 'C09K'],
  C10: ['C10B', 'C10G', 'C10J', 'C10L', 'C10M'],
  C12: ['C12M', 'C12N', 'C12P', 'C12Q'],
  C22: ['C22B', 'C22C', 'C22F'],
  C23: ['C23C', 'C23F', 'C23G'],
  C25: ['C25B', 'C25D'],
  D01: ['D01D', 'D01F', 'D01G', 'D01H'],
  D02: ['D02G', 'D02J'],
  D03: ['D03C', 'D03D'],
  D04: ['D04B', 'D04H'],
  D06: ['D06B', 'D06C', 'D06F', 'D06L', 'D06M', 'D06N', 'D06P'],
  D21: ['D21B', 'D21C', 'D21D', 'D21F', 'D21G', 'D21H', 'D21J'],
  E01: ['E01B', 'E01C', 'E01D', 'E01F', 'E01H'],
  E02: ['E02B', 'E02D', 'E02F'],
  E03: ['E03B', 'E03C', 'E03D', 'E03F'],
  E04: ['E04B', 'E04C', 'E04D', 'E04F', 'E04G', 'E04H'],
  E05: ['E05B', 'E05C', 'E05D', 'E05F', 'E05G'],
  E06: ['E06B', 'E06C'],
  E21: ['E21B', 'E21C', 'E21D', 'E21F'],
  F01: ['F01B', 'F01C', 'F01D', 'F01K', 'F01L', 'F01M', 'F01N', 'F01P'],
  F02: ['F02B', 'F02C', 'F02D', 'F02F', 'F02G', 'F02K', 'F02M', 'F02N', 'F02P'],
  F03: ['F03B', 'F03C', 'F03D', 'F03G'],
  F04: ['F04B', 'F04C', 'F04D', 'F04F'],
  F15: ['F15B', 'F15C', 'F15D'],
  F16: ['F16B', 'F16C', 'F16D', 'F16F', 'F16G', 'F16H', 'F16J', 'F16K', 'F16L'],
  F17: ['F17C', 'F17D'],
  F21: ['F21K', 'F21L', 'F21S', 'F21V'],
  F23: ['F23B', 'F23C', 'F23D', 'F23G', 'F23J', 'F23K', 'F23L', 'F23M', 'F23N', 'F23Q', 'F23R'],
  F24: ['F24C', 'F24D', 'F24F', 'F24H', 'F24S', 'F24T'],
  F25: ['F25B', 'F25C', 'F25D', 'F25J'],
  F28: ['F28B', 'F28C', 'F28D', 'F28F', 'F28G'],
  G01: ['G01B', 'G01C', 'G01D', 'G01F', 'G01G', 'G01H', 'G01J', 'G01K', 'G01L', 'G01M', 'G01N', 'G01P', 'G01R', 'G01S', 'G01T', 'G01V', 'G01W'],
  G02: ['G02B', 'G02C', 'G02F'],
  G03: ['G03B', 'G03F', 'G03G', 'G03H'],
  G05: ['G05B', 'G05D', 'G05F', 'G05G'],
  G06: ['G06F', 'G06K', 'G06N', 'G06Q', 'G06T', 'G06V'],
  G07: ['G07B', 'G07C', 'G07D', 'G07F', 'G07G'],
  G08: ['G08B', 'G08C', 'G08G'],
  G09: ['G09B', 'G09F', 'G09G'],
  G10: ['G10H', 'G10K', 'G10L'],
  G11: ['G11B', 'G11C'],
  G16: ['G16B', 'G16H', 'G16Y'],
  H01: ['H01B', 'H01C', 'H01F', 'H01G', 'H01H', 'H01J', 'H01L', 'H01M', 'H01P', 'H01Q', 'H01R', 'H01S', 'H01T'],
  H02: ['H02B', 'H02G', 'H02H', 'H02J', 'H02K', 'H02M', 'H02N', 'H02P', 'H02S'],
  H03: ['H03B', 'H03C', 'H03D', 'H03F', 'H03G', 'H03H', 'H03K', 'H03L', 'H03M'],
  H04: ['H04B', 'H04J', 'H04K', 'H04L', 'H04M', 'H04N', 'H04Q', 'H04R', 'H04S', 'H04W'],
  H05: ['H05B', 'H05F', 'H05G', 'H05H', 'H05K'],
  H10: ['H10B', 'H10D', 'H10F', 'H10K', 'H10N'],
  Y02: ['Y02A', 'Y02B', 'Y02C', 'Y02D', 'Y02E', 'Y02P', 'Y02T', 'Y02W'],
  Y04: ['Y04S'],
  Y10: ['Y10S', 'Y10T'],
};

// ---------------------------------------------------------------------------
// Assignee pool
// ---------------------------------------------------------------------------
const ASSIGNEES_TECH = [
  'Apple Inc.', 'Google LLC', 'Microsoft Corporation', 'Amazon Technologies Inc.',
  'Meta Platforms Inc.', 'Samsung Electronics Co. Ltd.', 'Intel Corporation',
  'IBM Corporation', 'Qualcomm Incorporated', 'NVIDIA Corporation',
  'Sony Group Corporation', 'Huawei Technologies Co. Ltd.', 'LG Electronics Inc.',
  'Cisco Systems Inc.', 'Oracle Corporation', 'Adobe Inc.', 'Salesforce Inc.',
  'Texas Instruments Incorporated', 'Broadcom Inc.', 'Advanced Micro Devices Inc.',
  'Taiwan Semiconductor Manufacturing Co.', 'SK Hynix Inc.', 'Micron Technology Inc.',
  'Panasonic Holdings Corporation', 'Toshiba Corporation',
];

const ASSIGNEES_PHARMA = [
  'Pfizer Inc.', 'Johnson & Johnson', 'Roche Holding AG', 'Novartis AG',
  'Merck & Co. Inc.', 'AbbVie Inc.', 'Bristol-Myers Squibb Company',
  'AstraZeneca PLC', 'Eli Lilly and Company', 'Amgen Inc.',
  'Sanofi SA', 'GlaxoSmithKline PLC', 'Gilead Sciences Inc.',
  'Regeneron Pharmaceuticals Inc.', 'Moderna Inc.',
];

const ASSIGNEES_AUTO = [
  'Toyota Motor Corporation', 'Volkswagen AG', 'General Motors Company',
  'Ford Motor Company', 'BMW AG', 'Honda Motor Co. Ltd.',
  'Hyundai Motor Company', 'Tesla Inc.', 'Stellantis NV',
  'Nissan Motor Co. Ltd.', 'Rivian Automotive Inc.', 'BYD Company Limited',
];

const ASSIGNEES_INDUSTRIAL = [
  'General Electric Company', 'Siemens AG', 'Honeywell International Inc.',
  'Caterpillar Inc.', '3M Company', 'Robert Bosch GmbH',
  'ABB Ltd.', 'Schneider Electric SE', 'Emerson Electric Co.',
  'Mitsubishi Electric Corporation', 'BASF SE', 'Dow Inc.',
  'DuPont de Nemours Inc.', 'Corning Incorporated', 'Danaher Corporation',
];

const ASSIGNEES_UNIVERSITY = [
  'Massachusetts Institute of Technology', 'Stanford University',
  'University of California', 'California Institute of Technology',
  'Georgia Institute of Technology', 'Carnegie Mellon University',
  'University of Michigan', 'Tsinghua University', 'University of Tokyo',
  'ETH Zurich',
];

const SECTION_ASSIGNEE_POOLS: Record<string, string[][]> = {
  A: [ASSIGNEES_PHARMA, ASSIGNEES_TECH, ASSIGNEES_UNIVERSITY],
  B: [ASSIGNEES_AUTO, ASSIGNEES_INDUSTRIAL, ASSIGNEES_TECH],
  C: [ASSIGNEES_PHARMA, ASSIGNEES_INDUSTRIAL, ASSIGNEES_UNIVERSITY],
  D: [ASSIGNEES_INDUSTRIAL],
  E: [ASSIGNEES_INDUSTRIAL, ASSIGNEES_AUTO],
  F: [ASSIGNEES_INDUSTRIAL, ASSIGNEES_AUTO],
  G: [ASSIGNEES_TECH, ASSIGNEES_UNIVERSITY, ASSIGNEES_INDUSTRIAL],
  H: [ASSIGNEES_TECH, ASSIGNEES_INDUSTRIAL, ASSIGNEES_UNIVERSITY],
  Y: [ASSIGNEES_TECH, ASSIGNEES_INDUSTRIAL, ASSIGNEES_AUTO],
};

function pickAssignee(section: string, rand: () => number): string {
  const pools = SECTION_ASSIGNEE_POOLS[section] || [ASSIGNEES_TECH];
  const pool = pools[Math.floor(rand() * pools.length)];
  return pool[Math.floor(rand() * pool.length)];
}

// ---------------------------------------------------------------------------
// Patent title generation
// ---------------------------------------------------------------------------
const TITLE_TEMPLATES: Record<string, string[]> = {
  A: [
    'Method and apparatus for non-invasive blood glucose monitoring',
    'Wearable biosensor for continuous cardiac rhythm analysis',
    'Pharmaceutical composition for targeted cancer therapy delivery',
    'Robotic surgical system with haptic feedback control',
    'Antimicrobial wound dressing with sustained release mechanism',
    'Neural interface device for prosthetic limb control',
    'Biodegradable drug delivery implant with programmable release',
    'Automated diagnostic system for retinal disease detection',
    'Smart insulin delivery pump with predictive dosing algorithm',
    'Gene therapy vector for hereditary disorder treatment',
    'Microfluidic device for rapid pathogen identification',
    'Personalized nutrition system based on metabolic profiling',
    'Endoscopic imaging device with enhanced tissue visualization',
    'Oral vaccine delivery platform using engineered nanoparticles',
    'Assistive exoskeleton for rehabilitation of spinal cord injuries',
    'Point-of-care diagnostic cartridge for infectious disease screening',
    'Biocompatible scaffold for cartilage tissue regeneration',
    'Hearing aid with adaptive noise cancellation and speech enhancement',
    'Immunotherapy composition targeting tumor-specific neoantigens',
    'Surgical navigation system with augmented reality overlay',
  ],
  B: [
    'Autonomous vehicle path planning with dynamic obstacle avoidance',
    'Additive manufacturing system for multi-material metal printing',
    'Robotic arm with compliant joint mechanism for assembly tasks',
    'High-precision laser cutting apparatus for thin film materials',
    'Electric vehicle battery swap station with automated alignment',
    'Conveyor sorting system using machine vision classification',
    'Friction stir welding tool with real-time temperature control',
    'Drone delivery system with precision landing capability',
    'Injection molding apparatus with adaptive pressure regulation',
    'Automated warehouse system with collaborative mobile robots',
    'Vehicle suspension system with magnetorheological damping',
    'Ultrasonic bonding device for dissimilar material joining',
    'Packaging machine with integrated quality inspection module',
    'Lightweight composite wheel for electric passenger vehicles',
    'Roll-to-roll printing system for flexible electronic substrates',
    'Autonomous cargo vessel with collision avoidance navigation',
    'Hydraulic press with energy recovery braking system',
    'Multi-axis CNC machining center with vibration compensation',
    'Vehicle thermal management system for extended battery range',
    'Spacecraft docking mechanism with magnetic alignment guides',
  ],
  C: [
    'Catalyst composition for low-temperature CO2 hydrogenation',
    'Biodegradable polymer blend for single-use packaging applications',
    'Electrochemical process for selective rare earth element recovery',
    'Metal-organic framework for high-capacity hydrogen storage',
    'Photocatalytic water splitting system using visible light absorption',
    'Enzymatic process for cellulose conversion to platform chemicals',
    'Corrosion-resistant alloy coating for marine applications',
    'CRISPR-based nucleic acid detection assay with fluorescent readout',
    'Solid-state electrolyte composition for lithium metal batteries',
    'Bioplastic synthesis method from agricultural waste feedstock',
    'Nanostructured membrane for desalination with enhanced flux',
    'Thermosetting resin system with self-healing capability',
    'Process for synthesis of chiral pharmaceutical intermediates',
    'Carbon nanotube ink formulation for printed electronics',
    'Zeolite catalyst for selective methane oxidation to methanol',
    'High-entropy alloy composition for extreme temperature service',
    'Fermentation process for sustainable production of adipic acid',
    'Protective coating system with embedded corrosion indicators',
    'Sol-gel process for transparent conductive oxide thin films',
    'Recombinant protein expression system with enhanced folding',
  ],
  D: [
    'Electrospun nanofiber membrane for air filtration applications',
    'Smart textile with embedded temperature-regulating phase change material',
    'Sustainable dyeing process for cotton fabrics using supercritical CO2',
    'Nonwoven composite material for automotive sound insulation',
    'Self-cleaning fabric coating based on titanium dioxide nanoparticles',
    'Cellulose dissolution process for regenerated fiber production',
    'Warp knitting machine with electronic guide bar control',
    'Paper-based microfluidic device for diagnostic testing',
    'Flame-retardant fiber treatment without halogenated compounds',
    'Digital printing system for high-speed textile pattern application',
  ],
  E: [
    'Modular building system with integrated seismic isolation',
    'Tunnel boring machine with automated ground support installation',
    'Green roof system with integrated stormwater management',
    'Prefabricated concrete panel with thermal break connections',
    'Foundation system for offshore wind turbine installation',
    'Smart window assembly with electrochromic glazing control',
    'Geothermal heat exchange system for residential buildings',
    'Automated bricklaying system with mortar dispensing control',
    'Bridge deck monitoring system with embedded fiber optic sensors',
    'Earthquake-resistant steel frame connection with energy dissipation',
  ],
  F: [
    'High-efficiency heat pump system with variable-speed compressor',
    'Micro gas turbine with recuperator for distributed power generation',
    'Wind turbine blade pitch control with load-adaptive algorithm',
    'Scroll compressor with vapor injection for cold climate operation',
    'Thermal energy storage system using molten salt medium',
    'Hydraulic valve assembly with proportional flow regulation',
    'Combined heat and power unit with organic Rankine cycle',
    'LED lighting module with integrated thermal management',
    'Fuel cell cooling system with humidity-controlled air supply',
    'Cryogenic valve for liquefied natural gas transfer operations',
    'Centrifugal pump with magnetic bearing and sealless design',
    'Solar thermal collector with evacuated tube and heat pipe',
  ],
  G: [
    'Deep neural network accelerator with in-memory computation',
    'Quantum error correction method for surface code architectures',
    'LiDAR sensor array with solid-state beam steering mechanism',
    'Federated learning framework with differential privacy guarantees',
    'Optical coherence tomography system with adaptive optics correction',
    'Graph neural network for molecular property prediction',
    'MEMS inertial measurement unit with self-calibration routine',
    'Natural language processing model for multi-document summarization',
    'Spectroscopic sensor for real-time industrial process monitoring',
    'Homomorphic encryption processor for secure cloud computation',
    'Computer vision system for defect detection in semiconductor wafers',
    'Time-of-flight depth sensor with multi-frequency modulation',
    'Reinforcement learning agent for robotic manipulation planning',
    'Atomic clock with chip-scale vapor cell and laser interrogation',
    'Transformer architecture for long-range genomic sequence modeling',
    'Radar signal processing method for through-wall human detection',
    'Blockchain consensus protocol with reduced energy consumption',
    'Edge computing framework for distributed sensor data fusion',
    'Generative adversarial network for photorealistic image synthesis',
    'Calibration method for multi-sensor autonomous driving systems',
  ],
  H: [
    'Gallium nitride power transistor with enhanced breakdown voltage',
    'Massive MIMO antenna array for 5G base station deployment',
    'Solid-state battery with lithium metal anode and ceramic separator',
    'Silicon carbide inverter module for electric vehicle drivetrain',
    'Perovskite-silicon tandem solar cell with stabilized interface',
    'Wireless power transfer system with adaptive impedance matching',
    'Phase-locked loop circuit with low jitter and wide tuning range',
    'Spin-orbit torque magnetic memory with perpendicular anisotropy',
    'RF front-end module with integrated filter and low noise amplifier',
    'Organic light-emitting diode with solution-processed emissive layer',
    'Supercapacitor electrode with graphene-metal oxide composite',
    'Millimeter-wave beamforming network for satellite communications',
    'FinFET transistor structure with reduced parasitic capacitance',
    'Energy harvesting circuit for ambient radio frequency signals',
    'Three-dimensional NAND flash memory with charge trap structure',
    'High-voltage DC circuit breaker for offshore grid interconnection',
    'Optical transceiver module for 800 Gbps data center links',
    'Ferroelectric memory device with hafnium oxide gate stack',
    'Power management IC with dynamic voltage and frequency scaling',
    'Thermoelectric generator module for waste heat recovery',
  ],
  Y: [
    'Carbon capture system integrated with direct air collection',
    'Vehicle-to-grid bidirectional charging protocol for peak shaving',
    'Smart grid controller with renewable energy forecasting module',
    'Hydrogen electrolyzer with proton exchange membrane and catalyst',
    'Waste-to-energy gasification reactor with syngas purification',
    'Building energy management system with occupancy-based optimization',
    'Recyclable composite material for wind turbine blade fabrication',
    'Electric aircraft propulsion system with distributed motor array',
    'Industrial heat pump for process steam generation from waste heat',
    'Agrivoltaic system for simultaneous crop growth and power production',
  ],
};

function generateTitle(section: string, rand: () => number): string {
  const templates = TITLE_TEMPLATES[section] || TITLE_TEMPLATES['G'];
  return templates[Math.floor(rand() * templates.length)];
}

// ---------------------------------------------------------------------------
// Patent ID generation
// ---------------------------------------------------------------------------
const PATENT_KINDS = ['B1', 'B2', 'A1'];

function generatePatentId(index: number, rand: () => number): string {
  const number = 10000000 + index * 937 + Math.floor(rand() * 500);
  const kind = PATENT_KINDS[Math.floor(rand() * PATENT_KINDS.length)];
  return `US-${number}-${kind}`;
}

// ---------------------------------------------------------------------------
// Power-law citation count
// ---------------------------------------------------------------------------
function generateCitationCount(rand: () => number): number {
  // Inverse transform sampling from a truncated Pareto-like distribution.
  // Most patents get 0-5 citations; a few reach 100+.
  const u = rand();
  if (u < 0.35) return 0;
  if (u < 0.55) return 1;
  if (u < 0.68) return 2;
  if (u < 0.78) return 3;
  if (u < 0.84) return Math.floor(4 + rand() * 3); // 4-6
  if (u < 0.90) return Math.floor(7 + rand() * 5); // 7-11
  if (u < 0.95) return Math.floor(12 + rand() * 18); // 12-29
  if (u < 0.98) return Math.floor(30 + rand() * 40); // 30-69
  if (u < 0.995) return Math.floor(70 + rand() * 60); // 70-129
  return Math.floor(130 + rand() * 200); // 130-329
}

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------
const TOTAL_NODES = 50000;
const TOTAL_EDGES = 150000;
const SEED = 42;

export function generateMockData(): PatentData {
  const rand = mulberry32(SEED);

  // Override Math.random so that generatePatentPosition uses our seeded PRNG
  const originalRandom = Math.random;
  Math.random = rand;

  try {
    return generateDataInternal(rand);
  } finally {
    Math.random = originalRandom;
  }
}

function generateDataInternal(rand: () => number): PatentData {
  // ----- Nodes -----
  const nodes: PatentNode[] = [];
  const sectionIndices: Record<string, number[]> = {};

  for (let i = 0; i < TOTAL_NODES; i++) {
    const section = pickSection(rand);
    const classes = CPC_CLASSES[section];
    const cpcClass = classes[Math.floor(rand() * classes.length)];
    const subclasses = CPC_SUBCLASSES[cpcClass];
    const cpcSubclass = subclasses
      ? subclasses[Math.floor(rand() * subclasses.length)]
      : cpcClass + 'B';

    const year = 2010 + Math.floor(rand() * 15); // 2010-2024
    const month = 1 + Math.floor(rand() * 12);
    const citationCount = generateCitationCount(rand);
    const inventorCount = 1 + Math.floor(rand() * rand() * 12); // skewed toward 1-3

    const pos = generatePatentPosition(section, cpcClass, year);

    const node: PatentNode = {
      id: generatePatentId(i, rand),
      title: generateTitle(section, rand),
      year,
      month,
      cpcSection: section,
      cpcClass,
      cpcSubclass,
      assignee: pickAssignee(section, rand),
      inventorCount,
      citationCount,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      color: CPC_COLORS[section] || '#ffffff',
      size: Math.max(0.3, Math.log2(citationCount + 1) * 0.4),
    };

    nodes.push(node);

    if (!sectionIndices[section]) {
      sectionIndices[section] = [];
    }
    sectionIndices[section].push(i);
  }

  // ----- Edges -----
  const edges: CitationEdge[] = [];
  const edgeSet = new Set<string>();
  const allSections = Object.keys(sectionIndices);

  let attempts = 0;
  while (edges.length < TOTAL_EDGES && attempts < TOTAL_EDGES * 5) {
    attempts++;

    // Pick a random source node
    const sourceIdx = Math.floor(rand() * TOTAL_NODES);
    const sourceSection = nodes[sourceIdx].cpcSection;

    let targetIdx: number;

    if (rand() < 0.7) {
      // Intra-section citation (70%)
      const pool = sectionIndices[sourceSection];
      targetIdx = pool[Math.floor(rand() * pool.length)];
    } else {
      // Cross-section citation (30%)
      const otherSections = allSections.filter(s => s !== sourceSection);
      const targetSection = otherSections[Math.floor(rand() * otherSections.length)];
      const pool = sectionIndices[targetSection];
      targetIdx = pool[Math.floor(rand() * pool.length)];
    }

    // No self-citations, no duplicate edges
    if (sourceIdx === targetIdx) continue;

    // Citations generally go from newer to older patents
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
  for (const section of allSections) {
    const centroid = getSectionCentroid(section);
    clusters.push({
      label: CPC_SECTION_NAMES[section] || section,
      shortLabel: section,
      x: centroid.x,
      y: centroid.y,
      z: centroid.z,
      color: CPC_COLORS[section] || '#ffffff',
      count: sectionIndices[section].length,
    });
  }

  // Sort clusters by count descending so the largest sections appear first
  clusters.sort((a, b) => b.count - a.count);

  return { nodes, edges, clusters };
}
