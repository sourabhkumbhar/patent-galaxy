import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const PARTICLE_COUNT = 2000;
const SPREAD = 250;

const dustVertexShader = `
  attribute float aSize;
  uniform float uTime;

  void main() {
    vec3 pos = position;
    pos.x += sin(uTime * 0.1 + position.z * 0.01) * 5.0;
    pos.y += cos(uTime * 0.08 + position.x * 0.01) * 3.0;
    pos.z += sin(uTime * 0.12 + position.y * 0.01) * 4.0;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (150.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 0.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const dustFragmentShader = `
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * 0.2;
    gl_FragColor = vec4(0.67, 0.67, 0.8, alpha);
  }
`;

/**
 * Sparse field of tiny drifting particles for atmospheric depth.
 * Pure decoration -- no interaction, no raycasting.
 */
export default function AmbientDust() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD * 2;
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: dustVertexShader,
      fragmentShader: dustFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    materialRef.current = mat;
    return mat;
  }, []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return <points geometry={geometry} material={material} />;
}
