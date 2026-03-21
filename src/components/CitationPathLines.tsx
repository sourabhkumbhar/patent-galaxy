import { useMemo } from 'react';
import * as THREE from 'three';
import type { DataNode } from '../types/patent';

interface CitationPathLinesProps {
  nodes: DataNode[];
  path: number[] | null;
}

/**
 * Renders the citation path between two patents as bright, distinct line segments.
 * Each segment connects consecutive patents in the BFS-discovered shortest path.
 */
export default function CitationPathLines({ nodes, path }: CitationPathLinesProps) {
  const geometry = useMemo(() => {
    if (!path || path.length < 2) return null;

    const segmentCount = path.length - 1;
    const positions = new Float32Array(segmentCount * 6);

    for (let i = 0; i < segmentCount; i++) {
      const a = nodes[path[i]];
      const b = nodes[path[i + 1]];
      if (!a || !b) continue;

      positions[i * 6] = a.x;
      positions[i * 6 + 1] = a.y;
      positions[i * 6 + 2] = a.z;
      positions[i * 6 + 3] = b.x;
      positions[i * 6 + 4] = b.y;
      positions[i * 6 + 5] = b.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [nodes, path]);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color="#ffdd44"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        linewidth={2}
      />
    </lineSegments>
  );
}
