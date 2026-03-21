import { useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import StarField from './StarField';
import ConnectionLines from './ConnectionLines';
import ClusterLabels from './ClusterLabels';
import MiniMapOverlay from './MiniMap';
import RaycastHandler from './RaycastHandler';
import CameraController from './CameraController';
import CitationPathLines from './CitationPathLines';
import type { PatentData, FilterState } from '../types/patent';

interface GalaxyProps {
  data: PatentData;
  filters: FilterState;
  filteredIndices: number[];
  onHover: (index: number | null) => void;
  onClick: (index: number | null) => void;
  onMouseMove: (pos: { x: number; y: number }) => void;
  citationPath?: number[] | null;
}

/**
 * Main Three.js scene containing the galaxy visualization.
 * Wraps the Canvas and all 3D components.
 */
export default function Galaxy({
  data,
  filters,
  filteredIndices,
  onHover,
  onClick,
  onMouseMove,
  citationPath,
}: GalaxyProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      onMouseMove({ x: e.clientX, y: e.clientY });
    },
    [onMouseMove]
  );

  return (
    <div className="w-full h-full" onPointerMove={handlePointerMove}>
      <Canvas
        camera={{ position: [0, 80, 200], fov: 60, near: 0.1, far: 2000 }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        style={{ background: '#0a0a12', touchAction: 'none' }}
        dpr={[1, 1.5]}
      >
        {/* Ambient light for general visibility */}
        <ambientLight intensity={0.1} />

        {/* Stars */}
        <StarField
          nodes={data.nodes}
          filteredIndices={filteredIndices}
          hoveredIndex={filters.hoveredPatentIndex}
          selectedIndex={filters.selectedPatentIndex}
          pointsRef={pointsRef}
        />

        {/* Citation connection lines */}
        <ConnectionLines
          nodes={data.nodes}
          edges={data.edges}
          selectedIndex={filters.selectedPatentIndex}
          hoveredIndex={filters.hoveredPatentIndex}
        />

        {/* Cluster labels */}
        <ClusterLabels
          clusters={data.clusters}
          visibleSections={filters.cpcSections}
        />

        {/* Raycasting for hover/click detection */}
        <RaycastHandler
          pointsRef={pointsRef}
          nodes={data.nodes}
          filteredIndices={filteredIndices}
          onHover={onHover}
          onClick={onClick}
        />

        {/* Citation path visualization */}
        <CitationPathLines nodes={data.nodes} path={citationPath ?? null} />

        {/* Camera fly-to animation */}
        <CameraController
          nodes={data.nodes}
          selectedIndex={filters.selectedPatentIndex}
          controlsRef={controlsRef}
        />

        {/* MiniMap renderer (draws to external canvas) */}
        <MiniMapOverlay
          nodes={data.nodes}
          filteredIndices={filteredIndices}
        />

        {/* Background nebula fog */}
        <fog attach="fog" args={['#0a0a12', 300, 800]} />

        {/* Camera controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={600}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.5}
        />

        {/* Post-processing bloom */}
        <EffectComposer>
          <Bloom
            intensity={0.8}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
