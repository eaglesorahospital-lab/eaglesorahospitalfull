import React from 'react';

/**
 * Hospital Platform — Empty State Component (Phase 1)
 * Calm message presentation when no clinical records or search results are found.
 */
export function EmptyState({
  title = 'No Records Found',
  message = 'There is currently no information available in this section.',
  action = null,
  className = '',
}) {
  return (
    <div className={`hospital-empty-state ${className}`.trim()}>
      <h3 className="hospital-subsection-title mb-2">{title}</h3>
      <p className="hospital-text-supporting mb-3">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default EmptyState;
