/**
 * Hospital Platform — Doctor Schedule API Service
 * Authoritative integration with Django REST Framework (/api/schedules/).
 * Persists shift allocations, consultation slot durations, leaves, and overrides into PostgreSQL.
 */

import authService from './authService';
import apiClient from './api';

export const scheduleService = {
  /**
   * Fetch schedules for a specific doctor from PostgreSQL via GET /api/schedules/?doctor=...
   */
  async getDoctorSchedules(doctorIdOrSlug) {
    const params = {
      page_size: '50',
    };

    if (String(doctorIdOrSlug).match(/^\d+$/)) {
      params.doctor = doctorIdOrSlug;
    } else {
      params.doctor__slug = doctorIdOrSlug;
    }

    const data = await apiClient.get('/api/schedules/', { params });
    const rawList = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
    return rawList;
  },

  /**
   * Fetch leaves for a doctor from GET /api/schedules/leaves/?doctor=...
   */
  async getDoctorLeaves(doctorIdOrSlug) {
    const params = {
      page_size: '50',
    };
    if (String(doctorIdOrSlug).match(/^\d+$/)) {
      params.doctor = doctorIdOrSlug;
    } else {
      params.doctor__slug = doctorIdOrSlug;
    }

    try {
      const data = await apiClient.get('/api/schedules/leaves/', { params });
      return Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401 || err.status === 403) return [];
      throw err;
    }
  },

  /**
   * Fetch schedule overrides for a doctor from GET /api/schedules/overrides/?doctor=...
   */
  async getDoctorOverrides(doctorIdOrSlug) {
    const params = {
      page_size: '50',
    };
    if (String(doctorIdOrSlug).match(/^\d+$/)) {
      params.doctor = doctorIdOrSlug;
    } else {
      params.doctor__slug = doctorIdOrSlug;
    }

    try {
      const data = await apiClient.get('/api/schedules/overrides/', { params });
      return Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.status === 401 || err.status === 403) return [];
      throw err;
    }
  },

  /**
   * Save or update a doctor schedule record in PostgreSQL.
   */
  async saveSchedule(scheduleData) {
    const isUpdate = Boolean(scheduleData.id);
    const endpoint = isUpdate
      ? `/api/schedules/${scheduleData.id}/`
      : `/api/schedules/`;
    const method = isUpdate ? 'PATCH' : 'POST';

    const payload = {};
    if (scheduleData.doctor) payload.doctor = scheduleData.doctor;
    if (scheduleData.day_of_week) payload.day_of_week = scheduleData.day_of_week;
    if (scheduleData.start_time) payload.start_time = scheduleData.start_time;
    if (scheduleData.end_time) payload.end_time = scheduleData.end_time;
    if (scheduleData.slot_duration_minutes) payload.slot_duration_minutes = Number(scheduleData.slot_duration_minutes);
    if (scheduleData.capacity) payload.capacity = Number(scheduleData.capacity);
    if (scheduleData.is_working_day !== undefined) payload.is_working_day = Boolean(scheduleData.is_working_day);
    if (scheduleData.is_active !== undefined) payload.is_active = Boolean(scheduleData.is_active);

    return await apiClient.request(endpoint, {
      method,
      body: payload,
      requiresAuth: true,
    });
  },

  /**
   * Create a schedule override record in PostgreSQL.
   */
  async saveOverride(overrideData) {
    const isClosed =
      overrideData.override_type === 'CLOSED' ||
      overrideData.override_type === 'Closed' ||
      overrideData.override_type === 'UNAVAILABLE' ||
      overrideData.is_available === false;

    const payload = {
      doctor: overrideData.doctor,
      override_date: overrideData.override_date,
      override_type: overrideData.override_type || 'SPECIAL_OPD',
      is_available: !isClosed,
      start_time: isClosed ? null : (overrideData.start_time || null),
      end_time: isClosed ? null : (overrideData.end_time || null),
      slot_duration_minutes: Number(overrideData.slot_duration_minutes) || 30,
      capacity: Number(overrideData.capacity) || 1,
      reason: overrideData.reason || 'Clinical schedule override',
    };

    return await apiClient.post('/api/schedules/overrides/', payload, {
      requiresAuth: true,
    });
  },

  /**
   * Fetch doctor availability slots for a specific date from GET /api/schedules/availability/
   */
  async getAvailability(doctorIdOrSlug, dateStr) {
    const params = {
      date: dateStr,
    };
    if (String(doctorIdOrSlug).match(/^\d+$/)) {
      params.doctor = doctorIdOrSlug;
    } else {
      params.doctor__slug = doctorIdOrSlug;
    }

    return await apiClient.get('/api/schedules/availability/', { params, skipAuth: true });
  },

  /**
   * Fetch doctor availability for a date range from GET /api/schedules/availability/
   */
  async getAvailabilityRange(doctorIdOrSlug, startDateStr, endDateStr) {
    const params = {
      start_date: startDateStr,
      end_date: endDateStr,
    };
    if (String(doctorIdOrSlug).match(/^\d+$/)) {
      params.doctor = doctorIdOrSlug;
    } else {
      params.doctor__slug = doctorIdOrSlug;
    }

    return await apiClient.get('/api/schedules/availability/', { params, skipAuth: true });
  },
};

export default scheduleService;

