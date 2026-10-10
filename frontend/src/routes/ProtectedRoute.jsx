import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import authService from '../services/authService';

/**
 * Hospital Platform — Protected Route Guard
 * Enforces role-based authentication against staff and administration views.
 * Unauthenticated users are redirected to /staff/login.
 */
export function ProtectedRoute({ allowedRoles = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR_STAFF'] }) {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(() => authService.isAuthenticated());

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(authService.isAuthenticated());
    };
    window.addEventListener('eglesora-session-expired', handleAuthChange);
    window.addEventListener('eglesora-session-updated', handleAuthChange);
    return () => {
      window.removeEventListener('eglesora-session-expired', handleAuthChange);
      window.removeEventListener('eglesora-session-updated', handleAuthChange);
    };
  }, []);

  const currentUser = authService.getCurrentUser();

  if (!isAuthenticated) {
    return <Navigate to={`/staff/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser?.role)) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: '600px' }}>
        <div className="card shadow-sm border-danger p-4">
          <h2 className="h4 fw-bold text-danger mb-2">403 — Unauthorized Role Access</h2>
          <p className="text-muted small mb-4">
            Your authenticated staff role (<strong>{currentUser?.role || 'Unknown'}</strong>) does not have
            permission to access this departmental workspace.
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={async () => {
                await authService.logout();
                window.location.href = '/staff/login';
              }}
            >
              Sign Out & Switch Account
            </button>
            <a href="/" className="btn btn-primary btn-sm">
              Return to Public Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;

