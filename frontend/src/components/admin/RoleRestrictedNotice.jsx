import React from 'react';
import Button from '../common/Button';

/**
 * Hospital Platform — Role-Restricted View Notice (Phase 8)
 * Displayed when the simulated role does not have administrative privileges for the requested section.
 * Clearly notes that this is a frontend demonstration state and not backend security enforcement.
 */
export function RoleRestrictedNotice({ currentRole, moduleName, onSwitchRole }) {
  return (
    <div className="hospital-card p-4 p-md-5 my-4 border-warning">
      <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
        <span className="badge bg-warning text-dark fw-bold">Role Access Restricted</span>
        <span className="text-muted small">Frontend RBAC Demonstration</span>
      </div>

      <h2 className="hospital-section-title mb-2">
        Access Restricted for {currentRole?.label || 'Current Role'}
      </h2>
      <p className="hospital-text-body mb-3">
        The active demonstration role <strong>{currentRole?.label}</strong> does not have permissions to access the{' '}
        <strong>{moduleName || 'Administrative'}</strong> module in this simulation.
      </p>

      <div className="p-3 bg-light rounded border mb-4 small text-muted">
        <strong>Role Policy Note:</strong> In production, role-based authorization will be enforced server-side
        using signed JWT claims, Django REST Framework permission classes (e.g., <code>IsAdminUser</code>,{' '}
        <code>IsHospitalStaff</code>), and PostgreSQL database-level constraints. This preview reflects the planned
        role boundary for {currentRole?.label}.
      </div>

      {onSwitchRole && (
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <span className="small text-muted me-2">Switch demonstration role:</span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSwitchRole('SUPER_ADMIN')}
          >
            Switch to Super Administrator
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSwitchRole('HOSPITAL_ADMIN')}
          >
            Switch to Hospital Admin
          </Button>
        </div>
      )}
    </div>
  );
}

export default RoleRestrictedNotice;
