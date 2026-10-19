import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import authService from '../services/authService';

/**
 * Hospital Platform — Protected Route Guard
 * Enforces role-based authentication against staff and administration views.
 * Unauthenticated users are redirected to /staff/login.
 */
export function ProtectedRoute({ allowedRoles = ['SUPER_ADMIN', 'HOSPITAL_ADMIN'] }) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(authService.isAuthenticated());
      setCurrentUser(authService.getCurrentUser());
    };
    window.addEventListener('eglesora-session-expired', handleAuthChange);
    window.addEventListener('eglesora-session-updated', handleAuthChange);
    return () => {
      window.removeEventListener('eglesora-session-expired', handleAuthChange);
      window.removeEventListener('eglesora-session-updated', handleAuthChange);
    };
  }, []);

  const isPatientTarget = allowedRoles.length === 1 && allowedRoles[0] === 'PATIENT';
  const loginTarget = isPatientTarget ? '/patient/login' : '/staff/login';

  if (!isAuthenticated || !currentUser) {
    return <Navigate to={`${loginTarget}?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (
    (currentUser?.must_change_password || currentUser?.requires_new_credentials) &&
    location.pathname !== '/staff/set-password' &&
    location.pathname !== '/doctor/set-password'
  ) {
    return <Navigate to="/staff/set-password" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser?.role)) {
    const userPortal =
      currentUser?.role === 'PATIENT'
        ? '/my-appointments'
        : currentUser?.role === 'DOCTOR_STAFF'
        ? '/doctor'
        : ['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(currentUser?.role)
        ? '/admin'
        : '/';

    return (
      <div className="container py-5 text-center" style={{ maxWidth: '600px' }}>
        <div className="card shadow-sm border-danger p-4 rounded-4" style={{ backgroundColor: 'var(--neu-bg, #fff)' }}>
          <h2 className="h4 fw-bold text-danger mb-2">403 — Unauthorized Role Access</h2>
          <p className="text-muted small mb-4">
            Your authenticated account role (<strong>{currentUser?.role || 'Unknown'}</strong>) does not have
            permission to access this departmental workspace.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={async () => {
                await authService.logout();
                window.location.href = loginTarget;
              }}
            >
              Sign Out & Switch Account
            </button>
            <a href={userPortal} className="btn btn-primary btn-sm">
              Return to Your Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;

