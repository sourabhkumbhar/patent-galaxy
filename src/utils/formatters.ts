/**
 * Format a patent ID for display.
 * Example: "US-11234567-B2" -> "US 11,234,567 B2"
 */
export function formatPatentId(id: string): string {
  const parts = id.split('-');
  if (parts.length !== 3) return id;
  const num = parseInt(parts[1], 10);
  return `${parts[0]} ${num.toLocaleString()} ${parts[2]}`;
}

/**
 * Format a date from year and month.
 */
export function formatDate(year: number, month: number): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${monthNames[month - 1]} ${year}`;
}

/**
 * Format a large number with abbreviations.
 * Example: 1234 -> "1.2K", 1234567 -> "1.2M"
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

/**
 * Generate a USPTO patent URL from a patent ID.
 */
export function getPatentUrl(id: string): string {
  const parts = id.split('-');
  if (parts.length !== 3) return `https://patents.google.com/patent/${id}`;
  return `https://patents.google.com/patent/${parts[0]}${parts[1]}${parts[2]}`;
}
