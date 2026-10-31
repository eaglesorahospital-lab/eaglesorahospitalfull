/**
 * Hospital Platform — Hospital Profile API Service
 * Authoritative integration with Django REST Framework / PostgreSQL (/api/hospital/).
 * Supports institutional details retrieval, profile updates, and logo management.
 */

import apiClient from './api';

export const hospitalService = {
  /**
   * Fetch current active hospital profile
   */
  async getProfile() {
    return await apiClient.get('/api/hospital/current/');
  },

  /**
   * Update hospital profile details (Hospital Admin or Super Admin)
   * Payload: { name, legal_name, tagline, overview, contact_phone, emergency_phone, contact_email, address, visiting_hours, emergency_info }
   */
  async updateProfile(id, payload) {
    try {
      return await apiClient.patch(`/api/hospital/${id}/`, payload, { requiresAuth: true });
    } catch (err) {
      if (err.data && typeof err.data === 'object') {
        err.fieldErrors = err.data;
      }
      throw err;
    }
  },

  /**
   * Upload hospital emblem/logo
   * @param {File} file - Image file object
   */
  async uploadLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);
    return await apiClient.post('/api/hospital/upload-logo/', formData, { requiresAuth: true });
  },

  /**
   * Delete hospital emblem/logo
   */
  async deleteLogo() {
    return await apiClient.delete('/api/hospital/delete-logo/', { requiresAuth: true });
  },
};

export default hospitalService;

