import { useRef, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PatentNode } from '../types/patent';

const TAP_MAX_DURATION = 250; // ms — longer than this is a drag/scroll
const TAP_MAX_DISTANCE = 8;   // px — moved more than this is a drag/scroll

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
 * Distinguishes taps from scroll/pan gestures on touch devices.
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

  // Tap detection: track pointer down position & time
  const pointerDownRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Set raycaster threshold for point detection
  raycaster.current.params.Points = { threshold: 2.0 };

  // Track pointer position and detect taps vs drags
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const down = pointerDownRef.current;
      pointerDownRef.current = null;
      if (!down) return;

      // Only count as a tap if short duration and minimal movement
      const dt = Date.now() - down.time;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dt < TAP_MAX_DURATION && dist < TAP_MAX_DISTANCE) {
        // Update raycaster mouse position from the tap location
        const rect = canvas.getBoundingClientRect();
        mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Perform immediate raycast at tap position
        if (pointsRef.current && nodes.length) {
          raycaster.current.setFromCamera(mouse.current, camera);
          const intersects = raycaster.current.intersectObject(pointsRef.current);
          if (intersects.length > 0) {
            const filteredIdx = intersects[0].index;
            if (filteredIdx !== undefined && filteredIdx < filteredIndices.length) {
              onClick(filteredIndices[filteredIdx]);
              return;
            }
          }
        }
        // Tapped empty space — deselect
        onClick(null);
      }
    };

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gl, onClick, camera, nodes, filteredIndices, pointsRef]);

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
