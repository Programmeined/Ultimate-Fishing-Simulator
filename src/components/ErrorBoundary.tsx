import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || 'Unbekannter Fehler.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
      if (parsed && typeof parsed.error === 'string') {
        readable = `Datenbankfehler (${parsed.operationType || 'Zugriff'}): ${parsed.error}`;
      }
    } catch {
      // keep raw message
    }
    return {
      hasError: true,
      message: readable,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0c1617] text-[#edf3ed] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl panel-surface border border-[rgba(225,126,112,0.4)] p-6 space-y-4">
            <h1 className="font-display text-xl font-semibold text-[#e5bd70]">
              Verbindungs- oder Anwendungsfehler
            </h1>
            <p className="text-sm text-[#cbd8d1] leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#e5bd70] hover:bg-[#edd08e] text-[#171208] text-sm font-bold cursor-pointer"
            >
              Spiel neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
