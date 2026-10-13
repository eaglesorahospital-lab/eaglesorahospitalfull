import React from 'react';

/**
 * Hospital Platform — Status Badge Component (Phase 1)
 * Standardizes clinical status displays (confirmed, scheduled, requested/pending, cancelled, completed).
 */
export function StatusBadge({ status = 'scheduled', label, className = '' }) {
  const raw = String(status || '').trim().toUpperCase();
  let badgeClass = 'hospital-badge-scheduled';
  let defaultLabel = status;

  switch (raw) {
    case 'CONFIRMED':
      badgeClass = 'hospital-badge-confirmed';
      defaultLabel = 'Confirmed';
      break;
    case 'REQUESTED':
    case 'PENDING':
    case 'DRAFT':
      badgeClass = 'hospital-badge-pending';
      defaultLabel = raw === 'REQUESTED' ? 'Requested' : 'Pending';
      break;
    case 'CANCELLED':
      badgeClass = 'hospital-badge-cancelled';
      defaultLabel = 'Cancelled';
      break;
    case 'COMPLETED':
      badgeClass = 'hospital-badge-confirmed';
      defaultLabel = 'Completed';
      break;
    case 'CHECKED_IN':
      badgeClass = 'hospital-badge-confirmed';
      defaultLabel = 'Checked In';
      break;
    case 'NO_SHOW':
      badgeClass = 'hospital-badge-cancelled';
      defaultLabel = 'No Show';
      break;
    case 'SCHEDULED':
      badgeClass = 'hospital-badge-scheduled';
      defaultLabel = 'Scheduled';
      break;
    default:
      badgeClass = `hospital-badge-${raw.toLowerCase()}`;
      defaultLabel = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : '';
  }

  const displayLabel = label || defaultLabel;

  return (
    <span
      className={`hospital-badge ${badgeClass} ${className}`.trim()}
    >
      {displayLabel}
    </span>
  );
}

export default StatusBadge;
