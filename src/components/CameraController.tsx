import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { DataNode } from '../types/patent';

interface CameraControllerProps {
  nodes: DataNode[];
  selectedIndex: number | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

const IDLE_TIMEOUT = 15_000; // 15 seconds before auto-orbit
const ORBIT_SPEED = 0.08; // radians per second

/**
 * Handles three camera behaviors:
 * 1. Cinematic intro fly-in on first load (GSAP)
 * 2. Fly-to animation when selecting a node
 * 3. Auto-orbit when idle for 15 seconds
 */
export default function CameraController({
  nodes,
  selectedIndex,
  controlsRef,
}: CameraControllerProps) {
  const { camera } = useThree();

  // Fly-to state
  const isAnimating = useRef(false);
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const startPosition = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const progress = useRef(0);
  const prevSelectedIndex = useRef<number | null>(null);

  // Intro state
  const hasPlayedIntro = useRef(false);
  const introComplete = useRef(false);

  // Auto-orbit state
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoOrbit = useRef(false);
  const orbitAngle = useRef(0);

  // ── Cinematic intro fly-in ──
  useEffect(() => {
    if (hasPlayedIntro.current) return;
    hasPlayedIntro.current = true;

    // Start camera far out above the galaxy
    camera.position.set(0, 250, 650);
    camera.lookAt(0, 0, 0);

    if (controlsRef.current) {
      controlsRef.current.enabled = false;
      controlsRef.current.target.set(0, 0, 0);
    }

    const proxy = { x: 0, y: 250, z: 650 };

    gsap.to(proxy, {
      x: 0,
      y: 100,
      z: 260,
      duration: 3.5,
      ease: 'expo.out',
      onUpdate: () => {
        camera.position.set(proxy.x, proxy.y, proxy.z);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      },
      onComplete: () => {
        introComplete.current = true;
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
        resetIdleTimer();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-orbit idle detection ──
  function resetIdleTimer() {
    isAutoOrbit.current = false;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (!isAnimating.current && introComplete.current) {
        isAutoOrbit.current = true;
        orbitAngle.current = Math.atan2(camera.position.z, camera.position.x);
      }
    }, IDLE_TIMEOUT);
  }

  useEffect(() => {
    const reset = () => resetIdleTimer();
    window.addEventListener('pointerdown', reset);
    window.addEventListener('pointermove', reset);
    window.addEventListener('wheel', reset);
    window.addEventListener('keydown', reset);

    return () => {
      window.removeEventListener('pointerdown', reset);
      window.removeEventListener('pointermove', reset);
      window.removeEventListener('wheel', reset);
      window.removeEventListener('keydown', reset);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fly-to selected node ──
  useEffect(() => {
    if (selectedIndex === null || selectedIndex === prevSelectedIndex.current) {
      prevSelectedIndex.current = selectedIndex;
      return;
    }
    prevSelectedIndex.current = selectedIndex;

    const node = nodes[selectedIndex];
    if (!node) return;

    // Cancel auto-orbit
    isAutoOrbit.current = false;
    resetIdleTimer();

    const nodePos = new THREE.Vector3(node.x, node.y, node.z);

    const camToNode = new THREE.Vector3()
      .subVectors(nodePos, camera.position)
      .normalize();
    const offset = camToNode.clone().multiplyScalar(-40);
    offset.y += 15;

    startPosition.current.copy(camera.position);

    if (controlsRef.current) {
      startLookAt.current.copy(controlsRef.current.target);
    } else {
      const currentDir = new THREE.Vector3(0, 0, -1).applyQuaternion(
        camera.quaternion
      );
      startLookAt.current
        .copy(camera.position)
        .add(currentDir.multiplyScalar(100));
    }

    targetPosition.current.copy(nodePos).add(offset);
    targetLookAt.current.copy(nodePos);

    progress.current = 0;
    isAnimating.current = true;

    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, nodes, camera, controlsRef]);

  // ── Per-frame updates ──
  useFrame((_, delta) => {
    // Auto-orbit when idle
    if (isAutoOrbit.current && !isAnimating.current) {
      orbitAngle.current += delta * ORBIT_SPEED;
      const radius = Math.sqrt(
        camera.position.x * camera.position.x +
        camera.position.z * camera.position.z
      );
      const height = camera.position.y;
      camera.position.x = Math.cos(orbitAngle.current) * radius;
      camera.position.z = Math.sin(orbitAngle.current) * radius;
      camera.position.y = height + Math.sin(orbitAngle.current * 0.3) * 3;
      camera.lookAt(0, 0, 0);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
      return;
    }

    // Fly-to animation
    if (!isAnimating.current) return;

    progress.current = Math.min(1, progress.current + delta * 1.8);
    const t = easeInOutCubic(progress.current);

    camera.position.lerpVectors(
      startPosition.current,
      targetPosition.current,
      t
    );

    const currentLookAt = new THREE.Vector3().lerpVectors(
      startLookAt.current,
      targetLookAt.current,
      t
    );

    if (controlsRef.current) {
      controlsRef.current.target.copy(currentLookAt);
      controlsRef.current.update();
    } else {
      camera.lookAt(currentLookAt);
    }

    if (progress.current >= 1) {
      isAnimating.current = false;
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
      resetIdleTimer();
    }
  });

  return null;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
