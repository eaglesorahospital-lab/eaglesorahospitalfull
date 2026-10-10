import React from 'react';

/**
 * Hospital Platform — Admin Status Badge Component (Phase 8)
 * Standardizes clinical, administrative, and system status indicators.
 * Strictly complies with design blacklist: no rainbow/neon colors, clear semantic contrast.
 */
export function AdminStatusBadge({ status, className = '' }) {
  if (!status) return null;

  const raw = String(status).trim().toUpperCase();

  let badgeClass = 'hospital-badge-scheduled';
  let label = status;

  switch (raw) {
    case 'CONFIRMED':
      badgeClass = 'hospital-badge-scheduled';
      label = 'Confirmed';
      break;
    case 'CHECKED_IN':
      badgeClass = 'hospital-badge-confirmed';
      label = 'Checked In';
      break;
    case 'REQUESTED':
    case 'PENDING':
    case 'DRAFT':
      badgeClass = 'hospital-badge-pending';
      label = raw === 'REQUESTED' ? 'Requested' : raw === 'DRAFT' ? 'Draft' : 'Pending';
      break;
    case 'COMPLETED':
    case 'ACTIVE':
    case 'PUBLISHED':
    case 'SENT':
    case 'SUCCESS':
      badgeClass = 'hospital-badge-confirmed';
      label = raw === 'COMPLETED' ? 'Completed' : raw === 'ACTIVE' ? 'Active' : raw === 'PUBLISHED' ? 'Published' : raw === 'SENT' ? 'Sent' : 'Success';
      break;
    case 'CANCELLED':
    case 'FAILED':
    case 'DENIED':
      badgeClass = 'hospital-badge-cancelled';
      label = raw === 'CANCELLED' ? 'Cancelled' : raw === 'FAILED' ? 'Failed' : 'Denied';
      break;
    case 'NO_SHOW':
      badgeClass = 'hospital-badge-cancelled';
      label = 'No Show';
      break;
    case 'RESCHEDULED':
      badgeClass = 'hospital-badge-pending';
      label = 'Rescheduled';
      break;
    case 'INACTIVE':
      badgeClass = 'hospital-badge-muted';
      label = 'Inactive';
      break;
    case 'WARNING':
      badgeClass = 'hospital-badge-pending';
      label = 'Warning';
      break;
    default:
      badgeClass = 'hospital-badge-scheduled';
      label = status;
  }

  return (
    <span className={`hospital-badge ${badgeClass} ${className}`.trim()}>
      {label}
    </span>
  );
}

export default AdminStatusBadge;
