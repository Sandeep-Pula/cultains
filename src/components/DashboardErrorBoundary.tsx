import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type DashboardErrorBoundaryProps = {
  children: ReactNode;
};

type DashboardErrorBoundaryState = {
  error: Error | null;
};

export class DashboardErrorBoundary extends Component<DashboardErrorBoundaryProps, DashboardErrorBoundaryState> {
  state: DashboardErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard render failed', error, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-brand-60 px-6 py-10 text-brand-dark">
        <div className="mx-auto max-w-xl rounded-[32px] border border-brand-30 bg-white p-8 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
            <AlertTriangle size={22} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Dashboard could not render</h1>
          <p className="mt-2 text-sm text-brand-dark/75">
            Something in the dashboard failed while loading. Refresh once; if it repeats, this panel will keep the app from going blank.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto rounded-2xl bg-brand-60 p-4 text-xs text-brand-dark/75">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-2xl bg-brand-10 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Reload dashboard
          </button>
        </div>
      </div>
    );
  }
}
