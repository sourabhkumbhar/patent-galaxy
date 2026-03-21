import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { DataNode } from '../types/patent';
import { hexToRgb } from '../utils/colors';

interface MiniMapOverlayProps {
  nodes: DataNode[];
  filteredIndices: number[];
}

/**
 * R3F-compatible minimap renderer.
 * Creates its own canvas element and appends it to document.body
 * via imperative DOM manipulation (not React rendering),
 * avoiding the R3F reconciler conflict.
 */
export default function MiniMapOverlay({ nodes, filteredIndices }: MiniMapOverlayProps) {
  const { camera } = useThree();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameCount = useRef(0);

  const pointData = useMemo(() => {
    // Sample points for minimap — no need to draw all 500k on a 160px canvas
    const maxPoints = 5000;
    const step = filteredIndices.length > maxPoints
      ? Math.ceil(filteredIndices.length / maxPoints)
      : 1;
    const result = [];
    for (let j = 0; j < filteredIndices.length; j += step) {
      const n = nodes[filteredIndices[j]];
      const rgb = hexToRgb(n.color);
      result.push({ x: n.x, z: n.z, r: rgb.r, g: rgb.g, b: rgb.b });
    }
    return result;
  }, [nodes, filteredIndices]);

  // Imperatively create and mount the minimap DOM elements
  useEffect(() => {
    const container = document.createElement('div');
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', 'Mini-map showing patent distribution');
    container.style.cssText =
      'position:fixed;bottom:64px;right:16px;z-index:30;border-radius:8px;overflow:hidden;border:1px solid rgba(100,100,180,0.2);background:rgba(10,10,20,0.8)';

    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    container.appendChild(canvas);
    document.body.appendChild(container);

    canvasRef.current = canvas;
    containerRef.current = container;

    return () => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      canvasRef.current = null;
      containerRef.current = null;
    };
  }, []);

  useFrame(() => {
    frameCount.current++;
    if (frameCount.current % 10 !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scale = 0.45;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Draw points (XZ projection)
    for (const pt of pointData) {
      const px = cx + pt.x * scale;
      const py = cy + pt.z * scale;
      if (px < 0 || px > w || py < 0 || py > h) continue;

      ctx.fillStyle = `rgba(${Math.round(pt.r * 255)}, ${Math.round(pt.g * 255)}, ${Math.round(pt.b * 255)}, 0.5)`;
      ctx.fillRect(px, py, 1.5, 1.5);
    }

    // Draw camera position indicator
    const camPos = camera.position;
    const camX = cx + camPos.x * scale;
    const camY = cy + camPos.z * scale;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(camX, camY, 5, 0, Math.PI * 2);
    ctx.stroke();

    // Draw camera direction
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    ctx.beginPath();
    ctx.moveTo(camX, camY);
    ctx.lineTo(camX + dir.x * 15, camY + dir.z * 15);
    ctx.stroke();
  });

  return null;
}
