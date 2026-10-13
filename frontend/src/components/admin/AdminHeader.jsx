import React from 'react';
import { Link } from 'react-router-dom';
import { HOSPITAL_METADATA } from '../../data/navigation';
import { ADMIN_ROLES } from '../../data/adminData';
import ThemeToggle from '../common/ThemeToggle';
import { Activity, ShieldCheck, LogOut, ExternalLink, Menu, X, User } from 'lucide-react';

/**
 * Hospital Platform — Admin Header Component
 * Top administrative navigation bar with role selector, ThemeToggle,
 * logout button, and link to public portal.
 */
export function AdminHeader({
  currentRoleId,
  onRoleChange,
  onLogoutClick,
  isSidebarOpen,
  onToggleSidebar,
}) {
  return (
    <header className="hospital-admin-header py-2.5 px-3 px-md-4 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
      <div className="d-flex align-items-center gap-2.5">
        {/* Mobile Sidebar Toggle Button */}
        <button
          type="button"
          className="neu-btn neu-btn-outline neu-btn-sm d-lg-none me-1 p-1.5 d-flex align-items-center justify-content-center text-white"
          style={{ borderColor: 'rgba(255, 255, 255, 0.2)', width: '34px', height: '34px' }}
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link to="/admin" className="text-white text-decoration-none fw-bold fs-6 d-flex align-items-center gap-2">
          <div className="rounded-circle bg-primary p-1 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '28px', height: '28px' }}>
            <Activity size={16} className="text-white" />
          </div>
          <span className="text-nowrap">{HOSPITAL_METADATA.name}</span>
        </Link>
        <span className="neu-badge neu-badge-neutral ms-1 small d-none d-sm-inline" style={{ fontSize: '0.72rem' }}>
          Operations Console
        </span>
      </div>

      <div className="d-flex align-items-center gap-2.5 mt-2 mt-sm-0">
        {/* Theme Toggle */}
        <ThemeToggle compact />

        {/* Role Selector */}
        <div className="d-flex align-items-center gap-1.5">
          <label htmlFor="admin-role-select" className="small text-white-50 mb-0 d-none d-md-inline fw-semibold me-1">
            Role:
          </label>
          <select
            id="admin-role-select"
            className="neu-select py-1 px-3"
            value={currentRoleId}
            onChange={(e) => onRoleChange(e.target.value)}
            style={{ 
              width: 'auto', 
              minWidth: '150px', 
              minHeight: '36px', 
              fontSize: '0.825rem',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }}
          >
            {Object.values(ADMIN_ROLES).map((role) => (
              <option key={role.id} value={role.id} style={{ background: '#16365C', color: '#ffffff' }}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        {/* Logout Button */}
        <button
          type="button"
          className="neu-btn neu-btn-outline neu-btn-sm d-inline-flex align-items-center gap-1.5 text-white"
          style={{ borderColor: 'rgba(255, 255, 255, 0.2)', minHeight: '36px' }}
          onClick={onLogoutClick}
          title="Sign out of staff session"
        >
          <LogOut size={13} />
          <span className="d-none d-sm-inline">Sign Out</span>
        </button>

        {/* Public Site Link */}
        <Link 
          to="/" 
          className="neu-btn neu-btn-outline neu-btn-sm text-nowrap d-inline-flex align-items-center gap-1.5 text-white"
          style={{ borderColor: 'rgba(255, 255, 255, 0.2)', minHeight: '36px' }}
        >
          <ExternalLink size={13} />
          <span className="d-none d-sm-inline">Public Site</span>
        </Link>
      </div>
    </header>
  );
}

export default AdminHeader;
