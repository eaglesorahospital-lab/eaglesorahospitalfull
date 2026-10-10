/**
 * Hospital Platform — Administrator Account Management Service
 * Communicates with Django REST Framework /api/administrators/ endpoints.
 * Strictly restricted to authorized SUPER_ADMIN sessions.
 */

import apiClient from './api';

export const adminService = {
  /**
   * Fetch all administrative accounts (SUPER_ADMIN and HOSPITAL_ADMIN)
   */
  async getAdministrators() {
    const data = await apiClient.get('/api/administrators/', { requiresAuth: true });
    return Array.isArray(data) ? data : (data.results || []);
  },

  /**
   * Create a new Hospital Administrator
   * Payload: { full_name, email, password, password_confirm, phone }
   */
  async createAdministrator(payload) {
    try {
      return await apiClient.post('/api/administrators/', payload, { requiresAuth: true });
    } catch (err) {
      if (err.data && typeof err.data === 'object') {
        err.fieldErrors = err.data;
      }
      throw err;
    }
  },

  /**
   * Toggle is_active status of an administrator
   */
  async toggleAdministratorStatus(id) {
    return await apiClient.post(`/api/administrators/${id}/toggle-status/`, null, { requiresAuth: true });
  },
};

export default adminService;

