import { useEffect, useCallback, useRef } from 'react';
import type { DataNode } from '../types/patent';

interface UseKeyboardNavigationParams {
  nodes: DataNode[];
  filteredIndices: number[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onHover: (index: number | null) => void;
}

/**
 * Keyboard navigation for the patent galaxy.
 * - Arrow keys: jump to nearest patent in that direction
 * - Escape: deselect current patent
 * - Tab: cycle through filtered patents sequentially
 */
export function useKeyboardNavigation({
  nodes,
  filteredIndices,
  selectedIndex,
  onSelect,
  onHover,
}: UseKeyboardNavigationParams) {
  const cycleIndexRef = useRef(0);

  const findNearest = useCallback(
    (
      fromIndex: number,
      direction: 'left' | 'right' | 'up' | 'down'
    ): number | null => {
      const from = nodes[fromIndex];
      if (!from) return null;

      let bestIndex: number | null = null;
      let bestDist = Infinity;

      for (const idx of filteredIndices) {
        if (idx === fromIndex) continue;
        const n = nodes[idx];

        const dx = n.x - from.x;
        const dy = n.y - from.y;
        const dz = n.z - from.z;

        // Check if the candidate is in the correct direction
        let isInDirection = false;
        switch (direction) {
          case 'left':
            isInDirection = dx < -1;
            break;
          case 'right':
            isInDirection = dx > 1;
            break;
          case 'up':
            isInDirection = dy > 1;
            break;
          case 'down':
            isInDirection = dy < -1;
            break;
        }

        if (!isInDirection) continue;

        const dist = dx * dx + dy * dy + dz * dz;
        if (dist < bestDist) {
          bestDist = dist;
          bestIndex = idx;
        }
      }

      return bestIndex;
    },
    [nodes, filteredIndices]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case 'Escape': {
          onSelect(null);
          onHover(null);
          break;
        }

        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          e.preventDefault();
          if (selectedIndex === null) {
            // Select first visible patent
            if (filteredIndices.length > 0) {
              onSelect(filteredIndices[0]);
            }
            return;
          }

          const dirMap: Record<string, 'left' | 'right' | 'up' | 'down'> = {
            ArrowLeft: 'left',
            ArrowRight: 'right',
            ArrowUp: 'up',
            ArrowDown: 'down',
          };
          const next = findNearest(selectedIndex, dirMap[e.key]);
          if (next !== null) {
            onSelect(next);
          }
          break;
        }

        case 'Tab': {
          if (filteredIndices.length === 0) return;
          e.preventDefault();
          const step = e.shiftKey ? -1 : 1;
          cycleIndexRef.current =
            (cycleIndexRef.current + step + filteredIndices.length) %
            filteredIndices.length;
          onSelect(filteredIndices[cycleIndexRef.current]);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredIndices, onSelect, onHover, findNearest]);
}
