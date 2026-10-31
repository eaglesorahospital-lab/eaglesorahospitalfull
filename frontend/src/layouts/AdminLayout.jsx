import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { X, LogOut, ShieldCheck } from 'lucide-react';
import AdminHeader from '../components/admin/AdminHeader';
import AdminSidebar from '../components/admin/AdminSidebar';
import { useAdminSession } from '../hooks/useAdminSession';
import authService from '../services/authService';
import ErrorBoundary from '../components/common/ErrorBoundary';

/**
 * Hospital Platform — Admin Layout Foundation (Glassmorphism Phase 2)
 * Dedicated administration layout with role-aware sidebar, top navigation,
 * responsive mobile navigation drawer, Escape key dismiss, and SimpleJWT session controls.
 */
export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
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

  // Enforce administrative role verification: kick out patients and doctors immediately
  useEffect(() => {
    if (!staffUser || !['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(staffUser.role)) {
      if (staffUser?.role === 'PATIENT') {
        navigate('/my-appointments', { replace: true });
      } else if (staffUser?.role === 'DOCTOR_STAFF') {
        navigate('/doctor', { replace: true });
      } else {
        navigate('/staff/login', { replace: true });
      }
    }
  }, [staffUser, navigate]);

  // Close sidebar drawer on route navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Handle Escape key to dismiss drawer and lock body scroll on mobile
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isSidebarOpen) setIsSidebarOpen(false);
        if (showLogoutModal) setShowLogoutModal(false);
      }
    };

    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSidebarOpen, showLogoutModal]);

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

        {/* Sidebar Overlay on Mobile with Frosted Glass Backdrop */}
        {isSidebarOpen && (
          <div
            className="admin-sidebar-backdrop glass-modal-backdrop d-lg-none"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
            style={{ zIndex: 1035 }}
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
        className="py-2.5 px-4 small d-flex flex-wrap justify-content-between align-items-center"
        style={{ 
          background: 'rgba(10, 27, 46, 0.94)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: 'rgba(255, 255, 255, 0.75)',
          borderTop: '1px solid rgba(255, 255, 255, 0.10)',
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
          className="modal show d-block glass-modal-backdrop"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '440px' }}>
            <div 
              className="modal-content glass-modal p-0" 
              style={{ borderRadius: '24px', overflow: 'hidden' }}
            >
              <div 
                className="modal-header px-4 py-3 border-bottom d-flex justify-content-between align-items-center"
                style={{ background: 'var(--glass-surface-subtle)', borderColor: 'var(--hospital-border-light)' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <LogOut size={18} color="var(--neu-error)" />
                  <h5 className="modal-title fs-6 fw-bold mb-0" style={{ color: 'var(--hospital-primary-navy)' }}>
                    Sign Out of Staff Portal
                  </h5>
                </div>
                <button
                  type="button"
                  className="glass-btn-icon"
                  style={{ width: '44px', height: '44px', minWidth: '44px', minHeight: '44px' }}
                  onClick={() => setShowLogoutModal(false)}
                  aria-label="Close dialog"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="modal-body p-4">
                <p className="mb-3">
                  Are you sure you wish to sign out of the Eagle Sora Hospital staff workspace?
                </p>
                <div 
                  className="p-3 glass-card-sm small text-muted"
                  style={{ borderRadius: '14px', background: 'var(--glass-surface-subtle)' }}
                >
                  Your JWT access session will be terminated and credentials securely cleared from browser memory.
                </div>
              </div>
              <div 
                className="modal-footer px-4 py-3 border-top"
                style={{ background: 'var(--glass-surface-subtle)', borderColor: 'var(--hospital-border-light)' }}
              >
                <button
                  type="button"
                  className="glass-btn glass-btn-secondary"
                  style={{ minHeight: '44px' }}
                  onClick={() => setShowLogoutModal(false)}
                >
                  Stay Signed In
                </button>
                <button
                  type="button"
                  className="glass-btn glass-btn-primary"
                  style={{ minHeight: '44px', background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}
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
