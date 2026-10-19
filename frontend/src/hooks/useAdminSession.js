import { useState, useEffect, useCallback } from 'react';
import { ADMIN_ROLES } from '../data/adminData';
import authService from '../services/authService';

/**
 * Hospital Platform — Secure Admin Session Hook
 * Dynamically resolves authenticated administrative role strictly from
 * the cryptographically verified JWT token payload.
 *
 * Security:
 * - Rejects non-administrative accounts (PATIENT, DOCTOR_STAFF).
 * - Never defaults to SUPER_ADMIN.
 * - Prevents arbitrary client-side role escalation.
 */
export function useAdminSession() {
  const getVerifiedAdminRole = () => {
    const user = authService.getCurrentUser();
    if (user && ['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(user.role)) {
      return user.role;
    }
    return null;
  };

  const [currentRoleId, setCurrentRoleId] = useState(getVerifiedAdminRole);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const syncRole = () => {
      setCurrentRoleId(getVerifiedAdminRole());
    };
    window.addEventListener('eglesora-session-updated', syncRole);
    window.addEventListener('eglesora-session-expired', syncRole);
    return () => {
      window.removeEventListener('eglesora-session-updated', syncRole);
      window.removeEventListener('eglesora-session-expired', syncRole);
    };
  }, []);

  const currentRole = currentRoleId ? ADMIN_ROLES[currentRoleId] : null;

  // setRole is strictly guarded: only authenticated SUPER_ADMIN can view as HOSPITAL_ADMIN
  const setRole = useCallback((roleId) => {
    const user = authService.getCurrentUser();
    if (user?.role === 'SUPER_ADMIN' && ['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(roleId)) {
      setCurrentRoleId(roleId);
    }
  }, []);

  const hasAccessToRoute = useCallback(
    (path) => {
      if (!currentRole || !currentRole.allowedRoutes) return false;
      return currentRole.allowedRoutes.some((route) => {
        if (route === '/admin') {
          return path === '/admin';
        }
        return path.startsWith(route);
      });
    },
    [currentRole]
  );

  return {
    currentRoleId,
    currentRole,
    setRole,
    hasAccessToRoute,
    showLogoutModal,
    setShowLogoutModal,
    availableRoles: ['SUPER_ADMIN', 'HOSPITAL_ADMIN'].map((id) => ADMIN_ROLES[id]),
  };
}

export default useAdminSession;
