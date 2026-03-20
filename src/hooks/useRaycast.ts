import { useCallback, useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PatentNode } from '../types/patent';

interface UseRaycastParams {
  points: React.RefObject<THREE.Points | null>;
  data: PatentNode[] | null;
  filteredIndices: number[];
  onHover: (index: number | null) => void;
  onClick: (index: number | null) => void;
}

export function useRaycast({
  points,
  data,
  filteredIndices,
  onHover,
  onClick,
}: UseRaycastParams) {
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2(Infinity, Infinity));
  const hoveredIndex = useRef<number | null>(null);
  const frameCount = useRef(0);

  // Set raycaster threshold for points
  raycaster.current.params.Points!.threshold = 1.5;

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }, [gl.domElement]);

  const handlePointerDown = useCallback(() => {
    if (hoveredIndex.current !== null) {
      onClick(hoveredIndex.current);
    }
  }, [onClick]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [gl.domElement, handlePointerMove, handlePointerDown]);

  useFrame(() => {
    frameCount.current += 1;

    // Throttle raycasting to every 3 frames
    if (frameCount.current % 3 !== 0) return;

    if (!points.current || !data || filteredIndices.length === 0) {
      if (hoveredIndex.current !== null) {
        hoveredIndex.current = null;
        onHover(null);
      }
      return;
    }

    // Skip if mouse is outside the canvas
    if (
      Math.abs(mouse.current.x) > 1 ||
      Math.abs(mouse.current.y) > 1
    ) {
      if (hoveredIndex.current !== null) {
        hoveredIndex.current = null;
        onHover(null);
      }
      return;
    }

    raycaster.current.setFromCamera(mouse.current, camera);

    const intersections = raycaster.current.intersectObject(points.current);

    if (intersections.length > 0) {
      const filteredIdx = intersections[0].index;

      if (filteredIdx !== undefined && filteredIdx < filteredIndices.length) {
        const originalIndex = filteredIndices[filteredIdx];

        if (hoveredIndex.current !== originalIndex) {
          hoveredIndex.current = originalIndex;
          onHover(originalIndex);
        }
      }
    } else if (hoveredIndex.current !== null) {
      hoveredIndex.current = null;
      onHover(null);
    }
  });
}
