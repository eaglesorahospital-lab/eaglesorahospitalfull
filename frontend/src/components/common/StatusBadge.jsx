import React from 'react';

/**
 * Hospital Platform — Status Badge Component (Phase 1)
 * Standardizes clinical status displays (confirmed, scheduled, pending, cancelled).
 */
export function StatusBadge({ status = 'scheduled', label, className = '' }) {
  const normalizedStatus = status.toLowerCase();
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`hospital-badge hospital-badge-${normalizedStatus} ${className}`.trim()}
    >
      {displayLabel}
    </span>
  );
}

export default StatusBadge;
