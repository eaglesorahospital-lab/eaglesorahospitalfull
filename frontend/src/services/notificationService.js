/**
 * Hospital Platform — Notification Service
 * Authoritative integration with Django REST Framework / PostgreSQL (/api/notifications/).
 * Retrieves outbound communication logs (SMS, Email, System alerts) for administrative audit.
 */

import apiClient from './api';

export const notificationService = {
  /**
   * Fetch paginated notification logs
   * @param {Object} params - Query parameters (notification_type, channel, status, search, page, page_size)
   */
  async getNotifications(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.pageSize || params.page_size) query.set('page_size', params.pageSize || params.page_size);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.channel && params.channel !== 'ALL') query.set('channel', params.channel);
    if (params.notification_type && params.notification_type !== 'ALL') query.set('notification_type', params.notification_type);
    if (params.search) query.set('search', params.search);

    const queryString = query.toString();
    const endpoint = queryString ? `/api/notifications/?${queryString}` : '/api/notifications/';
    return await apiClient.get(endpoint, { requiresAuth: true });
  },

  /**
   * Fetch single notification detail
   * @param {number|string} id - Notification ID
   */
  async getNotification(id) {
    return await apiClient.get(`/api/notifications/${id}/`, { requiresAuth: true });
  },
};

export default notificationService;

