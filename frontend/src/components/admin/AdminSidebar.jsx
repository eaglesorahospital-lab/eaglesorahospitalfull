import React from 'react';
import { NavLink } from 'react-router-dom';
import { ADMIN_NAV_LINKS } from '../../data/navigation';
import authService from '../../services/authService';

/**
 * Hospital Platform — Admin Sidebar Navigation Component
 * Clean, structured sidebar for clinical and administrative modules.
 * Demonstrates role-aware access indicators and real database connection status.
 */
export function AdminSidebar({
  currentRole,
  isSidebarOpen,
  onCloseSidebar,
}) {
  const isAllowed = (path) => {
    if (!currentRole?.allowedRoutes) return false;
    return currentRole.allowedRoutes.some((route) => {
      if (route === '/admin') return path === '/admin';
      return path.startsWith(route);
    });
  };

  const isLiveSession = authService.isAuthenticated();
  const staffUser = authService.getCurrentUser();

  return (
    <aside
      className={`admin-sidebar ${isSidebarOpen ? 'show' : ''}`}
      aria-label="Administration Navigation"
    >
      <div className="admin-sidebar-header p-3 border-bottom d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-bold small text-uppercase text-muted">Active Role</div>
          <div className="fw-semibold text-primary">{currentRole?.label}</div>
        </div>
        <button
          type="button"
          className="btn-close d-lg-none"
          onClick={onCloseSidebar}
          aria-label="Close sidebar"
        />
      </div>

      <nav className="admin-sidebar-nav p-2">
        <div className="text-muted small px-3 py-2 text-uppercase fw-bold letter-spacing-1">
          Operations
        </div>
        {ADMIN_NAV_LINKS.map((link) => {
          const allowed = isAllowed(link.path);
          return (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/admin'}
              onClick={onCloseSidebar}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? 'active' : ''} ${!allowed ? 'restricted' : ''}`
              }
            >
              <span className="link-title">{link.label}</span>
              {!allowed && (
                <span className="badge bg-secondary ms-auto small" style={{ fontSize: '0.65rem' }}>
                  Restricted
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer p-3 mt-auto border-top text-muted small">
        {isLiveSession ? (
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-success p-1 rounded-circle" style={{ width: '8px', height: '8px', display: 'inline-block' }}></span>
              <span className="fw-bold text-dark">Live Database Mode</span>
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
              DRF &amp; PostgreSQL &bull; {staffUser?.email || 'Authenticated'}
            </div>
          </div>
        ) : (
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-warning p-1 rounded-circle" style={{ width: '8px', height: '8px', display: 'inline-block' }}></span>
              <span className="fw-bold text-dark">Prototype Demo Mode</span>
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Local Mock State Only</div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default AdminSidebar;

