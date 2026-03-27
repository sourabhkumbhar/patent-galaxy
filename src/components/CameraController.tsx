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

const IDLE_TIMEOUT = 15_000;
const ORBIT_SPEED = 0.08;

export default function CameraController({
  nodes,
  selectedIndex,
  controlsRef,
}: CameraControllerProps) {
  const { camera } = useThree();

  // Fly-to state (useFrame-driven, for node selection)
  const isAnimating = useRef(false);
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const startPosition = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const progress = useRef(0);
  const prevSelectedIndex = useRef<number | null>(null);

  // GSAP-driven animation state — useFrame must not interfere
  const gsapActive = useRef(false);
  const activeTween = useRef<gsap.core.Tween | null>(null);

  // Intro state
  const hasPlayedIntro = useRef(false);
  const introComplete = useRef(false);

  // Auto-orbit state
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoOrbit = useRef(false);
  const orbitAngle = useRef(0);

  // Demo mode flag — disables auto-orbit and controls re-enable
  const demoMode = useRef(false);

  // Kill any active GSAP tween before starting a new one
  function killActiveTween() {
    if (activeTween.current) {
      activeTween.current.kill();
      activeTween.current = null;
    }
    gsapActive.current = false;
  }

  // ── Cinematic intro fly-in ──
  useEffect(() => {
    if (hasPlayedIntro.current) return;
    hasPlayedIntro.current = true;

    camera.position.set(0, 300, 800);
    camera.lookAt(0, 0, 0);

    if (controlsRef.current) {
      controlsRef.current.enabled = false;
      controlsRef.current.target.set(0, 0, 0);
    }

    const proxy = { x: 0, y: 300, z: 800 };

    activeTween.current = gsap.to(proxy, {
      x: 0, y: 120, z: 320,
      duration: 3.5,
      ease: 'expo.out',
      onStart: () => { gsapActive.current = true; },
      onUpdate: () => {
        camera.position.set(proxy.x, proxy.y, proxy.z);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      },
      onComplete: () => {
        gsapActive.current = false;
        activeTween.current = null;
        introComplete.current = true;
        if (controlsRef.current && !demoMode.current) {
          controlsRef.current.enabled = true;
        }
        resetIdleTimer();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Event-driven camera commands ──
  useEffect(() => {
    const handleRecenter = () => {
      killActiveTween();
      isAutoOrbit.current = false;
      isAnimating.current = false;

      const proxy = {
        x: camera.position.x, y: camera.position.y, z: camera.position.z,
        tx: controlsRef.current?.target.x ?? 0,
        ty: controlsRef.current?.target.y ?? 0,
        tz: controlsRef.current?.target.z ?? 0,
      };

      gsapActive.current = true;
      activeTween.current = gsap.to(proxy, {
        x: 0, y: 120, z: 320,
        tx: 0, ty: 0, tz: 0,
        duration: 2.5,
        ease: 'power3.inOut',
        onUpdate: () => {
          camera.position.set(proxy.x, proxy.y, proxy.z);
          if (controlsRef.current) {
            controlsRef.current.target.set(proxy.tx, proxy.ty, proxy.tz);
            controlsRef.current.update();
          } else {
            camera.lookAt(proxy.tx, proxy.ty, proxy.tz);
          }
        },
        onComplete: () => {
          gsapActive.current = false;
          activeTween.current = null;
          if (controlsRef.current && !demoMode.current) {
            controlsRef.current.enabled = true;
          }
          resetIdleTimer();
        },
      });
    };

    const handleFlyTo = ((e: CustomEvent<{ x: number; y: number; z: number; duration?: number }>) => {
      killActiveTween();
      isAutoOrbit.current = false;
      isAnimating.current = false; // Stop useFrame fly-to if any

      const { x, y, z, duration = 2.5 } = e.detail;
      if (controlsRef.current) controlsRef.current.enabled = false;

      // Position camera on the OUTER side of the node (away from galaxy center)
      // so the camera always faces inward toward the dense core
      const dist = Math.sqrt(x * x + z * z) || 1;
      const dirX = x / dist;
      const dirZ = z / dist;
      const camX = x + dirX * 40;
      const camY = y + 15;
      const camZ = z + dirZ * 40;

      const proxy = {
        px: camera.position.x, py: camera.position.y, pz: camera.position.z,
        tx: controlsRef.current?.target.x ?? 0,
        ty: controlsRef.current?.target.y ?? 0,
        tz: controlsRef.current?.target.z ?? 0,
      };

      gsapActive.current = true;
      activeTween.current = gsap.to(proxy, {
        px: camX, py: camY, pz: camZ,
        tx: x, ty: y, tz: z,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          camera.position.set(proxy.px, proxy.py, proxy.pz);
          if (controlsRef.current) {
            controlsRef.current.target.set(proxy.tx, proxy.ty, proxy.tz);
            controlsRef.current.update();
          } else {
            camera.lookAt(proxy.tx, proxy.ty, proxy.tz);
          }
        },
        onComplete: () => {
          gsapActive.current = false;
          activeTween.current = null;
          if (controlsRef.current && !demoMode.current) {
            controlsRef.current.enabled = true;
          }
          resetIdleTimer();
        },
      });
    }) as EventListener;

    const handleOrbit = ((e: CustomEvent<{
      x: number; y: number; z: number;
      radius?: number; height?: number;
      duration?: number; arc?: number;
    }>) => {
      killActiveTween();
      isAutoOrbit.current = false;
      isAnimating.current = false;

      const {
        x, y, z,
        radius = 60, height = 20,
        duration = 4, arc = Math.PI * 0.6,
      } = e.detail;

      if (controlsRef.current) controlsRef.current.enabled = false;

      const dx = camera.position.x - x;
      const dz = camera.position.z - z;
      const startAngle = Math.atan2(dz, dx);

      const proxy = { t: 0 };
      gsapActive.current = true;
      activeTween.current = gsap.to(proxy, {
        t: 1,
        duration,
        ease: 'power1.inOut', // Smooth start and stop — no jarring halt
        onUpdate: () => {
          const angle = startAngle + proxy.t * arc;
          const px = x + Math.cos(angle) * radius;
          const pz = z + Math.sin(angle) * radius;
          const py = y + height + Math.sin(proxy.t * Math.PI) * 8;

          camera.position.set(px, py, pz);
          if (controlsRef.current) {
            controlsRef.current.target.set(x, y, z);
            controlsRef.current.update();
          } else {
            camera.lookAt(x, y, z);
          }
        },
        onComplete: () => {
          gsapActive.current = false;
          activeTween.current = null;
          if (controlsRef.current && !demoMode.current) {
            controlsRef.current.enabled = true;
          }
          resetIdleTimer();
        },
      });
    }) as EventListener;

    // Demo mode toggle — locks out auto-orbit and controls
    const handleDemoStart = () => {
      demoMode.current = true;
      isAutoOrbit.current = false;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (controlsRef.current) controlsRef.current.enabled = false;
    };
    const handleDemoStop = () => {
      demoMode.current = false;
      killActiveTween();
      if (controlsRef.current) controlsRef.current.enabled = true;
      resetIdleTimer();
    };

    window.addEventListener('galaxy:recenter', handleRecenter);
    window.addEventListener('galaxy:flyto', handleFlyTo);
    window.addEventListener('galaxy:orbit', handleOrbit);
    window.addEventListener('galaxy:demo:start', handleDemoStart);
    window.addEventListener('galaxy:demo:stop', handleDemoStop);
    return () => {
      window.removeEventListener('galaxy:recenter', handleRecenter);
      window.removeEventListener('galaxy:flyto', handleFlyTo);
      window.removeEventListener('galaxy:orbit', handleOrbit);
      window.removeEventListener('galaxy:demo:start', handleDemoStart);
      window.removeEventListener('galaxy:demo:stop', handleDemoStop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-orbit idle detection ──
  function resetIdleTimer() {
    if (demoMode.current) return; // Never auto-orbit during demo
    isAutoOrbit.current = false;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (!isAnimating.current && !gsapActive.current && introComplete.current && !demoMode.current) {
        isAutoOrbit.current = true;
        orbitAngle.current = Math.atan2(camera.position.z, camera.position.x);
      }
    }, IDLE_TIMEOUT);
  }

  useEffect(() => {
    const reset = () => {
      if (!demoMode.current) resetIdleTimer();
    };
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

  // ── Fly-to selected node (useFrame-driven) ──
  useEffect(() => {
    // Skip if GSAP is controlling camera (demo mode flyTo)
    if (gsapActive.current || demoMode.current) {
      prevSelectedIndex.current = selectedIndex;
      return;
    }

    if (selectedIndex === null || selectedIndex === prevSelectedIndex.current) {
      prevSelectedIndex.current = selectedIndex;
      return;
    }
    prevSelectedIndex.current = selectedIndex;

    const node = nodes[selectedIndex];
    if (!node) return;

    isAutoOrbit.current = false;
    resetIdleTimer();

    const nodePos = new THREE.Vector3(node.x, node.y, node.z);
    // Place camera on outer side of node (away from galaxy center)
    // so we always look inward toward the dense core
    const dist = Math.sqrt(node.x * node.x + node.z * node.z) || 1;
    const offset = new THREE.Vector3(
      (node.x / dist) * 40,
      15,
      (node.z / dist) * 40,
    );

    startPosition.current.copy(camera.position);

    if (controlsRef.current) {
      startLookAt.current.copy(controlsRef.current.target);
    } else {
      const currentDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      startLookAt.current.copy(camera.position).add(currentDir.multiplyScalar(100));
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
    // Never interfere when GSAP is driving the camera
    if (gsapActive.current) return;

    // Auto-orbit when idle
    if (isAutoOrbit.current && !isAnimating.current && !demoMode.current) {
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

    // Fly-to animation (node selection, not demo)
    if (!isAnimating.current) return;

    progress.current = Math.min(1, progress.current + delta * 0.8);
    const t = easeInOutQuart(progress.current);

    camera.position.lerpVectors(startPosition.current, targetPosition.current, t);

    const currentLookAt = new THREE.Vector3().lerpVectors(
      startLookAt.current, targetLookAt.current, t
    );

    if (controlsRef.current) {
      controlsRef.current.target.copy(currentLookAt);
      controlsRef.current.update();
    } else {
      camera.lookAt(currentLookAt);
    }

    if (progress.current >= 1) {
      isAnimating.current = false;
      if (controlsRef.current && !demoMode.current) {
        controlsRef.current.enabled = true;
      }
      resetIdleTimer();
    }
  });

  return null;
}

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}
