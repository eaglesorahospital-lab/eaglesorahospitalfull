import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { X, LogOut, ShieldCheck } from 'lucide-react';
import AdminHeader from '../components/admin/AdminHeader';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAdminSession } from '../hooks/useAdminSession';
import authService from '../services/authService';
import ErrorBoundary from '../components/common/ErrorBoundary';

/**
 * Hospital Platform — Admin Layout Foundation (Neumorphic Redesign)
 * Dedicated administration layout with role-aware sidebar, top navigation,
 * responsive mobile navigation, and SimpleJWT session controls.
 */
export function AdminLayout() {
  const navigate = useNavigate();
  const {
    currentRoleId,
    currentRole,
    setRole,
    hasAccessToRoute,
    showLogoutModal,
    setShowLogoutModal,
  } = useAdminSession();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const staffUser = authService.getCurrentUser();

  // Sync session hook with authenticated staff role if logged in via JWT
  useEffect(() => {
    if (staffUser?.role && staffUser.role !== currentRoleId) {
      setRole(staffUser.role);
    }
  }, [staffUser, currentRoleId, setRole]);

  const handleConfirmedLogout = async () => {
    setShowLogoutModal(false);
    await authService.logout();
    navigate('/staff/login', { replace: true });
  };

  return (
    <div className="hospital-layout-root admin-root-container">
      {/* Admin Top Header */}
      <AdminHeader
        currentRoleId={currentRoleId}
        onRoleChange={setRole}
        onLogoutClick={() => setShowLogoutModal(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main Admin Workspace with Sidebar */}
      <div className="admin-body-wrapper d-flex flex-grow-1">
        {/* Responsive Sidebar */}
        <AdminSidebar
          currentRole={currentRole}
          isSidebarOpen={isSidebarOpen}
          onCloseSidebar={() => setIsSidebarOpen(false)}
        />

        {/* Sidebar Overlay on Mobile */}
        {isSidebarOpen && (
          <div
            className="admin-sidebar-backdrop d-lg-none"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Admin Content Area */}
        <main className="admin-main-content flex-grow-1 p-3 p-md-4">
          <ErrorBoundary>
            <Outlet context={{ currentRoleId, currentRole, setRole, hasAccessToRoute }} />
          </ErrorBoundary>
        </main>
      </div>

      {/* Admin Minimal Footer */}
      <footer 
        className="py-2 px-4 small d-flex flex-wrap justify-content-between align-items-center"
        style={{ 
          background: 'var(--hospital-primary-navy)', 
          color: 'rgba(255, 255, 255, 0.7)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.8rem'
        }}
      >
        <span>Eagle Sora Hospital Platform — Operations Workspace</span>
        <span>
          Session: <strong>{staffUser?.name || staffUser?.email || currentRole?.label}</strong> ({currentRole?.label})
        </span>
      </footer>

      {/* Real Sign Out Modal */}
      {showLogoutModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 27, 43, 0.65)', backdropFilter: 'blur(4px)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div 
              className="modal-content neu-card p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--hospital-border)' }}
            >
              <div 
                className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <LogOut size={18} color="var(--neu-error)" />
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Sign Out of Staff Portal
                  </h5>
                </div>
                <button
                  type="button"
                  className="neu-btn-icon"
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  onClick={() => setShowLogoutModal(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4" style={{ background: 'var(--hospital-bg)' }}>
                <p className="mb-3">
                  Are you sure you wish to sign out of the Eagle Sora Hospital staff workspace?
                </p>
                <div 
                  className="p-3 neu-card-sm small text-muted"
                  style={{ borderRadius: '14px', background: 'var(--hospital-surface)' }}
                >
                  Your JWT access session will be terminated and credentials securely cleared from browser memory.
                </div>
              </div>
              <div 
                className="modal-footer px-4 py-3 border-top"
                style={{ background: 'var(--hospital-surface)', borderColor: 'var(--hospital-border)' }}
              >
                <button
                  type="button"
                  className="neu-btn neu-btn-outline neu-btn-sm"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Stay Signed In
                </button>
                <button
                  type="button"
                  className="neu-btn neu-btn-danger neu-btn-sm"
                  onClick={handleConfirmedLogout}
                >
                  Sign Out Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLayout;
