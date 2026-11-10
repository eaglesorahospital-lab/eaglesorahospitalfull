import React from 'react';
import { NavLink } from 'react-router-dom';
import { ADMIN_NAV_LINKS } from '../../data/navigation';
import authService from '../../services/authService';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  ClipboardList,
  HeartPulse,
  FileText,
  Bell,
  ShieldCheck,
  History,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const ICON_MAP = {
  '/admin': LayoutDashboard,
  '/admin/doctors': Users,
  '/admin/departments': Building2,
  '/admin/schedules': Calendar,
  '/admin/appointments': ClipboardList,
  '/admin/patients': HeartPulse,
  '/admin/content': FileText,
  '/admin/notifications': Bell,
  '/admin/administrators': ShieldCheck,
  '/admin/audit': History,
};

/**
 * Hospital Platform — Admin Sidebar Navigation Component
 * Neumorphic Soft UI sidebar for clinical and administrative modules.
 */
export function AdminSidebar({
  currentRole,
  isSidebarOpen,
  isSidebarCollapsed = false,
  onCloseSidebar,
  onToggleCollapse,
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
      className={`admin-sidebar ${isSidebarOpen ? 'show' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}
      aria-label="Administration Navigation"
    >
      <div className="admin-sidebar-header p-3 border-bottom d-flex justify-content-between align-items-center">
        <div className="admin-sidebar-header-info min-w-0">
          <div className="admin-sidebar-heading text-uppercase small">Active Role</div>
          <div className="fw-bold admin-sidebar-role-text text-truncate" title={currentRole?.label}>
            {currentRole?.label}
          </div>
        </div>
        <button
          type="button"
          className="btn-close d-lg-none"
          onClick={onCloseSidebar}
          aria-label="Close sidebar drawer"
        />
      </div>

      <nav className="admin-sidebar-nav p-2">
        <div className="admin-sidebar-heading small px-3 py-2 text-uppercase fw-bold">
          Operations Modules
        </div>
        {ADMIN_NAV_LINKS.map((link) => {
          const allowed = isAllowed(link.path);
          const IconComp = ICON_MAP[link.path] || FileText;

          return (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/admin'}
              onClick={onCloseSidebar}
              title={link.label}
              aria-label={link.label}
              className={({ isActive }) =>
                `admin-sidebar-link d-flex align-items-center gap-2 px-3 py-2 rounded-3 text-decoration-none my-1 transition-all ${
                  isActive ? 'active' : ''
                } ${!allowed ? 'restricted' : ''}`
              }
            >
              <IconComp size={16} className="admin-sidebar-icon flex-shrink-0" />
              <span className="admin-sidebar-label link-title flex-grow-1">{link.label}</span>
              {!allowed && (
                <span className="admin-sidebar-badge neu-badge neu-badge-neutral ms-auto small d-inline-flex align-items-center gap-1" style={{ fontSize: '0.65rem' }}>
                  <Lock size={10} />
                  Restricted
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Desktop Collapse / Expand Toggle Button */}
      <div className="d-none d-lg-block p-2 border-top mt-auto">
        <button
          type="button"
          className="admin-sidebar-collapse-btn w-100 d-flex align-items-center justify-content-center gap-2 py-2 px-2 rounded-3"
          onClick={onToggleCollapse}
          title={isSidebarCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
          aria-label={isSidebarCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!isSidebarCollapsed && (
            <span className="small fw-semibold admin-sidebar-collapse-text">Collapse Sidebar</span>
          )}
        </button>
      </div>

      <div className="admin-sidebar-footer p-3 border-top small">
        {isLiveSession ? (
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="pulse-dot"></span>
              <span className="fw-bold admin-sidebar-footer-title">Authenticated Session</span>
            </div>
            <div className="admin-sidebar-footer-desc text-truncate" style={{ fontSize: '0.75rem' }}>
              {staffUser?.email || 'Staff Account'} &bull; {currentRole?.label || 'Staff'}
            </div>
          </div>
        ) : (
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="neu-badge neu-badge-warning p-1 rounded-circle" style={{ width: '8px', height: '8px', display: 'inline-block' }}></span>
              <span className="fw-bold admin-sidebar-footer-title">Demo Session</span>
            </div>
            <div className="admin-sidebar-footer-desc" style={{ fontSize: '0.75rem' }}>Local Staff Preview</div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default AdminSidebar;
