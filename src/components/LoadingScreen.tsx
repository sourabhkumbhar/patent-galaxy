interface LoadingScreenProps {
  progress?: number; // 0-100
  projectName?: string;
}

/**
 * Full-screen loading screen shown while data is being loaded.
 * Features a pulsing galaxy animation and optional download progress bar.
 */
export default function LoadingScreen({ progress, projectName = 'NodeVerse' }: LoadingScreenProps) {
  const noun = projectName.toLowerCase().includes('paper') ? 'papers' : 'patents';

  const statusText =
    progress === undefined || progress === 0
      ? 'Initializing...'
      : progress < 95
        ? `Loading ${noun}... ${progress}%`
        : progress < 100
          ? `Processing ${noun}...`
          : 'Preparing visualization...';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: '#0a0a12' }}
    >
      {/* Animated rings */}
      <div className="relative w-32 h-32 mb-8">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '2px solid rgba(68, 136, 255, 0.3)',
            animation: 'pulse-ring 2s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-4 rounded-full"
          style={{
            border: '2px solid rgba(34, 211, 238, 0.3)',
            animation: 'pulse-ring 2s ease-in-out infinite 0.3s',
          }}
        />
        <div
          className="absolute inset-8 rounded-full"
          style={{
            border: '2px solid rgba(255, 212, 59, 0.3)',
            animation: 'pulse-ring 2s ease-in-out infinite 0.6s',
          }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{
              background: 'radial-gradient(circle, #4488ff, transparent)',
              boxShadow: '0 0 20px rgba(68, 136, 255, 0.5)',
              animation: 'glow 1.5s ease-in-out infinite alternate',
            }}
          />
        </div>
      </div>

      <h1 className="text-2xl font-light tracking-wide mb-2" style={{ color: '#e0e0f0' }}>
        {projectName}
      </h1>
      <p className="text-sm mb-6" style={{ color: '#8888aa' }}>
        {statusText}
      </p>

      {/* Progress bar */}
      {progress !== undefined && progress > 0 && (
        <div className="w-64 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(100, 100, 180, 0.15)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #4488ff, #22d3ee)',
              boxShadow: '0 0 8px rgba(68, 136, 255, 0.4)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
