import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PatentNode } from '../types/patent';

interface CameraControllerProps {
  nodes: PatentNode[];
  selectedIndex: number | null;
}

/**
 * Smoothly animates the camera to fly toward a selected patent.
 * Positions the camera at an offset from the target so the patent
 * is clearly visible without being directly on top of it.
 */
export default function CameraController({
  nodes,
  selectedIndex,
}: CameraControllerProps) {
  const { camera } = useThree();
  const isAnimating = useRef(false);
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const startPosition = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const progress = useRef(0);
  const prevSelectedIndex = useRef<number | null>(null);

  useEffect(() => {
    if (selectedIndex === null || selectedIndex === prevSelectedIndex.current) {
      prevSelectedIndex.current = selectedIndex;
      return;
    }
    prevSelectedIndex.current = selectedIndex;

    const node = nodes[selectedIndex];
    if (!node) return;

    const nodePos = new THREE.Vector3(node.x, node.y, node.z);

    // Calculate camera offset: position camera at a distance from the node
    // in the direction from node toward current camera, maintaining a nice angle
    const camToNode = new THREE.Vector3()
      .subVectors(nodePos, camera.position)
      .normalize();
    const offset = camToNode.clone().multiplyScalar(-40);
    offset.y += 15; // slight upward angle

    startPosition.current.copy(camera.position);

    // Approximate current look-at by projecting forward from camera
    const currentDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
      camera.quaternion
    );
    startLookAt.current
      .copy(camera.position)
      .add(currentDir.multiplyScalar(100));

    targetPosition.current.copy(nodePos).add(offset);
    targetLookAt.current.copy(nodePos);

    progress.current = 0;
    isAnimating.current = true;
  }, [selectedIndex, nodes, camera]);

  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    // Smooth ease-in-out progression
    progress.current = Math.min(1, progress.current + delta * 1.8);
    const t = easeInOutCubic(progress.current);

    // Interpolate camera position
    camera.position.lerpVectors(
      startPosition.current,
      targetPosition.current,
      t
    );

    // Interpolate look-at target
    const currentLookAt = new THREE.Vector3().lerpVectors(
      startLookAt.current,
      targetLookAt.current,
      t
    );
    camera.lookAt(currentLookAt);

    if (progress.current >= 1) {
      isAnimating.current = false;
    }
  });

  return null;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
