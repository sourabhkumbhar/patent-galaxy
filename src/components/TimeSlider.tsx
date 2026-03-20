import { useState, useCallback, useRef, useEffect } from 'react';

interface TimeSliderProps {
  yearRange: [number, number];
  minYear: number;
  maxYear: number;
  onChange: (range: [number, number]) => void;
  yearCounts: Map<number, number>;
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
}: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const playYearRef = useRef(yearRange[0]);

  const totalYears = maxYear - minYear;

  // Sparkline data
  const maxCount = Math.max(...Array.from(yearCounts.values()), 1);
  const sparklinePoints: { year: number; count: number; pct: number }[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    const c = yearCounts.get(y) ?? 0;
    sparklinePoints.push({ year: y, count: c, pct: c / maxCount });
  }

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

  const getYearFromMouseEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return minYear;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(minYear + pct * totalYears);
    },
    [minYear, totalYears]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: 'start' | 'end') => {
      e.preventDefault();
      setDragging(handle);

      const handleMouseMove = (ev: MouseEvent) => {
        const year = getYearFromMouseEvent(ev.clientX);
        if (handle === 'start') {
          onChange([Math.min(year, yearRange[1]), yearRange[1]]);
        } else {
          onChange([yearRange[0], Math.max(year, yearRange[0])]);
        }
      };

      const handleMouseUp = () => {
        setDragging(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [yearRange, onChange, getYearFromMouseEvent]
  );

  const startPct = ((yearRange[0] - minYear) / totalYears) * 100;
  const endPct = ((yearRange[1] - minYear) / totalYears) * 100;

  return (
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
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-grab"
              style={{
                left: `${startPct}%`,
                marginLeft: -8,
                background: dragging === 'start' ? '#4488ff' : 'rgba(68, 136, 255, 0.8)',
                border: '2px solid #4488ff',
                boxShadow: '0 0 8px rgba(68, 136, 255, 0.5)',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'start')}
            />

            {/* End handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-grab"
              style={{
                left: `${endPct}%`,
                marginLeft: -8,
                background: dragging === 'end' ? '#4488ff' : 'rgba(68, 136, 255, 0.8)',
                border: '2px solid #4488ff',
                boxShadow: '0 0 8px rgba(68, 136, 255, 0.5)',
              }}
              onMouseDown={(e) => handleMouseDown(e, 'end')}
            />
          </div>

          {/* Year label - end */}
          <span className="text-xs font-mono w-10 text-center" style={{ color: '#8888aa' }}>
            {yearRange[1]}
          </span>
        </div>
      </div>
    </div>
  );
}
