import { useRef, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PatentNode } from '../types/patent';

interface RaycastHandlerProps {
  pointsRef: React.RefObject<THREE.Points | null>;
  nodes: PatentNode[];
  filteredIndices: number[];
  onHover: (index: number | null) => void;
  onClick: (index: number | null) => void;
}

/**
 * Handles raycasting against the points geometry for efficient
 * hover detection and click handling on the patent star field.
 */
export default function RaycastHandler({
  pointsRef,
  nodes,
  filteredIndices,
  onHover,
  onClick,
}: RaycastHandlerProps) {
  const { camera, gl } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2(-999, -999));
  const frameCount = useRef(0);
  const currentHoveredRef = useRef<number | null>(null);

  // Set raycaster threshold for point detection
  raycaster.current.params.Points = { threshold: 2.0 };

  // Track mouse position
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleClick = () => {
      if (currentHoveredRef.current !== null) {
        onClick(currentHoveredRef.current);
      }
    };

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerdown', handleClick);

    return () => {
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerdown', handleClick);
    };
  }, [gl, onClick]);

  const performRaycast = useCallback(() => {
    const points = pointsRef.current;
    if (!points || !nodes.length) {
      if (currentHoveredRef.current !== null) {
        currentHoveredRef.current = null;
        onHover(null);
      }
      return;
    }

    raycaster.current.setFromCamera(mouse.current, camera);
    const intersects = raycaster.current.intersectObject(points);

    if (intersects.length > 0) {
      const filteredIdx = intersects[0].index;
      if (filteredIdx !== undefined && filteredIdx < filteredIndices.length) {
        const nodeIndex = filteredIndices[filteredIdx];
        if (nodeIndex !== currentHoveredRef.current) {
          currentHoveredRef.current = nodeIndex;
          onHover(nodeIndex);
        }
        return;
      }
    }

    if (currentHoveredRef.current !== null) {
      currentHoveredRef.current = null;
      onHover(null);
    }
  }, [pointsRef, nodes, filteredIndices, camera, onHover]);

  // Perform raycasting every 3 frames for performance
  useFrame(() => {
    frameCount.current++;
    if (frameCount.current % 3 === 0) {
      performRaycast();
    }
  });

  return null;
}
