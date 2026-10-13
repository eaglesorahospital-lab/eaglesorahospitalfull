import React from 'react';

/**
 * Hospital Platform — Admin Metric Stat Card
 * Soft Neumorphic metrics card with optional icon, crisp typography, and soft raised surface.
 */
export function AdminStatCard({ label, value, subtext, badgeText, icon: Icon, iconColor = 'var(--hospital-blue)', className = '' }) {
  return (
    <div className={`admin-stat-card neu-stat-card ${className}`.trim()}>
      <div className="d-flex justify-content-between align-items-start mb-2">
        <span className="admin-stat-label">{label}</span>
        {badgeText && <span className="neu-badge neu-badge-info">{badgeText}</span>}
      </div>
      <div className="d-flex align-items-center justify-content-between mt-1">
        <div className="admin-stat-value">{value}</div>
        {Icon && (
          <div 
            className="neu-stat-icon-wrap" 
            style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'var(--hospital-surface)', 
              boxShadow: 'var(--neu-inset)',
              color: iconColor,
              flexShrink: 0
            }}
          >
            <Icon size={20} />
          </div>
        )}
      </div>
      {subtext && <div className="admin-stat-subtext mt-2">{subtext}</div>}
    </div>
  );
}

export default AdminStatCard;
