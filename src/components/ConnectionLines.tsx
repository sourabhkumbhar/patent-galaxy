import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { DataNode, Edge } from '../types/patent';

interface ConnectionLinesProps {
  nodes: DataNode[];
  edges: Edge[];
  selectedIndex: number | null;
  hoveredIndex: number | null;
}

const pulseVertexShader = `
  attribute float progress;
  varying float vProgress;

  void main() {
    vProgress = progress;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pulseFragmentShader = `
  varying float vProgress;
  uniform float uTime;
  uniform vec3 uColor;

  void main() {
    float pulse = sin(vProgress * 6.28318 - uTime * 3.0) * 0.5 + 0.5;
    pulse = pow(pulse, 3.0);
    float alpha = mix(0.12, 0.55, pulse);
    vec3 color = mix(uColor, vec3(1.0), pulse * 0.3);
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * Renders citation connections as animated pulsing lines between nodes.
 * Only shows connections for the currently selected or hovered node.
 */
export default function ConnectionLines({
  nodes,
  edges,
  selectedIndex,
  hoveredIndex,
}: ConnectionLinesProps) {
  const activeIndex = selectedIndex ?? hoveredIndex;
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Pre-build adjacency index
  const adjacency = useMemo(() => {
    const map = new Map<number, Edge[]>();
    for (const edge of edges) {
      let list = map.get(edge.source);
      if (!list) { list = []; map.set(edge.source, list); }
      list.push(edge);
      list = map.get(edge.target);
      if (!list) { list = []; map.set(edge.target, list); }
      list.push(edge);
    }
    return map;
  }, [edges]);

  const { geometry, color } = useMemo(() => {
    if (activeIndex === null) {
      return { geometry: null, color: '#4488ff' };
    }

    const relevantEdges = adjacency.get(activeIndex);
    if (!relevantEdges || relevantEdges.length === 0) {
      return { geometry: null, color: '#4488ff' };
    }

    // Limit to 200 connections for performance
    const limitedEdges = relevantEdges.slice(0, 200);
    const positions = new Float32Array(limitedEdges.length * 6);
    const progressAttr = new Float32Array(limitedEdges.length * 2);

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

      // Progress: 0 at source, 1 at target
      progressAttr[i * 2] = 0.0;
      progressAttr[i * 2 + 1] = 1.0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('progress', new THREE.BufferAttribute(progressAttr, 1));

    const nodeColor = nodes[activeIndex]?.color ?? '#4488ff';
    return { geometry: geo, color: nodeColor };
  }, [nodes, adjacency, activeIndex]);

  // Animate pulse
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  const shaderMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#4488ff') },
      },
      vertexShader: pulseVertexShader,
      fragmentShader: pulseFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    materialRef.current = mat;
    return mat;
  }, []);

  // Update color uniform when it changes
  useMemo(() => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.uColor.value.set(color);
    }
  }, [color, shaderMaterial]);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry} material={shaderMaterial} />
  );
}
