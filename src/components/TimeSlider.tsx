import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface TimeSliderProps {
  yearRange: [number, number];
  minYear: number;
  maxYear: number;
  onChange: (range: [number, number]) => void;
  yearCounts: Map<number, number>;
  onCinematicChange?: (active: boolean) => void;
}

/**
 * A dual-range time slider at the bottom of the screen with a sparkline
 * showing patent counts per year. Allows filtering visible patents by year.
 */
export default function TimeSlider({
  yearRange,
  minYear,
  maxYear,
  onChange,
  yearCounts,
  onCinematicChange,
}: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCinematic, setIsCinematic] = useState(false);
  const [cinematicYear, setCinematicYear] = useState<number | null>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const playYearRef = useRef(yearRange[0]);

  const totalYears = maxYear - minYear;

  // Sparkline data (memoized to avoid recalculation on every render)
  const sparklinePoints = useMemo(() => {
    const maxCount = Math.max(...Array.from(yearCounts.values()), 1);
    const points: { year: number; count: number; pct: number }[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      const c = yearCounts.get(y) ?? 0;
      points.push({ year: y, count: c, pct: c / maxCount });
    }
    return points;
  }, [yearCounts, minYear, maxYear]);

  // Animation playback
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
      return;
    }

    let lastTime = 0;
    const step = (time: number) => {
      if (time - lastTime > 400) {
        lastTime = time;
        playYearRef.current += 1;
        if (playYearRef.current > maxYear) {
          playYearRef.current = minYear;
        }
        onChange([minYear, playYearRef.current]);
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, minYear, maxYear, onChange]);

  // Cinematic time-lapse mode
  const startCinematic = useCallback(() => {
    setIsPlaying(false);
    setIsCinematic(true);
    setCinematicYear(minYear);
    onCinematicChange?.(true);
    onChange([minYear, minYear]);
    playYearRef.current = minYear;
  }, [minYear, onChange, onCinematicChange]);

  const stopCinematic = useCallback(() => {
    setIsCinematic(false);
    setCinematicYear(null);
    onCinematicChange?.(false);
    onChange([minYear, maxYear]);
  }, [minYear, maxYear, onChange, onCinematicChange]);

  useEffect(() => {
    if (!isCinematic) return;

    let lastTime = 0;
    const step = (time: number) => {
      if (time - lastTime > 800) {
        lastTime = time;
        playYearRef.current += 1;
        if (playYearRef.current > maxYear) {
          // Hold on final frame briefly, then exit
          setTimeout(() => stopCinematic(), 1500);
          return;
        }
        setCinematicYear(playYearRef.current);
        onChange([minYear, playYearRef.current]);
      }
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [isCinematic, minYear, maxYear, onChange, stopCinematic]);

  const getYearFromMouseEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return minYear;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(minYear + pct * totalYears);
    },
    [minYear, totalYears]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, handle: 'start' | 'end') => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(handle);

      const handlePointerMove = (ev: PointerEvent) => {
        const year = getYearFromMouseEvent(ev.clientX);
        if (handle === 'start') {
          onChange([Math.min(year, yearRange[1]), yearRange[1]]);
        } else {
          onChange([yearRange[0], Math.max(year, yearRange[0])]);
        }
      };

      const handlePointerUp = () => {
        setDragging(null);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [yearRange, onChange, getYearFromMouseEvent]
  );

  const startPct = ((yearRange[0] - minYear) / totalYears) * 100;
  const endPct = ((yearRange[1] - minYear) / totalYears) * 100;

  return (
    <>
    {/* Cinematic year overlay */}
    {isCinematic && cinematicYear !== null && (
      <div
        className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
      >
        <div className="text-center">
          <div
            className="text-8xl font-extralight tracking-widest tabular-nums"
            style={{
              color: 'rgba(68, 136, 255, 0.6)',
              textShadow: '0 0 40px rgba(68, 136, 255, 0.3)',
              transition: 'opacity 0.3s',
            }}
          >
            {cinematicYear}
          </div>
          <div className="text-sm mt-4" style={{ color: 'rgba(136, 136, 170, 0.8)' }}>
            {(yearCounts.get(cinematicYear) ?? 0).toLocaleString()} patents
          </div>
        </div>
      </div>
    )}

    <div
      className="fixed bottom-0 left-0 right-0 z-30 px-6 py-3"
      style={{
        background: 'linear-gradient(transparent, rgba(10, 10, 20, 0.95))',
      }}
    >
      <div className="mx-auto max-w-4xl">
        {/* Sparkline */}
        <div className="flex items-end gap-px h-8 mb-2 px-1">
          {sparklinePoints.map((pt) => (
            <div
              key={pt.year}
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${Math.max(2, pt.pct * 100)}%`,
                background:
                  pt.year >= yearRange[0] && pt.year <= yearRange[1]
                    ? 'rgba(68, 136, 255, 0.6)'
                    : 'rgba(68, 136, 255, 0.15)',
              }}
              title={`${pt.year}: ${pt.count.toLocaleString()} patents`}
            />
          ))}
        </div>

        {/* Slider track */}
        <div className="flex items-center gap-4">
          {/* Play button */}
          <button
            onClick={() => {
              if (!isPlaying) playYearRef.current = yearRange[0];
              setIsPlaying(!isPlaying);
            }}
            aria-label={isPlaying ? 'Pause timeline animation' : 'Play timeline animation'}
            className="shrink-0 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            style={{
              background: 'rgba(68, 136, 255, 0.2)',
              color: '#4488ff',
              border: '1px solid rgba(68, 136, 255, 0.3)',
            }}
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="1" y="1" width="4" height="10" />
                <rect x="7" y="1" width="4" height="10" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <polygon points="2,0 12,6 2,12" />
              </svg>
            )}
          </button>

          {/* Cinematic mode button */}
          <button
            onClick={() => isCinematic ? stopCinematic() : startCinematic()}
            aria-label={isCinematic ? 'Exit cinematic mode' : 'Start cinematic time-lapse'}
            title={isCinematic ? 'Exit cinematic mode' : 'Cinematic time-lapse'}
            className="shrink-0 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
            style={{
              background: isCinematic ? 'rgba(68, 136, 255, 0.4)' : 'rgba(68, 136, 255, 0.1)',
              color: '#4488ff',
              border: `1px solid rgba(68, 136, 255, ${isCinematic ? '0.6' : '0.2'})`,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
              <line x1="17" y1="17" x2="22" y2="17" />
            </svg>
          </button>

          {/* Year label - start */}
          <span className="text-xs font-mono w-10 text-center" style={{ color: '#8888aa' }}>
            {yearRange[0]}
          </span>

          {/* Track */}
          <div ref={trackRef} className="relative flex-1 h-2 rounded-full cursor-pointer"
            style={{ background: 'rgba(100, 100, 180, 0.15)' }}
          >
            {/* Selected range */}
            <div
              className="absolute h-full rounded-full"
              style={{
                left: `${startPct}%`,
                width: `${endPct - startPct}%`,
                background: 'rgba(68, 136, 255, 0.4)',
              }}
            />

            {/* Start handle */}
            <div
              role="slider"
              aria-label="Start year"
              aria-valuemin={minYear}
              aria-valuemax={maxYear}
              aria-valuenow={yearRange[0]}
              tabIndex={0}
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full cursor-grab"
              style={{
                left: `${startPct}%`,
                marginLeft: -12,
                background: dragging === 'start' ? '#4488ff' : 'rgba(68, 136, 255, 0.8)',
                border: '2px solid #4488ff',
                boxShadow: '0 0 8px rgba(68, 136, 255, 0.5)',
                touchAction: 'none',
              }}
              onPointerDown={(e) => handlePointerDown(e, 'start')}
            />

            {/* End handle */}
            <div
              role="slider"
              aria-label="End year"
              aria-valuemin={minYear}
              aria-valuemax={maxYear}
              aria-valuenow={yearRange[1]}
              tabIndex={0}
              className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full cursor-grab"
              style={{
                left: `${endPct}%`,
                marginLeft: -12,
                background: dragging === 'end' ? '#4488ff' : 'rgba(68, 136, 255, 0.8)',
                border: '2px solid #4488ff',
                boxShadow: '0 0 8px rgba(68, 136, 255, 0.5)',
                touchAction: 'none',
              }}
              onPointerDown={(e) => handlePointerDown(e, 'end')}
            />
          </div>

          {/* Year label - end */}
          <span className="text-xs font-mono w-10 text-center" style={{ color: '#8888aa' }}>
            {yearRange[1]}
          </span>
        </div>
      </div>
    </div>
    </>
  );
}
