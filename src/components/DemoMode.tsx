import { useEffect, useRef, useState } from 'react';
import type { DataSet } from '../types/patent';
import { findCitationPath } from '../utils/citationPath';

interface DemoModeProps {
  data: DataSet;
  filteredIndices: number[];
  setSelectedIndex: (index: number | null) => void;
  setHoveredIndex: (index: number | null) => void;
  setCategories: (categories: Set<string>) => void;
  setCitationPath: (path: number[] | null) => void;
  allCategoryIds: Set<string>;
  setCinematic: (v: boolean) => void;
}

const g = window as unknown as {
  __demoRunning?: boolean;
  __demoTimeouts?: ReturnType<typeof setTimeout>[];
  __demoClaimToken?: number;
};
if (!g.__demoTimeouts) g.__demoTimeouts = [];

// Camera commands — no UI panels, pure 3D movement
function flyTo(x: number, y: number, z: number, duration = 2.5) {
  window.dispatchEvent(new CustomEvent('galaxy:flyto', {
    detail: { x, y, z, duration },
  }));
}

function orbitAround(x: number, y: number, z: number, opts: {
  radius?: number; height?: number; duration?: number; arc?: number;
} = {}) {
  window.dispatchEvent(new CustomEvent('galaxy:orbit', {
    detail: { x, y, z, ...opts },
  }));
}

function recenter() {
  window.dispatchEvent(new Event('galaxy:recenter'));
}

export default function DemoMode(props: DemoModeProps) {
  const propsRef = useRef(props);
  propsRef.current = props;

  const startRef = useRef<() => void>(() => {});
  const [active, setActive] = useState(false);

  function stop() {
    g.__demoTimeouts!.forEach(clearTimeout);
    g.__demoTimeouts!.length = 0;
  }

  function at(delay: number, fn: () => void) {
    g.__demoTimeouts!.push(setTimeout(fn, delay));
  }

  // ════════════════════════════════════════════════════════════════
  // CINEMATIC SHOWREEL — feels like a human exploring
  //
  // The camera orbits, drifts, looks around. It doesn't snap
  // between nodes. It floats like someone dragging their mouse,
  // discovering things, pausing at interesting spots.
  // ════════════════════════════════════════════════════════════════
  function start() {
    const {
      data, filteredIndices, setSelectedIndex, setHoveredIndex,
      setCitationPath, allCategoryIds, setCinematic,
    } = propsRef.current;

    if (g.__demoRunning) return;
    if (filteredIndices.length === 0) return;

    g.__demoRunning = true;
    setActive(true);
    setCinematic(true);
    stop();

    // Tell CameraController to lock out auto-orbit + controls
    window.dispatchEvent(new Event('galaxy:demo:start'));

    // === PREP ===
    const categories = Array.from(allCategoryIds);
    const sorted = [...filteredIndices].sort(
      (a, b) => data.nodes[b].citationCount - data.nodes[a].citationCount
    );

    // Top node per category
    const topByCategory: number[] = [];
    const seen = new Set<string>();
    for (const idx of sorted) {
      const cat = data.nodes[idx].category;
      if (!seen.has(cat)) {
        seen.add(cat);
        topByCategory.push(idx);
      }
      if (seen.size >= categories.length) break;
    }

    const heroIdx = topByCategory[0];
    const secondIdx = topByCategory[1] ?? sorted[1];

    const getConnected = (idx: number) =>
      data.edges
        .filter((e) => e.source === idx || e.target === idx)
        .map((e) => (e.source === idx ? e.target : e.source));

    const path = findCitationPath(data.edges, heroIdx, secondIdx);
    const n = (idx: number) => data.nodes[idx];

    let t = 0;

    // ── BEAT 1: GRAND REVEAL (0–4s) ────────────────────────
    // Fly-in plays naturally. Quick orbit to show the whole galaxy.
    t += 3500;
    at(t, () => orbitAround(0, 0, 0, {
      radius: 300, height: 100, duration: 4, arc: Math.PI * 0.5,
    }));
    t += 3500;

    // ── BEAT 2: DIVE INTO HERO (4–10s) ─────────────────────
    // Fly to the most connected node, flash its connections
    at(t, () => flyTo(n(heroIdx).x, n(heroIdx).y, n(heroIdx).z, 1.8));
    t += 2000;
    const heroConns = getConnected(heroIdx).slice(0, 3);
    at(t, () => setHoveredIndex(heroIdx));
    at(t + 800, () => setHoveredIndex(heroConns[0]));
    at(t + 1600, () => setHoveredIndex(heroConns[1] ?? heroConns[0]));
    t += 2200;
    at(t, () => setHoveredIndex(null));

    // Follow one link to a different category
    {
      const cross = heroConns.find((c) => n(c).category !== n(heroIdx).category) ?? heroConns[0];
      if (cross != null) {
        at(t, () => flyTo(n(cross).x, n(cross).y, n(cross).z, 1.5));
        t += 1800;
        at(t, () => setHoveredIndex(cross));
        t += 800;
        at(t, () => setHoveredIndex(null));
      }
    }

    // ── BEAT 3: VISIT 2 CLUSTERS (10–18s) ──────────────────
    // Quick fly-by of 2 different clusters with connection flash
    for (let i = 1; i <= Math.min(2, topByCategory.length - 1); i++) {
      const idx = topByCategory[i];
      at(t, () => flyTo(n(idx).x, n(idx).y, n(idx).z, 1.5));
      t += 1800;
      at(t, () => orbitAround(n(idx).x, n(idx).y, n(idx).z, {
        radius: 40, height: 12, duration: 2, arc: Math.PI * 0.4,
      }));
      const conns = getConnected(idx).slice(0, 2);
      at(t + 300, () => setHoveredIndex(idx));
      if (conns[0] != null) at(t + 1000, () => setHoveredIndex(conns[0]));
      t += 1800;
      at(t, () => setHoveredIndex(null));
      t += 200;
    }

    // ── BEAT 4: CITATION PATH (18–26s) ─────────────────────
    // Light up a path, walk 3 hops max
    if (path && path.length > 1) {
      const walkLen = Math.min(path.length, 4);
      at(t, () => {
        setCitationPath(path);
        flyTo(n(path[0]).x, n(path[0]).y, n(path[0]).z, 1.5);
      });
      t += 1800;

      for (let i = 1; i < walkLen; i++) {
        const node = n(path[i]);
        at(t, () => flyTo(node.x, node.y, node.z, 1.5));
        t += 1800;
      }

      at(t, () => setCitationPath(null));
      t += 200;
    }

    // ── BEAT 5: PULL BACK + FINALE (26–30s) ────────────────
    at(t, () => {
      setSelectedIndex(null);
      setHoveredIndex(null);
      recenter();
    });
    t += 2500;

    at(t, () => orbitAround(0, 0, 0, {
      radius: 320, height: 120, duration: 3, arc: Math.PI * 0.3,
    }));
    t += 3500;

    // ── END ──────────────────────────────────────────────────
    at(t, () => {
      g.__demoRunning = false;
      setActive(false);
      setCinematic(false);
      window.dispatchEvent(new Event('galaxy:demo:stop'));
      // Redirect to the actual site (strip ?demo=true)
      const url = new URL(window.location.href);
      url.searchParams.delete('demo');
      window.history.replaceState({}, '', url.toString());
    });

    console.log(`🎬 Showreel: ${Math.round(t / 1000)}s`);
  }

  startRef.current = start;

  // Auto-start from ?demo=true — token ensures only ONE instance wins
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') !== 'true') return;
    if (props.filteredIndices.length === 0) return;

    // Each effect writes a unique token. Only the last writer's timer proceeds.
    const token = Date.now() + Math.random();
    g.__demoClaimToken = token;

    const timer = setTimeout(() => {
      if (g.__demoClaimToken !== token) return; // Another instance overwrote us
      if (g.__demoRunning) return; // Already running
      startRef.current();
    }, 500);

    return () => { clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.filteredIndices.length]);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.startDemo = () => startRef.current();
    w.stopDemo = () => {
      stop();
      g.__demoRunning = false;
      setActive(false);
      const p = propsRef.current;
      p.setCinematic(false);
      p.setSelectedIndex(null);
      p.setHoveredIndex(null);
      p.setCitationPath(null);
      p.setCategories(new Set(p.allCategoryIds));
      window.dispatchEvent(new Event('galaxy:demo:stop'));
      recenter();
    };
    return () => { delete w.startDemo; delete w.stopDemo; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!active) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: 'rgba(255, 50, 50, 0.15)',
        border: '1px solid rgba(255, 50, 50, 0.4)',
        borderRadius: 8,
        padding: '4px 16px',
        color: '#ff6666',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.15em',
        backdropFilter: 'blur(10px)',
        pointerEvents: 'none',
      }}
    >
      ● REC
    </div>
  );
}
