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
import AmbientDust from './AmbientDust';
import type { DataSet, FilterState } from '../types/patent';
import { useProject } from '../config/ProjectContext';

interface GalaxyProps {
  data: DataSet;
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
  const config = useProject();
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
        camera={{ position: [0, 100, 260], fov: 60, near: 0.1, far: 3000 }}
        gl={{
          antialias: false,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        style={{ background: config.background, touchAction: 'none' }}
        dpr={[1, filteredIndices.length > 100_000 ? 1 : 1.5]}
      >
        {/* Ambient light for general visibility */}
        <ambientLight intensity={0.1} />

        {/* Stars */}
        <StarField
          nodes={data.nodes}
          filteredIndices={filteredIndices}
          hoveredIndex={filters.hoveredIndex}
          selectedIndex={filters.selectedIndex}
          pointsRef={pointsRef}
        />

        {/* Citation connection lines */}
        <ConnectionLines
          nodes={data.nodes}
          edges={data.edges}
          selectedIndex={filters.selectedIndex}
          hoveredIndex={filters.hoveredIndex}
        />

        {/* Cluster labels */}
        <ClusterLabels
          clusters={data.clusters}
          visibleSections={filters.categories}
        />

        {/* Raycasting for hover/click detection */}
        <RaycastHandler
          pointsRef={pointsRef}
          nodes={data.nodes}
          filteredIndices={filteredIndices}
          onHover={onHover}
          onClick={onClick}
        />

        {/* Ambient dust for atmospheric depth */}
        <AmbientDust />

        {/* Citation path visualization */}
        <CitationPathLines nodes={data.nodes} path={citationPath ?? null} />

        {/* Camera fly-to animation */}
        <CameraController
          nodes={data.nodes}
          selectedIndex={filters.selectedIndex}
          controlsRef={controlsRef}
        />

        {/* MiniMap renderer (draws to external canvas) */}
        <MiniMapOverlay
          nodes={data.nodes}
          filteredIndices={filteredIndices}
        />

        {/* Background nebula fog */}
        <fog attach="fog" args={[config.fogColor, config.fogNear, config.fogFar]} />

        {/* Camera controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={15}
          maxDistance={800}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          panSpeed={0.5}
        />

        {/* Post-processing bloom — lighter at high point counts */}
        {filteredIndices.length <= 100_000 ? (
          <EffectComposer>
            <Bloom
              intensity={1.0}
              luminanceThreshold={0.15}
              luminanceSmoothing={0.85}
              mipmapBlur
            />
          </EffectComposer>
        ) : (
          <EffectComposer>
            <Bloom
              intensity={0.6}
              luminanceThreshold={0.25}
              luminanceSmoothing={0.85}
              mipmapBlur
            />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
