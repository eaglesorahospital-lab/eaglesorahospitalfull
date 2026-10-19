import React from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';

/**
 * Hospital Platform — Role-Restricted View Notice (Neumorphic Redesign)
 * Displayed when the simulated role does not have administrative privileges for the requested section.
 */
export function RoleRestrictedNotice({ currentRole, moduleName, onSwitchRole }) {
  return (
    <div 
      className="neu-card p-4 p-md-5 my-4" 
      style={{ borderRadius: '24px', background: 'var(--hospital-surface)' }}
    >
      <div 
        className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom"
        style={{ borderColor: 'var(--hospital-border)' }}
      >
        <div className="d-flex align-items-center gap-2">
          <span className="neu-badge neu-badge-warning">
            <span className="neu-badge-dot" />
            Role Access Restricted
          </span>
        </div>
        <span className="text-muted small">Frontend RBAC Simulation</span>
      </div>

      <div className="d-flex align-items-center gap-3 mb-3">
        <div 
          className="d-flex align-items-center justify-content-center"
          style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '14px', 
            background: 'var(--hospital-surface)', 
            boxShadow: 'var(--neu-inset)', 
            color: '#B7791F',
            flexShrink: 0
          }}
        >
          <ShieldAlert size={24} />
        </div>
        <h2 className="fs-5 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
          Access Restricted for {currentRole?.label || 'Current Role'}
        </h2>
      </div>

      <p className="small text-muted mb-4" style={{ lineHeight: '1.6' }}>
        The active demonstration role <strong>{currentRole?.label}</strong> does not have permissions to access the{' '}
        <strong>{moduleName || 'Administrative'}</strong> module in this simulation.
      </p>

      <div 
        className="p-3 neu-card-sm mb-4 small text-muted"
        style={{ borderRadius: '16px', background: 'var(--hospital-surface)' }}
      >
        <strong>Role Policy Note:</strong> In production, role-based authorization is enforced server-side
        using signed JWT claims, Django REST Framework permission classes (e.g., <code>IsAdminUser</code>,{' '}
        <code>IsHospitalStaff</code>), and PostgreSQL database-level constraints.
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-center pt-2">
        <a
          href="/admin"
          className="neu-btn neu-btn-primary neu-btn-sm text-decoration-none"
        >
          Return to Admin Overview
        </a>
        <a
          href="/"
          className="neu-btn neu-btn-outline neu-btn-sm text-decoration-none"
        >
          Public Portal
        </a>
      </div>
    </div>
  );
}

export default RoleRestrictedNotice;
