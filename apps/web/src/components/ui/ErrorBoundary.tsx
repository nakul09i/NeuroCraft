import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("NeuroCraft UI Exception Caught:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-surface-1 border border-border shadow-xl text-center space-y-5 animate-scaleIn">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-danger-subtle border border-danger-border flex items-center justify-center text-danger">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-text-primary tracking-tight">
                {this.props.fallbackTitle || "Something went wrong"}
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                NeuroCraft encountered an unexpected rendering error. No security data was lost or compromised.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-text-inverse hover:bg-primary-hover transition-colors shadow-sm focus-ring"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload View</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-text-primary transition-colors focus-ring"
              >
                Refresh Application
              </button>
            </div>

            {this.state.error && (
              <div className="pt-3 border-t border-border text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center space-x-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  <span>Technical Diagnostics</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {this.state.showDetails && (
                  <pre className="mt-2 p-3 rounded-lg bg-surface-0 border border-border text-[11px] font-mono text-danger overflow-x-auto max-h-40 leading-tight">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
