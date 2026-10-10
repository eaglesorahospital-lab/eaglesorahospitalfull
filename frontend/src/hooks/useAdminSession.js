import { useState, useEffect, useCallback } from 'react';
import { ADMIN_ROLES } from '../data/adminData';

const SESSION_ROLE_KEY = 'eglesora_admin_role';

/**
 * Hospital Platform — Admin Session Hook (Phase 8)
 * Manages the active demonstration role and simulated administrative permissions.
 * Pure frontend prototype state: no real JWT authentication or backend authorization.
 */
export function useAdminSession() {
  const [currentRoleId, setCurrentRoleId] = useState(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_ROLE_KEY);
      if (stored && ADMIN_ROLES[stored]) {
        return stored;
      }
    } catch (e) {
      // Storage unavailable
    }
    return 'SUPER_ADMIN';
  });

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_ROLE_KEY, currentRoleId);
    } catch (e) {
      // Storage unavailable
    }
  }, [currentRoleId]);

  const currentRole = ADMIN_ROLES[currentRoleId] || ADMIN_ROLES.SUPER_ADMIN;

  const setRole = useCallback((roleId) => {
    if (ADMIN_ROLES[roleId]) {
      setCurrentRoleId(roleId);
    }
  }, []);

  const hasAccessToRoute = useCallback(
    (path) => {
      if (!currentRole.allowedRoutes) return false;
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
    availableRoles: Object.values(ADMIN_ROLES),
  };
}

export default useAdminSession;
