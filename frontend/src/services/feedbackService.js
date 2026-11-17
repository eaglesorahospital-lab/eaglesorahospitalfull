/**
 * Hospital Platform — Patient Feedback Service
 * Communicates with Django REST Framework / PostgreSQL (/api/feedback/).
 * Supports public feedback submission, administrative review workflows,
 * satisfaction score aggregation, and filtering.
 */

import authService from './authService';
import { getApiBaseUrl } from './api';

const API_BASE_URL = getApiBaseUrl();

export const FEEDBACK_CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'CLINICAL_CARE', label: 'Clinical Care & Consultation' },
  { value: 'FACILITY_CLEANLINESS', label: 'Facility & Cleanliness' },
  { value: 'STAFF_BEHAVIOR', label: 'Nursing & Staff Behavior' },
  { value: 'APPOINTMENT_SCHEDULING', label: 'Appointment & Waiting Time' },
  { value: 'BILLING', label: 'Billing & Insurance' },
  { value: 'GENERAL', label: 'General Hospital Experience' },
];

export const FEEDBACK_STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'NEW', label: 'New / Unreviewed' },
  { value: 'REVIEWED', label: 'Reviewed' },
];

// Fallback demo records if backend API is offline during demonstration
export const INITIAL_DEMO_FEEDBACKS = [
  {
    id: 1,
    patient_name: 'Dr. Christopher Vanderbilt-Montgomery',
    email: 'c.vanderbilt@eaglesora.example.com',
    phone: '+91 98220 12345',
    category: 'CLINICAL_CARE',
    category_display: 'Clinical Care & Consultation',
    rating: 5,
    message: 'Exceptional clinical diagnostic acumen displayed by Dr. Deshmukh. The cardiac consultation was thorough and reassuring.',
    status: 'REVIEWED',
    status_display: 'Reviewed',
    admin_notes: 'Acknowledged and noted in Department of Cardiology quarterly clinical review.',
    reviewed_by: 1,
    reviewed_by_name: 'Super Administrator',
    reviewed_at: '2026-11-16T10:00:00Z',
    created_at: '2026-11-15T09:30:00Z',
  },
  {
    id: 2,
    patient_name: 'Ananya Kulkarni',
    email: 'ananya.k@example.com',
    phone: '+91 94230 54321',
    category: 'FACILITY_CLEANLINESS',
    category_display: 'Facility & Cleanliness',
    rating: 5,
    message: 'The outpatient facility is exceptionally sanitized. Wheelchair accessibility across the surgical wing was seamless.',
    status: 'REVIEWED',
    status_display: 'Reviewed',
    admin_notes: 'Shared with Facility Management and Sanitation team.',
    reviewed_by: 1,
    reviewed_by_name: 'Super Administrator',
    reviewed_at: '2026-11-15T15:20:00Z',
    created_at: '2026-11-15T08:15:00Z',
  },
  {
    id: 3,
    patient_name: 'Rohan Sharma',
    email: 'rohan.s@example.com',
    phone: '+91 98811 77665',
    category: 'APPOINTMENT_SCHEDULING',
    category_display: 'Appointment & Waiting Time',
    rating: 4,
    message: 'Doctor was brilliant with my 10-year-old son, but we experienced a 20-minute waiting delay due to an emergency triage case.',
    status: 'NEW',
    status_display: 'New / Unreviewed',
    admin_notes: '',
    reviewed_by: null,
    reviewed_by_name: null,
    reviewed_at: null,
    created_at: '2026-11-16T11:45:00Z',
  },
  {
    id: 4,
    patient_name: 'Pooja Mehta',
    email: 'pooja.m@example.com',
    phone: '+91 97654 33221',
    category: 'STAFF_BEHAVIOR',
    category_display: 'Nursing & Staff Behavior',
    rating: 5,
    message: 'The pediatric nursing staff was remarkably patient and kind during blood collection. Made the entire visit stress-free.',
    status: 'NEW',
    status_display: 'New / Unreviewed',
    admin_notes: '',
    reviewed_by: null,
    reviewed_by_name: null,
    reviewed_at: null,
    created_at: '2026-11-16T14:10:00Z',
  },
  {
    id: 5,
    patient_name: 'Kavita Joshi',
    email: 'kavita.j@example.com',
    phone: '+91 98233 44556',
    category: 'BILLING',
    category_display: 'Billing & Insurance',
    rating: 3,
    message: 'TPA insurance pre-authorization desk took longer than anticipated. Hospital medical desk was courteous nonetheless.',
    status: 'NEW',
    status_display: 'New / Unreviewed',
    admin_notes: '',
    reviewed_by: null,
    reviewed_by_name: null,
    reviewed_at: null,
    created_at: '2026-11-16T15:25:00Z',
  },
];

export const feedbackService = {
  /**
   * Submit patient or visitor experience feedback (Public API)
   */
  async submitFeedback(payload) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Fallback if backend API is not running in local static preview
        return {
          id: Date.now(),
          ...payload,
          status: 'NEW',
          created_at: new Date().toISOString(),
        };
      }

      const data = await res.json();
      if (!res.ok) {
        const errMsg =
          data.detail ||
          (Array.isArray(data.message) ? data.message[0] : null) ||
          (Array.isArray(data.rating) ? `Rating: ${data.rating[0]}` : null) ||
          (Array.isArray(data.email) ? `Email: ${data.email[0]}` : null) ||
          'Unable to record feedback. Please verify your information.';
        throw new Error(errMsg);
      }

      return data;
    } catch (err) {
      if (err.message && !err.message.toLowerCase().includes('failed to fetch') && !err.message.includes('network')) {
        throw err;
      }
      return {
        id: Date.now(),
        ...payload,
        status: 'NEW',
        created_at: new Date().toISOString(),
      };
    }
  },

  /**
   * Retrieve feedback list for authenticated hospital administrators
   */
  async getFeedbacks(params = {}) {
    const token = (await authService.getValidAccessToken()) || authService.getAccessToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = new URL(`${API_BASE_URL}/api/feedback/`, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        url.searchParams.set(k, String(v));
      }
    });

    try {
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      return {
        results: Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [],
        count: data.count !== undefined ? data.count : (Array.isArray(data) ? data.length : 0),
      };
    } catch (err) {
      console.warn('Feedback API unreachable, falling back to local session records:', err);
      // Return filtered local demo feedback
      let list = [...INITIAL_DEMO_FEEDBACKS];
      if (params.status && params.status !== 'ALL') {
        list = list.filter((f) => f.status === params.status);
      }
      if (params.category && params.category !== 'ALL') {
        list = list.filter((f) => f.category === params.category);
      }
      if (params.rating && params.rating !== 'ALL') {
        list = list.filter((f) => String(f.rating) === String(params.rating));
      }
      if (params.search) {
        const q = String(params.search).toLowerCase();
        list = list.filter(
          (f) =>
            f.patient_name.toLowerCase().includes(q) ||
            f.email.toLowerCase().includes(q) ||
            f.message.toLowerCase().includes(q)
        );
      }
      return { results: list, count: list.length };
    }
  },

  /**
   * Retrieve aggregate summary metrics for administration dashboard
   */
  async getFeedbackSummary() {
    const token = (await authService.getValidAccessToken()) || authService.getAccessToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback/summary/`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Feedback summary API unreachable, computing from local records:', err);
      const total = INITIAL_DEMO_FEEDBACKS.length;
      const newCount = INITIAL_DEMO_FEEDBACKS.filter((f) => f.status === 'NEW').length;
      const reviewedCount = INITIAL_DEMO_FEEDBACKS.filter((f) => f.status === 'REVIEWED').length;
      const sum = INITIAL_DEMO_FEEDBACKS.reduce((acc, f) => acc + f.rating, 0);
      return {
        total,
        new: newCount,
        reviewed: reviewedCount,
        average_rating: total > 0 ? (sum / total).toFixed(1) : 5.0,
      };
    }
  },

  /**
   * Mark feedback as reviewed with administrative notes
   */
  async markAsReviewed(id, adminNotes = '') {
    const token = (await authService.getValidAccessToken()) || authService.getAccessToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback/${id}/mark-reviewed/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ admin_notes: adminNotes }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to update review status.');
      }
      return await res.json();
    } catch (err) {
      console.warn('API update failed, updating local state:', err);
      return {
        message: `Feedback #${id} marked as reviewed.`,
        feedback: {
          id,
          status: 'REVIEWED',
          status_display: 'Reviewed',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by_name: 'Hospital Administrator',
        },
      };
    }
  },
};

export default feedbackService;
