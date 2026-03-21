/**
 * Download and process arXiv paper data using OpenAlex (free, no API key).
 *
 * Prerequisites:
 *   1. Download arXiv metadata from Kaggle (for category data):
 *        pip install kaggle
 *        kaggle datasets download -d Cornell-University/arxiv
 *        Unzip into data-pipeline/raw/
 *        (creates data-pipeline/raw/arxiv-metadata-oai-snapshot.json)
 *
 * No API key needed. OpenAlex is completely free and open.
 *
 * Run:  npm run fetch-papers
 */

import { createReadStream, writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Config ─────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = resolve(__dirname, '../data-pipeline/raw');
const CACHE_DIR = resolve(__dirname, '../data-pipeline/cache/papers');
const OUTPUT_PATH = resolve(__dirname, '../public/data/papers.json');

const TARGET_PAPERS = 100_000;
const MAX_EDGES = 500_000;
const MIN_YEAR = 2010;

// OpenAlex config
const OPENALEX_BASE = 'https://api.openalex.org/works';
const ARXIV_SOURCE_ID = 'S4306400194';
const PER_PAGE = 200;
const RATE_LIMIT_MS = 120; // ~8/sec, safely under 10/sec limit

// ── arXiv category mapping ─────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  cs: '#00d4ff', math: '#ff5577', physics: '#a855f7', stat: '#34d399',
  eess: '#facc15', 'q-bio': '#f97316', 'q-fin': '#60a5fa', econ: '#fb7185',
};

const CATEGORY_NAMES: Record<string, string> = {
  cs: 'Computer Science', math: 'Mathematics', physics: 'Physics',
  stat: 'Statistics', eess: 'Electrical Engineering',
  'q-bio': 'Quantitative Biology', 'q-fin': 'Quantitative Finance', econ: 'Economics',
};

const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);

function getMainCategory(arxivCat: string): string | null {
  if (arxivCat.startsWith('cs.')) return 'cs';
  if (arxivCat.startsWith('math.') || arxivCat === 'math-ph') return 'math';
  if (arxivCat.startsWith('stat.')) return 'stat';
  if (arxivCat.startsWith('eess.')) return 'eess';
  if (arxivCat.startsWith('q-bio.')) return 'q-bio';
  if (arxivCat.startsWith('q-fin.')) return 'q-fin';
  if (arxivCat.startsWith('econ.')) return 'econ';
  if (
    arxivCat.startsWith('hep-') || arxivCat.startsWith('cond-mat') ||
    arxivCat.startsWith('quant-ph') || arxivCat.startsWith('astro-ph') ||
    arxivCat.startsWith('gr-qc') || arxivCat.startsWith('nucl-') ||
    arxivCat.startsWith('physics.') || arxivCat.startsWith('nlin.')
  ) return 'physics';
  return null;
}

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

const CATEGORY_ANGLES: Record<string, number> = {};
ALL_CATEGORIES.forEach((c, i) => { CATEGORY_ANGLES[c] = (i / ALL_CATEGORIES.length) * Math.PI * 2; });

function getCategoryCentroid(cat: string) {
  const angle = CATEGORY_ANGLES[cat] ?? 0;
  const r = 130;
  const idx = ALL_CATEGORIES.indexOf(cat);
  const elev = ((idx % 3) - 1) * 34;
  return { x: Math.cos(angle) * r, y: elev, z: Math.sin(angle) * r };
}

function genPos(mainCat: string, subCat: string, rand: () => number) {
  const c = getCategoryCentroid(mainCat);
  const subNum = subCat.charCodeAt(subCat.length - 1) || 0;
  const subOffset = (subNum % 15) * 2.5;
  const sx = (rand() + rand() + rand() - 1.5) * 42;
  const sy = (rand() + rand() + rand() - 1.5) * 42;
  const sz = (rand() + rand() + rand() - 1.5) * 42;
  return {
    x: +(c.x + sx + subOffset * Math.cos(subNum)).toFixed(1),
    y: +(c.y + sy).toFixed(1),
    z: +(c.z + sz + subOffset * Math.sin(subNum)).toFixed(1),
  };
}

// ── OpenAlex API helpers ───────────────────────────────────────────────

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const response = await fetch(url);

  if (response.status === 429) {
    console.log('    Rate limited, waiting 5s...');
    await new Promise(r => setTimeout(r, 5000));
    lastRequestTime = Date.now();
    return fetch(url);
  }

  return response;
}

function extractArxivId(landingPageUrl: string | null | undefined): string | null {
  if (!landingPageUrl) return null;
  // Handles both "https://arxiv.org/abs/2301.12345" and "http://arxiv.org/abs/hep-th/9901001"
  const match = landingPageUrl.match(/arxiv\.org\/abs\/(.+)$/);
  return match ? match[1] : null;
}

function extractOpenAlexId(fullId: string): string {
  // "https://openalex.org/W2741809807" -> "W2741809807"
  return fullId.replace('https://openalex.org/', '');
}

// ── Parse first author from arXiv authors_parsed field ─────────────────

function parseFirstAuthor(authorsParsed: string[][] | undefined): string {
  if (!authorsParsed || authorsParsed.length === 0) return 'Unknown';
  const entry = authorsParsed[0];
  const last = entry[0] || '';
  const first = entry[1] || '';
  const name = `${first} ${last}`.trim();
  return name || 'Unknown';
}

// ── Main Pipeline ──────────────────────────────────────────────────────

interface ArxivMeta {
  title: string;
  primaryCategory: string;
  mainCategory: string;
  firstAuthor: string;
  coauthorCount: number;
  year: number;
  month: number;
}

async function main() {
  console.log('=== Paper Synapse Data Pipeline (OpenAlex) ===\n');

  mkdirSync(CACHE_DIR, { recursive: true });

  // ── Step 1: Parse arXiv metadata JSONL ──

  console.log('Step 1/6: Parsing arXiv metadata for category data...');
  const arxivPath = resolve(RAW_DIR, 'arxiv-metadata-oai-snapshot.json');

  if (!existsSync(arxivPath)) {
    console.error(`Missing file: ${arxivPath}`);
    console.error('Download from Kaggle:');
    console.error('  pip install kaggle');
    console.error('  kaggle datasets download -d Cornell-University/arxiv');
    console.error(`  unzip arxiv.zip -d ${RAW_DIR}/`);
    process.exit(1);
  }

  const arxivMeta = new Map<string, ArxivMeta>();
  const rl = createInterface({
    input: createReadStream(arxivPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (lineCount % 500_000 === 0) {
      console.log(`  Parsed ${(lineCount / 1_000_000).toFixed(1)}M lines (${arxivMeta.size.toLocaleString()} kept)...`);
    }

    try {
      const obj = JSON.parse(line);
      const id: string = obj.id;
      if (!id) continue;

      // Parse date
      let year: number;
      let month: number;
      if (obj.update_date) {
        year = parseInt(obj.update_date.substring(0, 4), 10);
        month = parseInt(obj.update_date.substring(5, 7), 10) || 1;
      } else if (obj.versions?.[0]?.created) {
        const d = new Date(obj.versions[0].created);
        year = d.getFullYear();
        month = d.getMonth() + 1;
      } else {
        continue;
      }

      if (isNaN(year) || year < MIN_YEAR) continue;

      const categories: string = obj.categories || '';
      const primaryCat = categories.split(/\s+/)[0];
      if (!primaryCat) continue;

      const mainCat = getMainCategory(primaryCat);
      if (!mainCat) continue;

      const authorsParsed: string[][] | undefined = obj.authors_parsed;
      const authorCount = authorsParsed?.length ?? 1;

      arxivMeta.set(id, {
        title: (obj.title || 'Untitled').replace(/\s+/g, ' ').trim().slice(0, 120),
        primaryCategory: primaryCat,
        mainCategory: mainCat,
        firstAuthor: parseFirstAuthor(authorsParsed).slice(0, 50),
        coauthorCount: Math.max(0, authorCount - 1),
        year,
        month,
      });
    } catch {
      // Skip malformed lines
    }
  }

  console.log(`  ${arxivMeta.size.toLocaleString()} arXiv papers (${MIN_YEAR}+) from ${lineCount.toLocaleString()} lines\n`);

  // ── Step 2: Fetch top arXiv papers from OpenAlex by citation count ──

  console.log('Step 2/6: Fetching top-cited arXiv papers from OpenAlex...');
  console.log('  No API key needed. Using cursor pagination at ~8 req/sec.\n');

  interface FetchedPaper {
    arxivId: string;
    openAlexId: string;
    citedByCount: number;
    referencedWorks: string[]; // OpenAlex IDs
    // From OpenAlex (fallback if arXiv metadata unavailable)
    oaTitle: string;
    oaFirstAuthor: string;
    oaAuthorCount: number;
    oaDate: string;
  }

  const fetched: FetchedPaper[] = [];
  let cursor = '*';
  let pageNum = 0;
  const overFetchTarget = TARGET_PAPERS + 20_000; // fetch extra to account for non-matches

  const summaryCache = resolve(CACHE_DIR, 'openalex_summary.json');
  let usedCache = false;

  if (existsSync(summaryCache)) {
    console.log('  Found cached OpenAlex results, loading...');
    const cached: FetchedPaper[] = JSON.parse(readFileSync(summaryCache, 'utf-8'));
    for (const item of cached) fetched.push(item);
    usedCache = true;
    console.log(`  Loaded ${fetched.length.toLocaleString()} cached papers\n`);
  }

  if (!usedCache) {
    while (fetched.length < overFetchTarget) {
      const url =
        `${OPENALEX_BASE}?` +
        `filter=primary_location.source.id:${ARXIV_SOURCE_ID},from_publication_date:${MIN_YEAR}-01-01` +
        `&sort=cited_by_count:desc` +
        `&per_page=${PER_PAGE}` +
        `&cursor=${encodeURIComponent(cursor)}` +
        `&select=id,title,cited_by_count,referenced_works,primary_location,authorships,publication_date`;

      const cacheFile = resolve(CACHE_DIR, `page_${pageNum}.json`);
      let data: Record<string, unknown>;

      if (existsSync(cacheFile)) {
        data = JSON.parse(readFileSync(cacheFile, 'utf-8'));
      } else {
        const response = await rateLimitedFetch(url);
        if (!response.ok) {
          console.error(`  OpenAlex error: ${response.status} ${response.statusText}`);
          const text = await response.text();
          console.error(`  ${text.slice(0, 300)}`);
          break;
        }
        data = await response.json() as Record<string, unknown>;
        writeFileSync(cacheFile, JSON.stringify(data));
      }

      const meta = data.meta as { next_cursor: string | null; count: number };
      const results = data.results as Record<string, unknown>[];

      if (!results || results.length === 0) break;

      for (const work of results) {
        const primaryLocation = work.primary_location as Record<string, unknown> | null;
        const landingUrl = primaryLocation?.landing_page_url as string | null;
        const arxivId = extractArxivId(landingUrl);
        if (!arxivId) continue;

        const openAlexId = extractOpenAlexId(work.id as string);
        const authorships = work.authorships as { author: { display_name: string }; author_position: string }[] | null;
        const firstAuthor = authorships?.find(a => a.author_position === 'first')?.author?.display_name
          || authorships?.[0]?.author?.display_name
          || 'Unknown';

        const referencedWorks = (work.referenced_works as string[] || []).map(extractOpenAlexId);

        fetched.push({
          arxivId,
          openAlexId,
          citedByCount: (work.cited_by_count as number) || 0,
          referencedWorks,
          oaTitle: ((work.title as string) || 'Untitled').slice(0, 120),
          oaFirstAuthor: firstAuthor.slice(0, 50),
          oaAuthorCount: authorships?.length ?? 1,
          oaDate: (work.publication_date as string) || '',
        });
      }

      pageNum++;
      if (pageNum % 50 === 0) {
        console.log(`  Page ${pageNum}: ${fetched.length.toLocaleString()} papers fetched (target: ${overFetchTarget.toLocaleString()})...`);
      }

      if (!meta.next_cursor) break;
      cursor = meta.next_cursor;
    }

    // Save summary cache
    writeFileSync(summaryCache, JSON.stringify(fetched));
    console.log(`\n  Fetched ${fetched.length.toLocaleString()} papers in ${pageNum} pages\n`);
  }

  // ── Step 3: Join with arXiv metadata and select top 100k ──

  console.log('Step 3/6: Joining with arXiv metadata...');

  interface SelectedPaper {
    arxivId: string;
    openAlexId: string;
    title: string;
    year: number;
    month: number;
    primaryCategory: string;
    mainCategory: string;
    firstAuthor: string;
    coauthorCount: number;
    citationCount: number;
    referencedWorks: string[];
  }

  const selected: SelectedPaper[] = [];
  let matchCount = 0;
  let fallbackCount = 0;

  for (const paper of fetched) {
    if (selected.length >= TARGET_PAPERS) break;

    const meta = arxivMeta.get(paper.arxivId);

    if (meta) {
      matchCount++;
      selected.push({
        arxivId: paper.arxivId,
        openAlexId: paper.openAlexId,
        title: meta.title,
        year: meta.year,
        month: meta.month,
        primaryCategory: meta.primaryCategory,
        mainCategory: meta.mainCategory,
        firstAuthor: meta.firstAuthor,
        coauthorCount: meta.coauthorCount,
        citationCount: paper.citedByCount,
        referencedWorks: paper.referencedWorks,
      });
    } else {
      // Fallback: use OpenAlex data without arXiv categories
      // Try to infer category from old-style arXiv ID (e.g., "hep-th/0601001")
      const slashIdx = paper.arxivId.indexOf('/');
      let primaryCat = '';
      let mainCat = '';

      if (slashIdx > 0) {
        primaryCat = paper.arxivId.substring(0, slashIdx);
        mainCat = getMainCategory(primaryCat) || '';
      }

      if (!mainCat) continue; // Skip if we can't determine category

      const dateParts = paper.oaDate.split('-');
      const year = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) || 1;
      if (isNaN(year) || year < MIN_YEAR) continue;

      fallbackCount++;
      selected.push({
        arxivId: paper.arxivId,
        openAlexId: paper.openAlexId,
        title: paper.oaTitle,
        year,
        month,
        primaryCategory: primaryCat,
        mainCategory: mainCat,
        firstAuthor: paper.oaFirstAuthor,
        coauthorCount: Math.max(0, paper.oaAuthorCount - 1),
        citationCount: paper.citedByCount,
        referencedWorks: paper.referencedWorks,
      });
    }
  }

  // Sort by date for consistent output
  selected.sort((a, b) => a.year - b.year || a.month - b.month);

  const minCit = selected.length > 0 ? selected.reduce((min, p) => Math.min(min, p.citationCount), Infinity) : 0;
  console.log(`  ${selected.length.toLocaleString()} papers selected (${matchCount} from arXiv metadata, ${fallbackCount} fallback)`);
  console.log(`  Min citation count: ${minCit}\n`);

  // Free arXiv metadata memory
  arxivMeta.clear();

  // ── Step 4: Build citation edges from referenced_works ──

  console.log('Step 4/6: Building citation edges...');

  // Build lookup: OpenAlex ID -> index in selected
  const oaIdToIndex = new Map<string, number>();
  selected.forEach((p, i) => oaIdToIndex.set(p.openAlexId, i));

  const edges: [number, number][] = [];
  const edgeSet = new Set<string>();

  for (let i = 0; i < selected.length; i++) {
    for (const refId of selected[i].referencedWorks) {
      const targetIdx = oaIdToIndex.get(refId);
      if (targetIdx === undefined || targetIdx === i) continue;

      const key = `${i}-${targetIdx}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push([i, targetIdx]);
    }
  }

  // Cap edges
  if (edges.length > MAX_EDGES) {
    const edgeRand = mulberry32(99);
    for (let i = edges.length - 1; i > 0; i--) {
      const j = Math.floor(edgeRand() * (i + 1));
      [edges[i], edges[j]] = [edges[j], edges[i]];
    }
    edges.length = MAX_EDGES;
  }

  console.log(`  ${edges.length.toLocaleString()} citation edges (capped at ${MAX_EDGES.toLocaleString()})\n`);

  // ── Step 5: Generate positions ──

  console.log('Step 5/6: Generating 3D positions...');
  const posRand = mulberry32(137);

  // ── Step 6: Write output ──

  console.log('Step 6/6: Writing output...');

  const nodes = {
    id: [] as string[],
    title: [] as string[],
    year: [] as number[],
    month: [] as number[],
    primaryCategory: [] as string[],
    subcategory: [] as string[],
    field: [] as string[],
    firstAuthor: [] as string[],
    coauthorCount: [] as number[],
    citationCount: [] as number[],
    x: [] as number[],
    y: [] as number[],
    z: [] as number[],
    color: [] as string[],
    size: [] as number[],
  };

  const catCounts = new Map<string, number>();

  for (const p of selected) {
    const pos = genPos(p.mainCategory, p.primaryCategory, posRand);
    const color = CATEGORY_COLORS[p.mainCategory] || '#ffffff';
    const size = +Math.max(0.3, Math.log2(p.citationCount + 1) * 0.4).toFixed(3);

    nodes.id.push(p.arxivId);
    nodes.title.push(p.title);
    nodes.year.push(p.year);
    nodes.month.push(p.month);
    nodes.primaryCategory.push(p.mainCategory);
    nodes.subcategory.push(p.primaryCategory);
    nodes.field.push(p.primaryCategory);
    nodes.firstAuthor.push(p.firstAuthor);
    nodes.coauthorCount.push(p.coauthorCount);
    nodes.citationCount.push(p.citationCount);
    nodes.x.push(pos.x);
    nodes.y.push(pos.y);
    nodes.z.push(pos.z);
    nodes.color.push(color);
    nodes.size.push(size);

    catCounts.set(p.mainCategory, (catCounts.get(p.mainCategory) ?? 0) + 1);
  }

  // Clusters
  const clusters = ALL_CATEGORIES.filter(c => catCounts.has(c)).map(cat => {
    const centroid = getCategoryCentroid(cat);
    return {
      label: CATEGORY_NAMES[cat],
      shortLabel: cat,
      x: +centroid.x.toFixed(2),
      y: +centroid.y.toFixed(2),
      z: +centroid.z.toFixed(2),
      color: CATEGORY_COLORS[cat],
      count: catCounts.get(cat) ?? 0,
    };
  });

  let minYear = Infinity, maxYear = -Infinity;
  for (const y of nodes.year) {
    if (y < minYear) minYear = y;
    if (y > maxYear) maxYear = y;
  }

  const output = {
    meta: { minYear, maxYear, count: nodes.id.length },
    nodes,
    edges,
    clusters,
  };

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  const json = JSON.stringify(output);
  writeFileSync(OUTPUT_PATH, json);

  const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(1);
  console.log(`\n=== Done! ===`);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`  ${nodes.id.length.toLocaleString()} papers, ${edges.length.toLocaleString()} citation edges`);
  console.log(`  Year range: ${minYear}-${maxYear}`);
  console.log(`  File size: ${sizeMB} MB`);
  console.log(`  Categories: ${clusters.map(c => `${c.shortLabel}(${c.count})`).join(', ')}`);
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
