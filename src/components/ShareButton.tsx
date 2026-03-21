import { useState, useCallback } from 'react';

interface ShareButtonProps {
  onCopy: () => Promise<boolean>;
}

export default function ShareButton({ onCopy }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    const success = await onCopy();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [onCopy]);

  return (
    <button
      onClick={handleClick}
      aria-label="Copy shareable link to clipboard"
      className="rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 btn-interactive"
      style={{
        background: copied ? 'rgba(68, 200, 120, 0.1)' : 'var(--accent-glow)',
        color: copied ? '#44c878' : 'var(--text-secondary)',
        border: `1px solid ${copied ? 'rgba(68, 200, 120, 0.25)' : 'var(--border-color)'}`,
        transition: 'all 0.3s ease',
      }}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Share View
        </>
      )}
    </button>
  );
}
