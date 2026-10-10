import React from 'react';

/**
 * Hospital Platform — Admin Metric Stat Card (Phase 8)
 * Clean, restrained clinical metrics card. Strictly NO harsh gradients or excessive shadows.
 */
export function AdminStatCard({ label, value, subtext, badgeText, className = '' }) {
  return (
    <div className={`admin-stat-card ${className}`.trim()}>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <span className="admin-stat-label">{label}</span>
        {badgeText && <span className="hospital-badge hospital-badge-scheduled">{badgeText}</span>}
      </div>
      <div className="admin-stat-value">{value}</div>
      {subtext && <div className="admin-stat-subtext">{subtext}</div>}
    </div>
  );
}

export default AdminStatCard;
