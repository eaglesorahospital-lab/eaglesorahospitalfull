import React from 'react';

/**
 * Hospital Platform — Admin Status Badge Component
 * Standardizes clinical, administrative, and system status indicators
 * with soft Neumorphic pill surfaces and semantic color contrast.
 */
export function AdminStatusBadge({ status, className = '' }) {
  if (!status) return null;

  const raw = String(status).trim().toUpperCase();

  let neuClass = 'neu-badge-info';
  let label = status;

  switch (raw) {
    case 'CONFIRMED':
      neuClass = 'neu-badge-success';
      label = 'Confirmed';
      break;
    case 'CHECKED_IN':
      neuClass = 'neu-badge-primary';
      label = 'Checked In';
      break;
    case 'REQUESTED':
    case 'PENDING':
    case 'DRAFT':
      neuClass = 'neu-badge-warning';
      label = raw === 'REQUESTED' ? 'Requested' : raw === 'DRAFT' ? 'Draft' : 'Pending';
      break;
    case 'COMPLETED':
    case 'ACTIVE':
    case 'PUBLISHED':
    case 'SENT':
    case 'SUCCESS':
      neuClass = 'neu-badge-success';
      label = raw === 'COMPLETED' ? 'Completed' : raw === 'ACTIVE' ? 'Active' : raw === 'PUBLISHED' ? 'Published' : raw === 'SENT' ? 'Sent' : 'Success';
      break;
    case 'CANCELLED':
    case 'FAILED':
    case 'DENIED':
      neuClass = 'neu-badge-danger';
      label = raw === 'CANCELLED' ? 'Cancelled' : raw === 'FAILED' ? 'Failed' : 'Denied';
      break;
    case 'NO_SHOW':
      neuClass = 'neu-badge-danger';
      label = 'No Show';
      break;
    case 'RESCHEDULED':
      neuClass = 'neu-badge-warning';
      label = 'Rescheduled';
      break;
    case 'INACTIVE':
    case 'DEACTIVATED':
      neuClass = 'neu-badge-secondary';
      label = raw === 'DEACTIVATED' ? 'Deactivated' : 'Inactive';
      break;
    case 'ACCEPTED':
      neuClass = 'neu-badge-success';
      label = 'Accepted';
      break;
    case 'EXPIRED':
      neuClass = 'neu-badge-secondary';
      label = 'Expired';
      break;
    case 'REVOKED':
      neuClass = 'neu-badge-danger';
      label = 'Revoked';
      break;
    case 'INVITATION_PENDING':
      neuClass = 'neu-badge-warning';
      label = 'Invite Pending';
      break;
    case 'WARNING':
      neuClass = 'neu-badge-warning';
      label = 'Warning';
      break;
    default:
      neuClass = 'neu-badge-info';
      label = status;
  }


  return (
    <span className={`neu-badge ${neuClass} ${className}`.trim()}>
      <span className="neu-badge-dot" />
      {label}
    </span>
  );
}

export default AdminStatusBadge;
