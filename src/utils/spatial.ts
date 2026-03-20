import { CPC_SECTIONS } from './colors';

/**
 * Pre-computed angular positions for each CPC section.
 * Sections are distributed evenly around a circle in the XZ plane.
 */
const SECTION_ANGLES: Record<string, number> = {};
CPC_SECTIONS.forEach((section, i) => {
  SECTION_ANGLES[section] = (i / CPC_SECTIONS.length) * Math.PI * 2;
});

/**
 * Pre-computed section centroid positions in 3D space.
 * Sections are arranged on a sphere of radius 80.
 */
export function getSectionCentroid(section: string): { x: number; y: number; z: number } {
  const angle = SECTION_ANGLES[section] ?? 0;
  const radius = 80;
  const elevation = ((CPC_SECTIONS.indexOf(section) % 3) - 1) * 20;
  return {
    x: Math.cos(angle) * radius,
    y: elevation,
    z: Math.sin(angle) * radius,
  };
}

/**
 * Generate a 3D position for a patent based on its CPC classification.
 * Uses CPC section for angular position, CPC class for radial offset,
 * and adds controlled randomness for visual density.
 */
export function generatePatentPosition(
  cpcSection: string,
  cpcClass: string,
  _year: number
): { x: number; y: number; z: number } {
  const centroid = getSectionCentroid(cpcSection);

  // Use CPC class number for radial variation
  const classNum = parseInt(cpcClass.replace(/\D/g, ''), 10) || 0;
  const classOffset = (classNum % 20) * 1.5;

  // Gaussian-like random spread
  const spreadX = (Math.random() + Math.random() + Math.random() - 1.5) * 25;
  const spreadY = (Math.random() + Math.random() + Math.random() - 1.5) * 25;
  const spreadZ = (Math.random() + Math.random() + Math.random() - 1.5) * 25;

  return {
    x: centroid.x + spreadX + classOffset * Math.cos(classNum),
    y: centroid.y + spreadY,
    z: centroid.z + spreadZ + classOffset * Math.sin(classNum),
  };
}

/**
 * Calculate distance between two 3D points.
 */
export function distance3D(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
