import { useRef, useCallback, useState } from 'react';

interface UseTimeAnimationOptions {
  minYear: number;
  maxYear: number;
  onYearChange: (range: [number, number]) => void;
  intervalMs?: number;
}

/**
 * Hook for animating through years, building up the galaxy over time.
 * Returns play/pause controls and the current animation year.
 */
export function useTimeAnimation({
  minYear,
  maxYear,
  onYearChange,
  intervalMs = 400,
}: UseTimeAnimationOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentYear = useRef(minYear);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const play = useCallback(() => {
    if (intervalRef.current) return;

    currentYear.current = minYear;
    onYearChange([minYear, minYear]);
    setIsPlaying(true);

    intervalRef.current = setInterval(() => {
      currentYear.current += 1;
      if (currentYear.current > maxYear) {
        currentYear.current = maxYear;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPlaying(false);
        return;
      }
      onYearChange([minYear, currentYear.current]);
    }, intervalMs);
  }, [minYear, maxYear, onYearChange, intervalMs]);

  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    pause();
    currentYear.current = maxYear;
    onYearChange([minYear, maxYear]);
  }, [pause, minYear, maxYear, onYearChange]);

  return { isPlaying, play, pause, reset };
}
