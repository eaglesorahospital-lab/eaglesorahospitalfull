import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminHeader from '../components/admin/AdminHeader';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAdminSession } from '../hooks/useAdminSession';
import authService from '../services/authService';

/**
 * Hospital Platform — Admin Layout Foundation
 * Dedicated administration layout with role-aware sidebar, top navigation,
 * responsive mobile navigation, and real SimpleJWT session controls.
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
          <Outlet context={{ currentRoleId, currentRole, setRole, hasAccessToRoute }} />
        </main>
      </div>

      {/* Admin Minimal Footer */}
      <footer className="py-2 px-3 bg-dark text-white-50 border-top border-secondary small d-flex flex-wrap justify-content-between align-items-center">
        <span>Eagle Sora Hospital Platform — Operations Workspace</span>
        <span>
          Authenticated as: <strong>{staffUser?.name || staffUser?.email || currentRole.label}</strong> ({currentRole.label})
        </span>
      </footer>

      {/* Real Sign Out Modal */}
      {showLogoutModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fs-6 fw-bold">Sign Out of Staff Portal</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowLogoutModal(false)}
                  aria-label="Close"
                />
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Are you sure you wish to sign out of the Eagle Sora Hospital staff workspace?
                </p>
                <div className="p-3 bg-light rounded border small text-muted">
                  Your JWT access session will be terminated and your refresh token revoked on the server.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Stay Signed In
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
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
