import React from 'react';
import ErrorState from './ErrorState';

/**
 * Hospital Platform — ErrorBoundary Component
 * Catches uncaught runtime render errors in child component trees,
 * logs diagnostic details to the console, and prevents full-screen unmounting (white screen).
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled React render error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="container py-4">
          <ErrorState
            title="Operational Workspace Error"
            message={
              this.state.error?.message
                ? `The workspace encountered an unexpected rendering issue: ${this.state.error.message}`
                : 'An unexpected rendering error occurred in this workspace module. Please reload the view.'
            }
            onRetry={() => {
              this.handleReset();
              window.location.reload();
            }}
            retryLabel="Reload Workspace"
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
