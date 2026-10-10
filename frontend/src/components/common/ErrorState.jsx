import React from 'react';
import Button from './Button';

/**
 * Hospital Platform — Error State Component (Phase 1)
 * High-clarity error feedback without dramatic warning icons.
 */
export function ErrorState({
  title = 'Service Temporarily Unavailable',
  message = 'An error occurred while loading this section. Please try again or contact the hospital desk.',
  onRetry = null,
  retryLabel = 'Try Again',
  className = '',
}) {
  return (
    <div
      className={`hospital-error-state ${className}`.trim()}
      role="alert"
    >
      <h3 className="h6 fw-bold mb-2">{title}</h3>
      <p className="mb-3 small">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-danger text-danger"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
