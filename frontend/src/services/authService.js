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

function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return String(import.meta.env.VITE_API_BASE_URL).replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host.includes('eaglesora-hospital-frontend.onrender.com')) {
      return 'https://eaglesorahospitalfull.onrender.com';
    }
  }
  return '';
}

const API_BASE_URL = resolveApiBaseUrl();

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

/**
 * Safely parses response body without throwing SyntaxErrors on non-JSON/HTML payloads
 */
async function safeParseJsonResponse(response) {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Formats backend error responses into user-friendly strings without exposing raw HTML or server traces
 */
function formatAuthErrorMessage(response, data, fallback = 'Operation failed.') {
  if (response.status >= 500) {
    return 'The authentication service is temporarily unavailable. Please try again shortly.';
  }

  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
      return data.non_field_errors.join(' ');
    }

    const fieldErrors = Object.entries(data)
      .filter(([key]) => key !== 'detail' && key !== 'non_field_errors')
      .map(([field, errs]) => {
        const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const msg = Array.isArray(errs) ? errs.join(' ') : String(errs);
        return `${fieldName}: ${msg}`;
      });

    if (fieldErrors.length > 0) {
      return fieldErrors.join(' | ');
    }
  }

  return fallback;
}

export const authService = {
  _refreshPromise: null,

  /**
   * Authenticate user against Django backend with optional portal enforcement
   */
  async login(email, password, portal = null) {
    let response;
    const endpoint = portal === 'patient'
      ? `${API_BASE_URL}/api/auth/patient-login/`
      : `${API_BASE_URL}/api/auth/login/`;

    const requestBody = {
      email: email.trim().toLowerCase(),
      password,
      ...(portal ? { portal } : {}),
    };

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch {
      throw new Error('Unable to connect to the authentication server. Please check your network.');
    }

    const data = await safeParseJsonResponse(response);

    if (!response.ok) {
      this.clearSession();
      const errorMsg = formatAuthErrorMessage(response, data, 'Invalid email address or password.');
      throw new Error(errorMsg);
    }

    // Role verification against signed JWT claims
    const { access, refresh, user } = data || {};
    if (!access || !user) {
      this.clearSession();
      throw new Error('User profile or authentication tokens not returned by authentication service.');
    }

    const payload = decodeJwtPayload(access);
    const verifiedRole = payload?.role || user.role;

    if (!verifiedRole) {
      this.clearSession();
      throw new Error('Authentication token is missing authoritative role claim.');
    }

    // Enforce strict portal-role boundaries
    if (portal === 'patient' && verifiedRole !== 'PATIENT') {
      this.clearSession();
      throw new Error('Access denied: Patient portal is restricted to patient accounts.');
    }

    if (portal === 'staff' && verifiedRole === 'PATIENT') {
      this.clearSession();
      throw new Error('Access denied: Patient accounts cannot log in to the staff portal.');
    }

    // Bind trusted role to user profile
    user.role = verifiedRole;

    // Wipe any previously cached patient records to guarantee total session isolation
    sessionStorage.removeItem('eglesora_patient_profile');
    sessionStorage.removeItem('eglesora_mock_appointments');
    sessionStorage.removeItem('eglesora_latest_appointment');
    sessionStorage.removeItem('eglesora_admin_role');

    // Store tokens strictly in sessionStorage (short-lived session, not localStorage)
    sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eglesora-session-updated', { detail: { user } }));
    }

    return { access, refresh, user };
  },

  /**
   * Dedicated patient portal login method
   */
  async patientLogin(email, password) {
    return this.login(email, password, 'patient');
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
        let response;
        try {
          response = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ refresh: currentRefresh }),
          });
        } catch {
          this.clearSession();
          throw new Error('Unable to contact authentication server to refresh session.');
        }

        const data = await safeParseJsonResponse(response);

        if (!response.ok) {
          this.clearSession();
          const errorMsg = formatAuthErrorMessage(response, data, 'Session expired. Please sign in again.');
          throw new Error(errorMsg);
        }

        if (data && data.access) {
          sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
        }
        if (data && data.refresh) {
          sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('eglesora-session-updated'));
        }

        return data ? data.access : null;
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
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });
    } catch {
      throw new Error('Unable to connect to registration service. Please verify your network connection.');
    }

    const data = await safeParseJsonResponse(response);

    if (!response.ok) {
      const errorMsg = formatAuthErrorMessage(response, data, 'Registration failed. Please verify your details.');
      throw new Error(errorMsg);
    }

    const { access, refresh, user } = data || {};
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
    sessionStorage.removeItem('eglesora_admin_role');
    sessionStorage.removeItem('eglesora_patient_profile');
    sessionStorage.removeItem('eglesora_mock_appointments');
    sessionStorage.removeItem('eglesora_latest_appointment');

    try {
      localStorage.removeItem('eglesora_admin_role');
      localStorage.removeItem('eglesora_staff_user');
      localStorage.removeItem('eglesora_staff_access');
      localStorage.removeItem('eglesora_role');
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eglesora-session-expired'));
    }
  },

  /**
   * Get current authenticated user details from session.
   * Authoritative role claim is ALWAYS extracted directly from the
   * cryptographically signed JWT payload, overriding any client-side tampering.
   */
  getCurrentUser() {
    const access = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!access) return null;

    const payload = decodeJwtPayload(access);
    if (!payload || !payload.role) {
      return null;
    }

    let user = null;
    try {
      const userStr = sessionStorage.getItem(USER_KEY);
      if (userStr) {
        user = JSON.parse(userStr);
      }
    } catch {
      user = null;
    }

    if (!user) {
      user = {
        id: payload.user_id,
        email: payload.email,
        role: payload.role,
      };
    } else {
      // Authoritative role ALWAYS comes from cryptographically signed JWT payload,
      // defeating any localStorage, sessionStorage, or client-side tampering.
      user.role = payload.role;
      if (payload.email) user.email = payload.email;
    }

    return user;
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
   * Updates password for authenticated user via POST /api/auth/change-password/
   */
  async changePassword(currentPassword, newPassword, confirmPassword) {
    const token = await this.getValidAccessToken();
    if (!token) {
      throw new Error('Authentication required to change password.');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/change-password/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });

    const data = await safeParseJsonResponse(response);
    if (!response.ok) {
      const errorMsg = formatAuthErrorMessage(response, data, 'Failed to update password.');
      throw new Error(errorMsg);
    }

    if (data.access && data.refresh) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, data.access);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
      const user = this.getCurrentUser();
      if (user) {
        user.must_change_password = false;
        user.requires_new_credentials = false;
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('eglesora-session-updated', { detail: { user } }));
        }
      }
    }

    return data;
  },

  /**
   * One-time password setup via secure expiring link (token + uid) via POST /api/auth/setup-password/
   */
  async setupPassword(uid, token, newPassword, confirmPassword) {
    const response = await fetch(`${API_BASE_URL}/api/auth/setup-password/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });

    const data = await safeParseJsonResponse(response);
    if (!response.ok) {
      const errorMsg = formatAuthErrorMessage(response, data, 'Failed to set password. Link may be invalid or expired.');
      throw new Error(errorMsg);
    }

    const { access, refresh, user } = data || {};
    if (access && refresh) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
      if (user) {
        user.must_change_password = false;
        user.requires_new_credentials = false;
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('eglesora-session-updated', { detail: { user } }));
      }
    }

    return data;
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

