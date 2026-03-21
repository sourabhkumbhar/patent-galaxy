/**
 * Maps CPC sections to their galaxy visualization colors.
 * Each section represents a major technological domain.
 */
export const CPC_COLORS: Record<string, string> = {
  A: '#ff5577', // Human Necessities - rose red
  B: '#22d3ee', // Operations/Transport - cyan
  C: '#ffb020', // Chemistry/Metallurgy - amber
  D: '#a855f7', // Textiles/Paper - purple
  E: '#34d399', // Fixed Constructions - emerald
  F: '#f97316', // Mechanical Engineering - orange
  G: '#60a5fa', // Physics - sky blue
  H: '#facc15', // Electricity - golden yellow
  Y: '#c084fc', // Emerging cross-sectional tech - lavender
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
