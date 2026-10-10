/**
 * Hospital Platform — Staff Authentication Service
 * Communicates with Django REST Framework / SimpleJWT endpoints:
 * - POST /api/auth/login/
 * - POST /api/auth/refresh/
 * - POST /api/auth/logout/
 * - GET /api/auth/me/
 *
 * Security:
 * - Stores session tokens only in sessionStorage (destroyed on tab close)
 * - Never stores plaintext passwords
 * - Validates role claims against backend user model
 * - Automatically verifies JWT expiration and refreshes expired access tokens
 */

const ACCESS_TOKEN_KEY = 'eglesora_staff_access';
const REFRESH_TOKEN_KEY = 'eglesora_staff_refresh';
const USER_KEY = 'eglesora_staff_user';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Safely decodes base64 JWT payload without external dependencies
 */
function decodeJwtPayload(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Checks whether a JWT token is expired, with an optional safety margin in seconds
 */
export function isTokenExpired(token, bufferSeconds = 15) {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 < Date.now() + bufferSeconds * 1000;
}

export const authService = {
  _refreshPromise: null,

  /**
   * Authenticate staff user against Django backend
   */
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.detail || data.non_field_errors?.[0] || 'Invalid credentials.';
      throw new Error(errorMsg);
    }

    // Role verification
    const { access, refresh, user } = data;
    if (!user || !user.role) {
      throw new Error('User profile or role not returned by authentication service.');
    }

    // Wipe any previously cached patient records to guarantee total session isolation
    sessionStorage.removeItem('eglesora_patient_profile');
    sessionStorage.removeItem('eglesora_mock_appointments');
    sessionStorage.removeItem('eglesora_latest_appointment');

    // Store tokens in sessionStorage (short-lived session, not localStorage)
    sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eglesora-session-updated', { detail: { user } }));
    }

    return { access, refresh, user };
  },

  /**
   * Safely exchanges a valid refresh token for a new access token via /api/auth/refresh/
   * Guarantees single inflight request across concurrent callers.
   */
  async refreshToken() {
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      const currentRefresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);
      if (!currentRefresh || isTokenExpired(currentRefresh, 0)) {
        this.clearSession();
        throw new Error('Session expired: Please sign in again.');
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh: currentRefresh }),
        });

        const data = await response.json();

        if (!response.ok) {
          this.clearSession();
          const errorMsg = data.detail || 'Session expired. Please sign in again.';
          throw new Error(errorMsg);
        }

        if (data.access) {
          sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
        }
        if (data.refresh) {
          sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('eglesora-session-updated'));
        }

        return data.access;
      } catch (err) {
        this.clearSession();
        throw err;
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  },

  /**
   * Log out staff user and blacklist refresh token on backend
   */
  async logout() {
    const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

    try {
      if (refreshToken && accessToken) {
        await fetch(`${API_BASE_URL}/api/auth/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }
    } catch (e) {
      // Backend logout attempt logged; continue clearing client session
      console.warn('Backend logout notification failed, clearing local session.', e);
    } finally {
      this.clearSession();
    }
  },

  /**
   * Register a new outpatient account via POST /api/auth/register/
   */
  async register(registrationData) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    const data = await response.json();

    if (!response.ok) {
      let errorMsg = data.detail || 'Registration failed.';
      if (data.email) errorMsg = Array.isArray(data.email) ? data.email.join(' ') : data.email;
      else if (data.password) errorMsg = Array.isArray(data.password) ? data.password.join(' ') : data.password;
      else if (data.password_confirm) errorMsg = Array.isArray(data.password_confirm) ? data.password_confirm.join(' ') : data.password_confirm;
      else if (data.non_field_errors) errorMsg = data.non_field_errors.join(' ');
      throw new Error(errorMsg);
    }

    const { access, refresh, user } = data;
    if (access && refresh) {
      // Wipe any prior cached patient records
      sessionStorage.removeItem('eglesora_patient_profile');
      sessionStorage.removeItem('eglesora_mock_appointments');
      sessionStorage.removeItem('eglesora_latest_appointment');

      sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('eglesora-session-updated', { detail: { user } }));
      }
    }

    return { access, refresh, user };
  },

  /**
   * Clear all session data from client storage and emit event
   */
  clearSession() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem('eglesora_patient_profile');
    sessionStorage.removeItem('eglesora_mock_appointments');
    sessionStorage.removeItem('eglesora_latest_appointment');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eglesora-session-expired'));
    }
  },

  /**
   * Get current authenticated user details from session
   */
  getCurrentUser() {
    try {
      const userStr = sessionStorage.getItem(USER_KEY);
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      // JSON parse error
    }
    return null;
  },

  /**
   * Check if an active, usable staff session exists
   */
  isAuthenticated() {
    const access = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const refresh = sessionStorage.getItem(REFRESH_TOKEN_KEY);

    if (access && !isTokenExpired(access, 0)) {
      return true;
    }
    // If access token is expired, but refresh token is still valid, session remains active
    if (refresh && !isTokenExpired(refresh, 0)) {
      return true;
    }

    return false;
  },

  /**
   * Get raw access token for authorized API requests
   */
  getAccessToken() {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * Get raw refresh token
   */
  getRefreshToken() {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Resolves a guaranteed unexpired access token. Automatically triggers refresh if expired.
   */
  async getValidAccessToken() {
    const access = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!access) return null;

    if (!isTokenExpired(access, 15)) {
      return access;
    }

    try {
      return await this.refreshToken();
    } catch {
      return null;
    }
  },

  /**
   * Verify if current user possesses one of the authorized roles
   */
  hasRole(allowedRoles = []) {
    const user = this.getCurrentUser();
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  },
};

export default authService;

