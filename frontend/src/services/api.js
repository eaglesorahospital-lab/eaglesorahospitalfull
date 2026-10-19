/**
 * Hospital Platform — Core API Client Service Layer
 * Authoritative HTTP transport for communication with Django REST Framework.
 * 
 * Features:
 * - Automatic valid access token attachment via authService
 * - Transparent 401 interception and single-flight token refresh retry
 * - Clean JSON and query parameter serialization
 * - Structured ApiError wrapping for consistent UI consumption
 */

import authService from './authService';

const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);
const DEFAULT_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout > 0
  ? configuredTimeout
  : 60000;

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: DEFAULT_TIMEOUT_MS,
  endpoints: {
    health: '/api/health/',
    auth: {
      login: '/api/auth/login/',
      refresh: '/api/auth/refresh/',
      me: '/api/auth/me/',
      logout: '/api/auth/logout/',
    },
    departments: '/api/departments/',
    doctors: '/api/doctors/',
    schedules: '/api/schedules/',
    appointments: '/api/appointments/',
    administrators: '/api/administrators/',
    notifications: '/api/notifications/',
  },
};

export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isAuthError = status === 401 || status === 403;
  }
}

/**
 * Executes an HTTP request with automatic token management and error handling
 */
export async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    params = null,
    requiresAuth = false,
    skipAuth = false,
    timeout = API_CONFIG.timeout,
    signal: userSignal = null,
  } = options;

  let urlString = endpoint.startsWith('http')
    ? endpoint
    : `${API_CONFIG.baseURL}${endpoint}`;

  if (params) {
    const url = new URL(urlString, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });
    urlString = url.toString();
  }

  const reqHeaders = {
    'Accept': 'application/json',
    ...headers,
  };

  let token = null;
  if (!skipAuth) {
    token = await authService.getValidAccessToken();
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
    } else if (requiresAuth) {
      throw new ApiError('Authentication required: You must be signed in to perform this action.', 401);
    }
  }

  const fetchOptions = {
    method,
    headers: reqHeaders,
  };

  if (body !== null && body !== undefined) {
    if (body instanceof FormData) {
      delete reqHeaders['Content-Type'];
      fetchOptions.body = body;
    } else {
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
  }

  // Setup abort controller with timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('TIMEOUT'));
  }, timeout);

  if (userSignal) {
    userSignal.addEventListener('abort', () => controller.abort(userSignal.reason));
  }
  fetchOptions.signal = controller.signal;

  let response;
  try {
    response = await fetch(urlString, fetchOptions);
  } catch (err) {
    clearTimeout(timeoutId);
    if (controller.signal.aborted) {
      throw new ApiError(
        'The server is taking longer than expected to respond (it may be waking up from sleep). Please wait a moment and try again.',
        408
      );
    }
    throw new ApiError(
      'Unable to connect to the healthcare platform servers. Please verify your internet connection or try again shortly.',
      0
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // If 401 Unauthorized occurs and we didn't explicitly skip auth, attempt a refresh retry once
  if (response.status === 401 && !skipAuth) {
    try {
      const newToken = await authService.refreshToken();
      if (newToken) {
        reqHeaders['Authorization'] = `Bearer ${newToken}`;
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(new Error('TIMEOUT')), timeout);
        fetchOptions.signal = retryController.signal;
        try {
          response = await fetch(urlString, fetchOptions);
        } catch (retryErr) {
          clearTimeout(retryTimeoutId);
          if (retryController.signal.aborted) {
            throw new ApiError('Request timed out during authenticated retry. Please try again.', 408);
          }
          throw retryErr;
        } finally {
          clearTimeout(retryTimeoutId);
        }
      }
    } catch (refreshErr) {
      if (refreshErr instanceof ApiError) throw refreshErr;
      throw new ApiError('Session expired. Please sign in again.', 401, null);
    }
  }

  // Parse body safely
  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (!response.ok) {
    let errMsg = `Request failed: HTTP ${response.status} ${response.statusText}`;
    if (response.status >= 500) {
      errMsg = 'The server encountered an issue or is temporarily unavailable. Please try again shortly.';
    } else if (data && typeof data === 'object') {
      if (data.detail) {
        errMsg = data.detail;
      } else if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
        errMsg = data.non_field_errors.join(' ');
      } else {
        const fieldErrors = Object.entries(data)
          .map(([k, v]) => {
            const fieldName = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            const fieldMsg = Array.isArray(v) ? v.join(' ') : String(v);
            return `${fieldName}: ${fieldMsg}`;
          })
          .join(' | ');
        if (fieldErrors) errMsg = fieldErrors;
      }
    } else if (typeof data === 'string' && data.length > 0 && !data.trim().startsWith('<')) {
      errMsg = data.slice(0, 1000);
    }
    throw new ApiError(errMsg, response.status, data);
  }

  return data;
}

export const apiClient = {
  request,
  get: (url, options = {}) => request(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) => request(url, { ...options, method: 'POST', body }),
  patch: (url, body, options = {}) => request(url, { ...options, method: 'PATCH', body }),
  put: (url, body, options = {}) => request(url, { ...options, method: 'PUT', body }),
  delete: (url, options = {}) => request(url, { ...options, method: 'DELETE' }),
};

export default apiClient;

