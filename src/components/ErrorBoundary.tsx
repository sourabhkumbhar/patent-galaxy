import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center"
          style={{ background: '#0a0a12' }}
        >
          <h2 className="text-xl font-light mb-4" style={{ color: '#e0e0f0' }}>
            Something went wrong
          </h2>
          <p className="text-sm mb-6 max-w-md text-center" style={{ color: '#8888aa' }}>
            The 3D visualization encountered an error. This may be due to WebGL
            not being supported on your device.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-md px-4 py-2 text-sm transition-colors"
            style={{
              background: 'rgba(68, 136, 255, 0.2)',
              color: '#4488ff',
              border: '1px solid rgba(68, 136, 255, 0.3)',
            }}
          >
            Try Again
          </button>
          {this.state.error && (
            <pre
              className="mt-4 text-xs max-w-lg overflow-auto p-3 rounded"
              style={{ color: '#666677', background: 'rgba(255,255,255,0.03)' }}
            >
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
