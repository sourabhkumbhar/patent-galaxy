/**
 * Maps CPC sections to their galaxy visualization colors.
 * Each section represents a major technological domain.
 */
export const CPC_COLORS: Record<string, string> = {
  A: '#ff6b6b', // Human Necessities - warm coral/red
  B: '#ffa94d', // Operations/Transport - amber/orange
  C: '#51cf66', // Chemistry/Metallurgy - green
  D: '#cc5de8', // Textiles/Paper - pale lavender
  E: '#a0714f', // Fixed Constructions - earthy brown
  F: '#74c0fc', // Mechanical Engineering - steel blue
  G: '#22d3ee', // Physics - electric cyan
  H: '#ffd43b', // Electricity - golden yellow
  Y: '#ff8787', // Emerging cross-sectional tech - soft red
};

export const CPC_SECTION_NAMES: Record<string, string> = {
  A: 'Human Necessities',
  B: 'Operations & Transport',
  C: 'Chemistry & Metallurgy',
  D: 'Textiles & Paper',
  E: 'Fixed Constructions',
  F: 'Mechanical Engineering',
  G: 'Physics',
  H: 'Electricity',
  Y: 'Emerging Tech',
};

export const CPC_SECTIONS = Object.keys(CPC_COLORS);

/**
 * Returns a THREE.js compatible color number from a hex string.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 1, g: 1, b: 1 };
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}
