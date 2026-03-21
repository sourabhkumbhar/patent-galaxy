import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { DataNode } from '../types/patent';
import { hexToRgb } from '../utils/colors';

interface StarFieldProps {
  nodes: DataNode[];
  filteredIndices: number[];
  hoveredIndex: number | null;
  selectedIndex: number | null;
  pointsRef: React.RefObject<THREE.Points | null>;
}

/**
 * Renders patents as a high-performance point cloud using THREE.Points.
 * Each patent is a glowing star whose size reflects its citation count
 * and color indicates its CPC section.
 */
export default function StarField({
  nodes,
  filteredIndices,
  hoveredIndex,
  selectedIndex,
  pointsRef,
}: StarFieldProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, colors, sizes, originalSizes } = useMemo(() => {
    const count = filteredIndices.length;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const origSz = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const node = nodes[filteredIndices[i]];
      pos[i * 3] = node.x;
      pos[i * 3 + 1] = node.y;
      pos[i * 3 + 2] = node.z;

      const rgb = hexToRgb(node.color);
      col[i * 3] = rgb.r;
      col[i * 3 + 1] = rgb.g;
      col[i * 3 + 2] = rgb.b;

      sz[i] = node.size;
      origSz[i] = node.size;
    }

    return { positions: pos, colors: col, sizes: sz, originalSizes: origSz };
  }, [nodes, filteredIndices]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, colors, sizes]);

  // Build a reverse lookup: nodeIndex → filteredIndex (for O(1) highlight updates)
  const nodeToFilteredIdx = useMemo(() => {
    const map = new Map<number, number>();
    for (let i = 0; i < filteredIndices.length; i++) {
      map.set(filteredIndices[i], i);
    }
    return map;
  }, [filteredIndices]);

  // Track previous hover/selected to reset only changed entries (not all 500k)
  const prevHovered = useRef<number | null>(null);
  const prevSelected = useRef<number | null>(null);

  useEffect(() => {
    const sizeAttr = geometry.getAttribute('size') as THREE.BufferAttribute;
    if (!sizeAttr) return;

    // Reset previous highlights
    const resetIdx = (nodeIdx: number | null) => {
      if (nodeIdx === null) return;
      const fi = nodeToFilteredIdx.get(nodeIdx);
      if (fi !== undefined) sizeAttr.array[fi] = originalSizes[fi];
    };

    // Apply new highlights
    const applyIdx = (nodeIdx: number | null, scale: number) => {
      if (nodeIdx === null) return;
      const fi = nodeToFilteredIdx.get(nodeIdx);
      if (fi !== undefined) sizeAttr.array[fi] = originalSizes[fi] * scale;
    };

    resetIdx(prevHovered.current);
    resetIdx(prevSelected.current);
    applyIdx(selectedIndex, 2.5);
    applyIdx(hoveredIndex, 3.0);

    prevHovered.current = hoveredIndex;
    prevSelected.current = selectedIndex;

    sizeAttr.needsUpdate = true;
  }, [hoveredIndex, selectedIndex, nodeToFilteredIdx, geometry, originalSizes]);

  // Animate a subtle twinkle
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  const vertexShader = `
    attribute float size;
    attribute vec3 customColor;
    varying vec3 vColor;
    varying float vSize;
    varying float vDepth;
    uniform float uTime;

    void main() {
      vColor = customColor;
      vSize = size;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vDepth = clamp(-mvPosition.z / 1000.0, 0.0, 1.0);

      float twinkle = 1.0 + 0.12 * sin(uTime * 1.5 + position.x * 0.5 + position.y * 0.3);
      gl_PointSize = size * twinkle * (320.0 / -mvPosition.z);
      gl_PointSize = max(gl_PointSize, 1.5);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    varying vec3 vColor;
    varying float vSize;
    varying float vDepth;

    void main() {
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);

      if (dist > 0.5) discard;

      // Soft glow falloff
      float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
      alpha = pow(alpha, 1.5);

      // Brighter core
      float core = 1.0 - smoothstep(0.0, 0.15, dist);
      vec3 color = mix(vColor, vec3(1.0), core * 0.6);

      // Depth-based color temperature: distant stars shift cooler (bluer)
      color = mix(color, color * vec3(0.85, 0.9, 1.15), vDepth * 0.3);

      // Depth-based alpha fade: distant stars become more transparent
      float depthAlpha = mix(0.9, 0.4, vDepth);

      gl_FragColor = vec4(color, alpha * depthAlpha);
    }
  `;

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    materialRef.current = shaderMaterial;
  }, [shaderMaterial]);

  return (
    <points ref={pointsRef} geometry={geometry} material={shaderMaterial} />
  );
}
