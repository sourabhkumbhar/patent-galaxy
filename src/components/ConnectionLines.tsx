import { useMemo } from 'react';
import * as THREE from 'three';
import type { PatentNode, CitationEdge } from '../types/patent';

interface ConnectionLinesProps {
  nodes: PatentNode[];
  edges: CitationEdge[];
  selectedIndex: number | null;
  hoveredIndex: number | null;
}

/**
 * Renders citation connections as luminous lines between patents.
 * Only shows connections for the currently selected or hovered patent
 * to maintain visual clarity and performance.
 */
export default function ConnectionLines({
  nodes,
  edges,
  selectedIndex,
  hoveredIndex,
}: ConnectionLinesProps) {
  const activeIndex = selectedIndex ?? hoveredIndex;

  const { geometry, color } = useMemo(() => {
    if (activeIndex === null) {
      return { geometry: null, color: '#4488ff' };
    }

    const relevantEdges = edges.filter(
      (e) => e.source === activeIndex || e.target === activeIndex
    );

    if (relevantEdges.length === 0) {
      return { geometry: null, color: '#4488ff' };
    }

    // Limit to 200 connections for performance
    const limitedEdges = relevantEdges.slice(0, 200);
    const positions = new Float32Array(limitedEdges.length * 6);

    for (let i = 0; i < limitedEdges.length; i++) {
      const edge = limitedEdges[i];
      const source = nodes[edge.source];
      const target = nodes[edge.target];

      if (!source || !target) continue;

      positions[i * 6] = source.x;
      positions[i * 6 + 1] = source.y;
      positions[i * 6 + 2] = source.z;
      positions[i * 6 + 3] = target.x;
      positions[i * 6 + 4] = target.y;
      positions[i * 6 + 5] = target.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const nodeColor = nodes[activeIndex]?.color ?? '#4488ff';

    return { geometry: geo, color: nodeColor };
  }, [nodes, edges, activeIndex]);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}
