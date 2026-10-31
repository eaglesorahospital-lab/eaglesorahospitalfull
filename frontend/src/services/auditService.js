/**
 * Hospital Platform — Audit Trail Service
 * Authoritative integration with Django REST Framework / PostgreSQL (/api/audit/).
 * Restricted exclusively to SUPER_ADMIN and HOSPITAL_ADMIN roles.
 */

import apiClient from './api';

export const auditService = {
  /**
   * Fetch paginated audit log entries
   * @param {Object} params - Query parameters (action, resource_type, result, search, page, page_size)
   */
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.pageSize || params.page_size) query.set('page_size', params.pageSize || params.page_size);
    if (params.action && params.action !== 'ALL') query.set('action', params.action);
    if (params.resource_type && params.resource_type !== 'ALL') query.set('resource_type', params.resource_type);
    if (params.result && params.result !== 'ALL') query.set('result', params.result);
    if (params.search) query.set('search', params.search);

    const queryString = query.toString();
    const endpoint = queryString ? `/api/audit/?${queryString}` : '/api/audit/';
    return await apiClient.get(endpoint, { requiresAuth: true });
  },

  /**
   * Fetch single audit entry detail
   * @param {number|string} id - Audit log ID
   */
  async getAuditLog(id) {
    return await apiClient.get(`/api/audit/${id}/`, { requiresAuth: true });
  },
};

export default auditService;

