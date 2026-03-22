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
      setCategories, setCitationPath, allCategoryIds, setCinematic,
    } = propsRef.current;

    if (g.__demoRunning) return;
    if (filteredIndices.length === 0) return;

    g.__demoRunning = true;
    setActive(true);
    setCinematic(true);
    stop();

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

    // ── ACT 1: ARRIVAL + LOOK AROUND ─────────────────────────
    // Fly-in plays (3.5s). Then orbit the whole galaxy —
    // like a human first seeing it and dragging to look around.
    t += 4000;

    // Orbit around the galaxy center — the "whoa" moment
    at(t, () => orbitAround(0, 0, 0, {
      radius: 300, height: 100, duration: 6, arc: Math.PI * 0.7,
    }));
    t += 7000;

    // ── ACT 2: NOTICE THE HERO ───────────────────────────────
    // Drift toward the biggest node, orbit around it
    at(t, () => flyTo(n(heroIdx).x, n(heroIdx).y, n(heroIdx).z, 2.5));
    t += 3000;

    // Orbit the hero, notice connections
    at(t, () => orbitAround(n(heroIdx).x, n(heroIdx).y, n(heroIdx).z, {
      radius: 50, height: 15, duration: 4, arc: Math.PI * 0.8,
    }));
    const heroConns = getConnected(heroIdx).slice(0, 4);
    at(t + 500, () => setHoveredIndex(heroIdx));
    at(t + 1500, () => setHoveredIndex(heroConns[0]));
    at(t + 2500, () => setHoveredIndex(heroConns[1] ?? heroConns[0]));
    at(t + 3500, () => setHoveredIndex(heroConns[2] ?? null));
    t += 4500;
    at(t, () => setHoveredIndex(null));
    t += 300;

    // ── ACT 2b: FOLLOW THE LINKS ────────────────────────────
    // "Oh, what's that connected to?" — follow a connection chain
    // like a human clicking through Wikipedia links
    {
      let current = heroIdx;
      const visited = new Set([heroIdx]);
      const hops = 3; // Follow 3 links deep

      for (let hop = 0; hop < hops; hop++) {
        const conns = getConnected(current).filter((c) => !visited.has(c));
        if (conns.length === 0) break;

        // Pick a connected node in a DIFFERENT category if possible (more interesting)
        const currentCat = n(current).category;
        const next = conns.find((c) => n(c).category !== currentCat) ?? conns[0];
        visited.add(next);

        // Highlight the link, then follow it
        at(t, () => setHoveredIndex(next)); // "Notice" the connection
        t += 1200;

        at(t, () => {
          setHoveredIndex(null);
          flyTo(n(next).x, n(next).y, n(next).z, 2);
        });
        t += 2500;

        // Brief orbit at the new node — look around
        at(t, () => orbitAround(n(next).x, n(next).y, n(next).z, {
          radius: 35, height: 10, duration: 2, arc: Math.PI * 0.4,
        }));

        // Flash its connections while orbiting
        const nextConns = getConnected(next).slice(0, 2);
        at(t + 300, () => setHoveredIndex(next));
        if (nextConns[0] != null) at(t + 1000, () => setHoveredIndex(nextConns[0]));
        t += 2200;
        at(t, () => setHoveredIndex(null));
        t += 300;

        current = next;
      }
    }

    // ── ACT 3: GRAND TOUR — every cluster ────────────────────
    // Float between clusters, orbit each one, follow a link from each
    for (let i = 1; i < topByCategory.length; i++) {
      const idx = topByCategory[i];
      const node = n(idx);

      // Drift to this cluster
      at(t, () => flyTo(node.x, node.y, node.z, 2));
      t += 2500;

      // Quick orbit — look around
      at(t, () => orbitAround(node.x, node.y, node.z, {
        radius: 40, height: 12, duration: 2.5, arc: Math.PI * 0.5,
      }));

      // Flash connections while orbiting
      const conns = getConnected(idx).slice(0, 3);
      at(t + 300, () => setHoveredIndex(idx));
      if (conns[0] != null) at(t + 1000, () => setHoveredIndex(conns[0]));
      if (conns[1] != null) at(t + 1800, () => setHoveredIndex(conns[1]));
      t += 2800;
      at(t, () => setHoveredIndex(null));
      t += 200;

      // Follow one link from this cluster — "oh that's interesting"
      if (conns.length > 0) {
        const follow = conns.find((c) => n(c).category !== n(idx).category) ?? conns[0];
        at(t, () => {
          setHoveredIndex(follow);
        });
        t += 800;
        at(t, () => {
          setHoveredIndex(null);
          flyTo(n(follow).x, n(follow).y, n(follow).z, 1.8);
        });
        t += 2200;
        // Quick look around
        at(t, () => orbitAround(n(follow).x, n(follow).y, n(follow).z, {
          radius: 30, height: 8, duration: 1.5, arc: Math.PI * 0.3,
        }));
        t += 1800;
      }
    }

    // ── ACT 4: PULL BACK + FULL ORBIT ────────────────────────
    // Step back, see everything, orbit the whole thing
    at(t, () => recenter());
    t += 3000;

    at(t, () => orbitAround(0, 0, 0, {
      radius: 280, height: 80, duration: 5, arc: Math.PI * 0.6,
    }));
    t += 5500;

    // ── ACT 5: CITATION PATH ─────────────────────────────────
    // The highlight — trace a path across clusters
    if (path && path.length > 1) {
      // Light up the path, fly to start
      at(t, () => {
        setCitationPath(path);
        setSelectedIndex(path[0]);
        flyTo(n(path[0]).x, n(path[0]).y, n(path[0]).z, 2);
      });
      t += 2500;

      // Walk each hop — camera follows
      for (let i = 1; i < path.length; i++) {
        const node = n(path[i]);
        at(t, () => {
          setSelectedIndex(path[i]);
          flyTo(node.x, node.y, node.z, 2);
        });
        t += 2800;
      }

      // Orbit around the destination
      const lastNode = n(path[path.length - 1]);
      at(t, () => orbitAround(lastNode.x, lastNode.y, lastNode.z, {
        radius: 45, height: 12, duration: 3, arc: Math.PI * 0.5,
      }));
      t += 3500;

      // Clear and pull back
      at(t, () => {
        setCitationPath(null);
        setSelectedIndex(null);
        recenter();
      });
      t += 3500;
    }

    // ── ACT 6: THE FILTER ────────────────────────────────────
    // Strip categories — orbit while they vanish
    at(t, () => orbitAround(0, 0, 0, {
      radius: 260, height: 90, duration: categories.length * 1.5 + 5,
      arc: Math.PI * 0.8,
    }));

    const remaining = new Set(allCategoryIds);
    for (let i = 0; i < categories.length - 1; i++) {
      const cat = categories[i];
      at(t, () => {
        remaining.delete(cat);
        setCategories(new Set(remaining));
      });
      t += 1500;
    }

    // Hold the lone survivor
    t += 3000;

    // Everything snaps back
    at(t, () => setCategories(new Set(allCategoryIds)));
    t += 3500;

    // ── FINALE: big orbit + fade out ─────────────────────────
    at(t, () => {
      setSelectedIndex(null);
      setHoveredIndex(null);
      recenter();
    });
    t += 2500;

    // One last grand orbit
    at(t, () => orbitAround(0, 0, 0, {
      radius: 320, height: 120, duration: 6, arc: Math.PI * 0.5,
    }));
    t += 7000;

    // ── END ──────────────────────────────────────────────────
    at(t, () => {
      g.__demoRunning = false;
      setActive(false);
      setCinematic(false);
    });

    console.log(`🎬 Showreel: ${Math.round(t / 1000)}s`);
  }

  startRef.current = start;

  // Auto-start from ?demo=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') !== 'true') return;
    if (g.__demoRunning) return;
    if (props.filteredIndices.length === 0) return;

    const timer = setTimeout(() => startRef.current(), 500);
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
