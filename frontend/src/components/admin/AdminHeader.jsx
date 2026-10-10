import React from 'react';
import { Link } from 'react-router-dom';
import { HOSPITAL_METADATA } from '../../data/navigation';
import { ADMIN_ROLES } from '../../data/adminData';

/**
 * Hospital Platform — Admin Header Component (Phase 8)
 * Top administrative navigation bar with simulated role selector,
 * logout demonstration button, and link to public portal.
 */
export function AdminHeader({
  currentRoleId,
  onRoleChange,
  onLogoutClick,
  isSidebarOpen,
  onToggleSidebar,
}) {
  return (
    <header className="hospital-admin-header py-2 px-3 border-bottom d-flex flex-wrap justify-content-between align-items-center">
      <div className="d-flex align-items-center gap-2">
        {/* Mobile Sidebar Toggle Button */}
        <button
          type="button"
          className="btn btn-sm btn-outline-light d-lg-none me-2"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          {isSidebarOpen ? '✕ Menu' : '☰ Menu'}
        </button>

        <Link to="/admin" className="text-white text-decoration-none fw-bold fs-6">
          {HOSPITAL_METADATA.name}
        </Link>
        <span className="badge bg-secondary ms-1">Operations Console</span>
      </div>

      <div className="d-flex align-items-center gap-3 mt-2 mt-sm-0">
        {/* Simulated Role Selector */}
        <div className="d-flex align-items-center gap-2">
          <label htmlFor="admin-role-select" className="small text-white-50 mb-0 d-none d-md-inline">
            Active Role:
          </label>
          <select
            id="admin-role-select"
            className="form-select form-select-sm bg-dark text-white border-secondary"
            value={currentRoleId}
            onChange={(e) => onRoleChange(e.target.value)}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            {Object.values(ADMIN_ROLES).map((role) => (
              <option key={role.id} value={role.id}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Demo Logout Button */}
        <button
          type="button"
          className="btn btn-sm btn-outline-light"
          onClick={onLogoutClick}
          title="Sign out of prototype session"
        >
          Sign Out
        </button>

        {/* Public Portal Link */}
        <Link to="/" className="btn btn-sm btn-outline-info text-nowrap">
          Public Site
        </Link>
      </div>
    </header>
  );
}

export default AdminHeader;
