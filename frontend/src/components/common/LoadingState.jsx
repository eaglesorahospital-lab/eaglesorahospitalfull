import React from 'react';

/**
 * Hospital Platform — Loading State Component (Phase 1)
 * Standardizes non-skeleton accessible loading state using a dignified spinner.
 */
export function LoadingState({
  message = 'Loading hospital information...',
  className = '',
}) {
  return (
    <div
      className={`hospital-loading-state ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <div className="hospital-spinner" aria-hidden="true" />
      <p className="hospital-text-supporting mb-0">{message}</p>
    </div>
  );
}

export default LoadingState;
