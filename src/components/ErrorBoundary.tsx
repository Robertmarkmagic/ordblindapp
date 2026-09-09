import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ReliefRead render error", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5" role="alert">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-paper">
          <h1 className="font-display text-2xl font-semibold text-foreground">Noget gik galt</h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Dine gemte dokumenter er ikke slettet. Genindlæs siden og prøv igen.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 min-h-11 rounded-full bg-sage px-6 font-semibold text-sage-foreground"
          >
            Genindlæs siden
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
