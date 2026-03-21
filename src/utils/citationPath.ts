import type { CitationEdge } from '../types/patent';

/**
 * Build an adjacency list from citation edges (undirected for path finding).
 */
function buildAdjacency(edges: CitationEdge[]): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push(edge.target);
    adj.get(edge.target)!.push(edge.source);
  }
  return adj;
}

/**
 * Find the shortest citation path between two patents using BFS.
 * Returns the path as an array of node indices, or null if no path exists.
 * Limits search depth to prevent runaway traversal.
 */
export function findCitationPath(
  edges: CitationEdge[],
  startIndex: number,
  endIndex: number,
  maxDepth = 10
): number[] | null {
  if (startIndex === endIndex) return [startIndex];

  const adj = buildAdjacency(edges);
  if (!adj.has(startIndex) || !adj.has(endIndex)) return null;

  const visited = new Set<number>();
  const parent = new Map<number, number>();
  const queue: { index: number; depth: number }[] = [
    { index: startIndex, depth: 0 },
  ];
  visited.add(startIndex);

  while (queue.length > 0) {
    const { index, depth } = queue.shift()!;

    if (depth >= maxDepth) continue;

    const neighbors = adj.get(index);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, index);

      if (neighbor === endIndex) {
        // Reconstruct path
        const path: number[] = [endIndex];
        let current = endIndex;
        while (current !== startIndex) {
          current = parent.get(current)!;
          path.unshift(current);
        }
        return path;
      }

      queue.push({ index: neighbor, depth: depth + 1 });
    }
  }

  return null;
}
