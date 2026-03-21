/**
 * Process PatentsView bulk TSV data into the Patent Galaxy JSON format.
 *
 * Prerequisites — download these files into data-pipeline/raw/:
 *   1. g_patent.tsv.zip          (~230 MB)  https://s3.amazonaws.com/data.patentsview.org/download/g_patent.tsv.zip
 *   2. g_cpc_current.tsv.zip     (~495 MB)  https://s3.amazonaws.com/data.patentsview.org/download/g_cpc_current.tsv.zip
 *   3. g_us_patent_citation.tsv.zip (~2.2 GB) https://s3.amazonaws.com/data.patentsview.org/download/g_us_patent_citation.tsv.zip
 *
 * Run:  npm run fetch-data
 */

import { createReadStream, writeFileSync, mkdirSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// ── Config ─────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = resolve(__dirname, '../data-pipeline/raw');
const OUTPUT_PATH = resolve(__dirname, '../public/data/patents.json');

const TARGET_PATENTS = 100_000;
const MIN_YEAR = 2010;
const MAX_YEAR = 2025;

// ── CPC colors & sections ──────────────────────────────────────────────

const CPC_COLORS: Record<string, string> = {
  A: '#ff5577', B: '#22d3ee', C: '#ffb020', D: '#a855f7',
  E: '#34d399', F: '#f97316', G: '#60a5fa', H: '#facc15', Y: '#c084fc',
};
const CPC_SECTION_NAMES: Record<string, string> = {
  A: 'Human Necessities', B: 'Operations & Transport', C: 'Chemistry & Metallurgy',
  D: 'Textiles & Paper', E: 'Fixed Constructions', F: 'Mechanical Engineering',
  G: 'Physics', H: 'Electricity', Y: 'Emerging Tech',
};
const CPC_SECTIONS = Object.keys(CPC_COLORS);

// ── Spatial positioning ────────────────────────────────────────────────

function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SECTION_ANGLES: Record<string, number> = {};
CPC_SECTIONS.forEach((s, i) => { SECTION_ANGLES[s] = (i / CPC_SECTIONS.length) * Math.PI * 2; });

function getSectionCentroid(section: string) {
  const angle = SECTION_ANGLES[section] ?? 0;
  const r = 130;
  const elev = ((CPC_SECTIONS.indexOf(section) % 3) - 1) * 34;
  return { x: Math.cos(angle) * r, y: elev, z: Math.sin(angle) * r };
}

function genPos(section: string, cpcClass: string, rand: () => number) {
  const c = getSectionCentroid(section);
  const cn = parseInt(cpcClass.replace(/\D/g, ''), 10) || 0;
  const co = (cn % 20) * 2.5;
  const sx = (rand() + rand() + rand() - 1.5) * 42;
  const sy = (rand() + rand() + rand() - 1.5) * 42;
  const sz = (rand() + rand() + rand() - 1.5) * 42;
  return {
    x: +(c.x + sx + co * Math.cos(cn)).toFixed(1),
    y: +(c.y + sy).toFixed(1),
    z: +(c.z + sz + co * Math.sin(cn)).toFixed(1),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

function ensureUnzipped(zipName: string): string {
  const zipPath = resolve(RAW_DIR, zipName);
  const tsvName = zipName.replace('.zip', '');
  const tsvPath = resolve(RAW_DIR, tsvName);

  if (!existsSync(zipPath)) {
    console.error(`Missing file: ${zipPath}`);
    console.error(`Download from: https://s3.amazonaws.com/data.patentsview.org/download/${zipName}`);
    process.exit(1);
  }

  if (!existsSync(tsvPath)) {
    console.log(`  Unzipping ${zipName}...`);
    execSync(`unzip -o "${zipPath}" -d "${RAW_DIR}"`, { stdio: 'pipe' });
  }

  return tsvPath;
}

async function streamTsv(
  filePath: string,
  onHeaders: (headers: string[]) => void,
  onRow: (cols: string[]) => void,
  label: string,
) {
  const stream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let count = 0;
  let isFirst = true;

  for await (const line of rl) {
    if (isFirst) {
      const headers = line.split('\t').map(h => h.replace(/"/g, '').trim());
      onHeaders(headers);
      isFirst = false;
      continue;
    }
    count++;
    if (count % 1_000_000 === 0) {
      console.log(`  ${label}: processed ${(count / 1_000_000).toFixed(1)}M rows...`);
    }
    const cols = line.split('\t').map(c => c.replace(/^"|"$/g, '').trim());
    onRow(cols);
  }

  console.log(`  ${label}: ${count.toLocaleString()} rows total`);
}

function colIndex(headers: string[], name: string): number {
  const idx = headers.indexOf(name);
  if (idx === -1) {
    // Try without quotes
    const idx2 = headers.findIndex(h => h.replace(/"/g, '') === name);
    if (idx2 === -1) throw new Error(`Column "${name}" not found. Headers: ${headers.join(', ')}`);
    return idx2;
  }
  return idx;
}

// ── Annualized CSV download (for assignees & inventor counts) ──────

async function fetchAnnualizedData(
  patentIds: Set<string>,
): Promise<Map<string, { assignee: string; teamSize: number }>> {
  const result = new Map<string, { assignee: string; teamSize: number }>();
  let remaining = patentIds.size;

  for (let year = MIN_YEAR; year <= MAX_YEAR; year++) {
    if (remaining <= 0) break;
    const url = `https://annualized-gender-data-uspto.s3.amazonaws.com/${year}.csv`;
    console.log(`  Fetching annualized data for ${year}...`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`    Skipped ${year} (HTTP ${response.status})`);
        continue;
      }

      // Stream the response line by line to avoid loading entire CSV into memory
      const reader = response.body?.getReader();
      if (!reader) continue;

      const decoder = new TextDecoder();
      let buffer = '';
      let headerParsed = false;
      let pnIdx = -1, assIdx = -1, tsIdx = -1;
      let matched = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete last line

        for (const line of lines) {
          if (!headerParsed) {
            const header = line.split(',');
            pnIdx = header.indexOf('patent_number');
            assIdx = header.indexOf('assignee');
            tsIdx = header.indexOf('team_size');
            headerParsed = true;
            if (pnIdx === -1 || assIdx === -1) break;
            continue;
          }
          const cols = line.split(',');
          const pid = cols[pnIdx];
          if (patentIds.has(pid) && !result.has(pid)) {
            result.set(pid, {
              assignee: cols[assIdx] || 'Individual Inventor',
              teamSize: parseInt(cols[tsIdx], 10) || 1,
            });
            matched++;
            remaining--;
          }
        }
      }
      console.log(`    ${year}: matched ${matched.toLocaleString()} patents`);
    } catch (err) {
      console.log(`    Error fetching ${year}: ${(err as Error).message}`);
    }
  }

  return result;
}

// ── Main Pipeline ──────────────────────────────────────────────────────

async function main() {
  console.log('=== Patent Galaxy Data Pipeline (Bulk TSV) ===\n');

  // ── Step 1: Parse g_patent.tsv — collect recent utility patents ──

  console.log('Step 1/5: Reading patent data...');
  const patentTsv = ensureUnzipped('g_patent.tsv.zip');

  interface RawPatent {
    patentId: string;
    title: string;
    year: number;
    month: number;
  }

  const allPatents: RawPatent[] = [];
  let pTypeIdx = 0, pDateIdx = 0, pTitleIdx = 0, pIdIdx = 0, pWithdrawnIdx = -1;

  await streamTsv(patentTsv,
    (headers) => {
      pIdIdx = colIndex(headers, 'patent_id');
      pTypeIdx = colIndex(headers, 'patent_type');
      pDateIdx = colIndex(headers, 'patent_date');
      pTitleIdx = colIndex(headers, 'patent_title');
      pWithdrawnIdx = headers.indexOf('withdrawn');
    },
    (cols) => {
      if (cols[pTypeIdx] !== 'utility') return;
      if (pWithdrawnIdx !== -1 && cols[pWithdrawnIdx] === '1') return;

      const dateStr = cols[pDateIdx];
      const year = parseInt(dateStr?.substring(0, 4), 10);
      if (isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) return;

      allPatents.push({
        patentId: cols[pIdIdx],
        title: (cols[pTitleIdx] || 'Untitled Patent').slice(0, 100),
        year,
        month: parseInt(dateStr?.substring(5, 7), 10) || 1,
      });
    },
    'g_patent',
  );

  console.log(`\n  Found ${allPatents.length.toLocaleString()} utility patents (${MIN_YEAR}-${MAX_YEAR})`);

  // Build lookup of all eligible patent IDs for citation counting
  const allPatentIdSet = new Set(allPatents.map(p => p.patentId));

  // ── Step 2: Count internal citations per patent ──

  console.log('Step 2/6: Counting citations per patent (this may take a while)...');
  const citTsv = ensureUnzipped('g_us_patent_citation.tsv.zip');

  const citationCount = new Map<string, number>();
  let eCitingIdx = 0, eCitedIdx = 0;

  await streamTsv(citTsv,
    (headers) => {
      eCitingIdx = colIndex(headers, 'patent_id');
      eCitedIdx = colIndex(headers, 'citation_patent_id');
    },
    (cols) => {
      const citing = cols[eCitingIdx];
      const cited = cols[eCitedIdx];

      // Count only citations where both patents are in our year range
      if (allPatentIdSet.has(citing) && allPatentIdSet.has(cited) && citing !== cited) {
        citationCount.set(citing, (citationCount.get(citing) || 0) + 1);
        citationCount.set(cited, (citationCount.get(cited) || 0) + 1);
      }
    },
    'g_us_patent_citation',
  );

  console.log(`  ${citationCount.size.toLocaleString()} patents have internal citations`);

  // ── Select top 100k most-connected patents ──

  // Sort by citation count descending, then take top TARGET_PATENTS
  allPatents.sort((a, b) => {
    const ca = citationCount.get(a.patentId) || 0;
    const cb = citationCount.get(b.patentId) || 0;
    return cb - ca; // highest citation count first
  });

  const selectedPatents = allPatents.slice(0, TARGET_PATENTS);

  // Sort by date for consistent output
  selectedPatents.sort((a, b) => a.year - b.year || a.month - b.month);

  const selectedIds = new Set(selectedPatents.map(p => p.patentId));
  const patentIdToIndex = new Map<string, number>();
  selectedPatents.forEach((p, i) => patentIdToIndex.set(p.patentId, i));

  const minCitations = citationCount.get(selectedPatents[selectedPatents.length - 1]?.patentId) || 0;
  console.log(`  Selected ${selectedPatents.length.toLocaleString()} most-connected patents (min ${minCitations} internal citations)\n`);

  // Free memory — no longer needed
  allPatentIdSet.clear();
  citationCount.clear();

  // ── Step 3: Parse g_cpc_current.tsv — get CPC for selected patents ──

  console.log('Step 3/6: Reading CPC classifications...');
  const cpcTsv = ensureUnzipped('g_cpc_current.tsv.zip');

  const patentCpc = new Map<string, { section: string; cpcClass: string; subclass: string }>();
  let cPidIdx = 0, cSecIdx = 0, cClsIdx = -1, cSubIdx = -1, cSeqIdx = -1;

  await streamTsv(cpcTsv,
    (headers) => {
      cPidIdx = colIndex(headers, 'patent_id');
      cSecIdx = colIndex(headers, 'cpc_section');
      cClsIdx = headers.indexOf('cpc_class');
      cSubIdx = headers.indexOf('cpc_subclass');
      cSeqIdx = headers.indexOf('cpc_sequence');
    },
    (cols) => {
      const pid = cols[cPidIdx];
      if (!selectedIds.has(pid)) return;
      if (patentCpc.has(pid)) return; // keep only first (primary) CPC
      if (cSeqIdx !== -1 && cols[cSeqIdx] !== '0') return;

      const section = cols[cSecIdx];
      if (!CPC_COLORS[section]) return;

      patentCpc.set(pid, {
        section,
        cpcClass: cClsIdx !== -1 ? cols[cClsIdx] : section + '00',
        subclass: cSubIdx !== -1 ? cols[cSubIdx] : (cClsIdx !== -1 ? cols[cClsIdx] : section + '00'),
      });
    },
    'g_cpc_current',
  );

  console.log(`  CPC data for ${patentCpc.size.toLocaleString()} patents\n`);

  // ── Step 4: Re-scan citations for selected patents to build edges ──

  console.log('Step 4/6: Building citation edges for selected patents...');

  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();

  await streamTsv(citTsv,
    (headers) => {
      eCitingIdx = colIndex(headers, 'patent_id');
      eCitedIdx = colIndex(headers, 'citation_patent_id');
    },
    (cols) => {
      const srcIdx = patentIdToIndex.get(cols[eCitingIdx]);
      const tgtIdx = patentIdToIndex.get(cols[eCitedIdx]);

      if (srcIdx !== undefined && tgtIdx !== undefined && srcIdx !== tgtIdx) {
        const key = `${srcIdx}-${tgtIdx}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push([srcIdx, tgtIdx]);
        }
      }
    },
    'g_us_patent_citation',
  );

  // Cap edges for file size — 500k edges is plenty for the visualization
  // (ConnectionLines only shows edges for the selected/hovered patent)
  const MAX_EDGES = 500_000;
  if (edges.length > MAX_EDGES) {
    // Shuffle and truncate to keep a diverse sample
    const edgeRand = mulberry32(99);
    for (let i = edges.length - 1; i > 0; i--) {
      const j = Math.floor(edgeRand() * (i + 1));
      [edges[i], edges[j]] = [edges[j], edges[i]];
    }
    edges.length = MAX_EDGES;
  }

  console.log(`  Found ${edges.length.toLocaleString()} citation edges (capped at ${MAX_EDGES.toLocaleString()})\n`);

  // ── Step 5: Fetch annualized CSVs for assignees & inventor counts ──

  console.log('Step 5/6: Fetching assignee/inventor data from annualized CSVs...');
  const annualData = await fetchAnnualizedData(selectedIds);
  console.log(`  Annualized data for ${annualData.size.toLocaleString()} patents\n`);

  // ── Step 6: Build output ─────────────────────────────────────────

  console.log('Step 6/6: Building output...');
  const posRand = mulberry32(42);

  // Count citations per patent for sizing
  const citationCounts = new Map<string, number>();
  for (const [src, tgt] of edges) {
    const srcId = selectedPatents[src].patentId;
    const tgtId = selectedPatents[tgt].patentId;
    citationCounts.set(tgtId, (citationCounts.get(tgtId) ?? 0) + 1); // cited patent gains a citation
    // Also count for citing patent (outgoing)
    if (!citationCounts.has(srcId)) citationCounts.set(srcId, 0);
  }

  const nodes = {
    id: [] as string[],
    title: [] as string[],
    year: [] as number[],
    month: [] as number[],
    cpcSection: [] as string[],
    cpcClass: [] as string[],
    cpcSubclass: [] as string[],
    assignee: [] as string[],
    inventorCount: [] as number[],
    citationCount: [] as number[],
    x: [] as number[],
    y: [] as number[],
    z: [] as number[],
    color: [] as string[],
    size: [] as number[],
  };

  let skipped = 0;
  const finalIndexMap = new Map<number, number>(); // old index → new index

  for (let i = 0; i < selectedPatents.length; i++) {
    const p = selectedPatents[i];
    const cpc = patentCpc.get(p.patentId);
    if (!cpc) { skipped++; continue; }

    const annual = annualData.get(p.patentId);
    const citCount = citationCounts.get(p.patentId) ?? 0;
    const pos = genPos(cpc.section, cpc.cpcClass, posRand);
    const color = CPC_COLORS[cpc.section];
    const size = +Math.max(0.3, Math.log2(citCount + 1) * 0.4).toFixed(3);

    finalIndexMap.set(i, nodes.id.length);

    nodes.id.push(`US-${p.patentId}`);
    nodes.title.push(p.title);
    nodes.year.push(p.year);
    nodes.month.push(p.month);
    nodes.cpcSection.push(cpc.section);
    nodes.cpcClass.push(cpc.cpcClass);
    nodes.cpcSubclass.push(cpc.subclass);
    nodes.assignee.push((annual?.assignee || 'Individual Inventor').slice(0, 50));
    nodes.inventorCount.push(annual?.teamSize || 1);
    nodes.citationCount.push(citCount);
    nodes.x.push(pos.x);
    nodes.y.push(pos.y);
    nodes.z.push(pos.z);
    nodes.color.push(color);
    nodes.size.push(size);
  }

  if (skipped > 0) {
    console.log(`  Skipped ${skipped.toLocaleString()} patents without CPC data`);
  }

  // Remap edges to new indices
  const finalEdges: [number, number][] = [];
  for (const [src, tgt] of edges) {
    const newSrc = finalIndexMap.get(src);
    const newTgt = finalIndexMap.get(tgt);
    if (newSrc !== undefined && newTgt !== undefined) {
      finalEdges.push([newSrc, newTgt]);
    }
  }

  // Clusters
  const clusterCounts = new Map<string, number>();
  for (const s of nodes.cpcSection) {
    clusterCounts.set(s, (clusterCounts.get(s) ?? 0) + 1);
  }
  const clusters = CPC_SECTIONS.filter(s => clusterCounts.has(s)).map(section => {
    const centroid = getSectionCentroid(section);
    return {
      label: CPC_SECTION_NAMES[section],
      shortLabel: section,
      x: +centroid.x.toFixed(2),
      y: +centroid.y.toFixed(2),
      z: +centroid.z.toFixed(2),
      color: CPC_COLORS[section],
      count: clusterCounts.get(section) ?? 0,
    };
  });

  // Year bounds
  let minYear = Infinity, maxYear = -Infinity;
  for (const y of nodes.year) {
    if (y < minYear) minYear = y;
    if (y > maxYear) maxYear = y;
  }

  // Write
  const output = {
    meta: { minYear, maxYear, count: nodes.id.length },
    nodes,
    edges: finalEdges,
    clusters,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const json = JSON.stringify(output);
  writeFileSync(OUTPUT_PATH, json);

  const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(1);
  console.log(`\n=== Done! ===`);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`  ${nodes.id.length.toLocaleString()} patents, ${finalEdges.length.toLocaleString()} citation edges`);
  console.log(`  Year range: ${minYear}-${maxYear}`);
  console.log(`  File size: ${sizeMB} MB`);
  console.log(`  Clusters: ${clusters.map(c => `${c.shortLabel}(${c.count})`).join(', ')}`);
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
