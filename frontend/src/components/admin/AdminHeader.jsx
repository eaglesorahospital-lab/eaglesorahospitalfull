import React from 'react';
import { Link } from 'react-router-dom';
import { HOSPITAL_METADATA } from '../../data/navigation';
import { ADMIN_ROLES } from '../../data/adminData';
import ThemeToggle from '../common/ThemeToggle';
import { Activity, LogOut, ExternalLink, Menu, X, ShieldCheck } from 'lucide-react';

/**
 * Hospital Platform — Admin Header Component
 * Top administrative navigation bar with verified role indicator, ThemeToggle,
 * accessible logout button, and link to public portal.
 */
export function AdminHeader({
  currentRoleId,
  onRoleChange,
  onLogoutClick,
  isSidebarOpen,
  onToggleSidebar,
}) {
  return (
    <header className="hospital-admin-header py-2.5 px-3 px-md-4 border-bottom">
      <div className="admin-header-inner">
        {/* Brand & Mobile Sidebar Toggle */}
        <div className="admin-header-brand">
          <button
            type="button"
            className="admin-header-btn admin-header-btn-icon d-lg-none"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            title={isSidebarOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
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

        {/* Administrative Action Controls */}
        <div className="admin-header-controls">
          {/* Theme Toggle */}
          <ThemeToggle compact />

          {/* Verified Role Indicator (Read-Only) */}
          <div className="admin-header-role d-flex align-items-center">
            <span
              className="badge d-inline-flex align-items-center gap-1 px-2.5 py-1.5 rounded-pill"
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
              title="Authenticated Administrative Role"
            >
              <ShieldCheck size={13} className="text-primary flex-shrink-0" />
              <span>{ADMIN_ROLES[currentRoleId]?.label || 'Hospital Administrator'}</span>
            </span>
          </div>

          {/* Accessible High-Contrast Sign Out Button */}
          <button
            type="button"
            className="admin-header-btn admin-header-btn-logout"
            onClick={onLogoutClick}
            title="Sign out of staff session"
            aria-label="Sign Out"
          >
            <LogOut size={14} className="flex-shrink-0" />
            <span>Sign Out</span>
          </button>

          {/* Public Portal Gateway */}
          <Link 
            to="/" 
            className="admin-header-btn admin-header-btn-public"
            title="Navigate to public patient portal"
            aria-label="Public Site"
          >
            <ExternalLink size={14} className="flex-shrink-0" />
            <span>Public Site</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
