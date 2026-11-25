import React from 'react';
import { AlpanaDivider } from './AlpanaOrnaments';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed.error) {
        readable = `Database access error (${parsed.operationType ?? 'operation'} on ${parsed.path ?? 'collection'}): ${parsed.error}`;
      }
    } catch {
      // Plain error string
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error): void {
    console.error('Studio ErrorBoundary caught:', error);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDF3D0] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#FFF9E2] border border-[#E6D194] rounded-xl p-8 text-center shadow-lg">
            <p className="text-[11px] font-medium tracking-[0.24em] uppercase text-[#9E2A2B] mb-2">
              Wedding Invitation Studio
            </p>
            <h1 className="font-editorial text-3xl font-semibold text-[#4D0A14]">
              Medha Weds Saptarshi Studio
            </h1>
            <AlpanaDivider className="w-48 mx-auto my-4 text-[#C89D54]" />
            <p className="text-sm text-[#4C373A] leading-relaxed mb-6">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[#9E2A2B] text-[#FAF5EC] text-sm font-medium hover:bg-[#7F1924] transition-colors cursor-pointer"
            >
              Reload Studio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
